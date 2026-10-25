import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import { accounts, transactions, recurringExpenses, balanceAdjustments } from "@/db/schema";
import { readSettings, saveSettings } from "@/db/mutations/settings";
import { insertTransaction, updateBalance } from "@/db/mutations/financial-operations";
import { insertRecurrence, processRecurrences, dueAccounts } from "@/db/mutations/recurrence-operations";
import { readDashboard } from "@/db/queries/overview";
import { readHistory } from "@/db/queries/activity";
import { formatDay, formatMoney, localToday } from "@/lib/financial";
import { currencies } from "@/lib/preferences";
import { settingsSchema } from "@schemas/settings/account-settings";
import { formatMoneyInput, moneyFromInput } from "@/lib/money-input";

test("moedas preservam precisão; datas civis incluem semana e ano e hoje respeita o fuso", () => {
  for (const currency of currencies) {
    assert.match(formatMoney("9999999999999.99", currency, "en-US"), /9,999,999,999,999\.99/);
    assert.match(formatMoney("-1234.56", currency), /1\.234,56/);
  }
  assert.equal(formatMoneyInput("1234.56", "en-US"), "1,234.56");
  assert.equal(moneyFromInput("USD 1,234.56"), "1234.56");
  assert.equal(moneyFromInput("CAD 1,234.56"), "1234.56");
  assert.match(formatDay("2026-10-25"), /domingo/);
  assert.match(formatDay("2026-10-25"), /2026/);
  assert.doesNotMatch(formatDay("2026-10-25"), /\d:\d/);
  const instant = new Date("2026-01-01T01:30:00Z");
  assert.equal(localToday(instant, "America/Los_Angeles"), "2025-12-31");
  assert.equal(localToday(instant, "Pacific/Kiritimati"), "2026-01-01");
  assert.equal(localToday(new Date("2026-03-08T09:59:00Z"), "America/Los_Angeles"), "2026-03-08");
  assert.equal(localToday(new Date("2026-03-08T10:01:00Z"), "America/Los_Angeles"), "2026-03-08");
  const base = { requestId: randomUUID(), expectedSettingsVersion: 0, currency: "USD", locale: "en-US", timeZone: "America/New_York" };
  assert.ok(settingsSchema.safeParse(base).success);
  assert.equal(settingsSchema.safeParse({ ...base, currency: "JPY" }).success, false);
  assert.equal(settingsSchema.safeParse({ ...base, timeZone: "Invalid/Zone" }).success, false);
});

test("configuração obrigatória, migração legada, troca atômica e idempotência", async t => {
  const pg = new PGlite();
  const db = drizzle({ client: pg });
  const user = randomUUID(), other = randomUUID(), wallet = randomUUID();
  const migrationDirs = (await readdir("drizzle")).sort();
  const latest = migrationDirs.find(dir => dir.endsWith("account-preferences"))!;
  try {
    for (const dir of migrationDirs.filter(dir => dir !== latest)) await pg.exec(await readFile(`drizzle/${dir}/migration.sql`, "utf8"));
    await pg.query("insert into users(id,provider_id) values($1,'settings_a'),($2,'settings_b')", [user, other]);
    await pg.query("insert into accounts(id,user_id,balance) values($1,$2,100)", [wallet, user]);
    await pg.query("insert into transactions(account_id,user_id,request_id,type,amount,description,occurred_on) values($1,$2,$3,'income',100,'Legado','2026-10-01')", [wallet, user, randomUUID()]);
    await pg.exec(await readFile(`drizzle/${latest}/migration.sql`, "utf8"));
    const account = async () => (await db.select().from(accounts).where(eq(accounts.id, wallet)))[0];
    const setting = (patch = {}) => ({ requestId: randomUUID(), expectedSettingsVersion: 0, currency: "BRL" as const, timeZone: "America/Sao_Paulo", locale: "pt-BR" as const, confirmReset: false, ...patch });
    const entry = (version: number) => ({ requestId: randomUUID(), expectedSettingsVersion: version, amount: "25.00", type: "income" as const, category: "other" as const, description: "Novo lançamento", occurredOn: "2026-01-01" });

    await t.test("padrão BRL antigo exige confirmação e bloqueia leituras, escritas e cron", async () => {
      assert.equal((await readSettings(db, user)).configured, false);
      assert.equal((await account()).currency, "BRL");
      await assert.rejects(insertTransaction(db, await account(), entry(0)), /Configure sua moeda/);
      await assert.rejects(updateBalance(db, await account(), { requestId: randomUUID(), balance: "20.00", reason: "Tentativa", expectedVersion: 0 }), /Configure sua moeda/);
      await assert.rejects(readDashboard(db, wallet, user, "2026-10"), /Configure sua moeda/);
      await assert.rejects(readHistory(db, wallet, user, { month: "2026-10", page: 1, query: "", type: "all", category: "all" }), /Configure sua moeda/);
      assert.equal(await processRecurrences(db, wallet, user, new Date()), 0);
      const confirmed = await saveSettings(db, user, setting());
      assert.equal(confirmed.settingsVersion, 1);
      assert.equal((await account()).balance, "100.00");
      assert.equal((await db.select().from(transactions).where(eq(transactions.accountId, wallet))).length, 1);
    });

    await t.test("moeda nova requer consentimento e mesma moeda preserva tudo", async () => {
      await assert.rejects(saveSettings(db, user, setting({ expectedSettingsVersion: 1, currency: "USD" })), /Confirme/);
      assert.equal((await account()).balance, "100.00");
      await saveSettings(db, user, setting({ expectedSettingsVersion: 1 }));
      assert.equal((await account()).settingsVersion, 1);
      await assert.rejects(insertTransaction(db, await account(), entry(0)), /configurações mudaram/);
      const otherPreferences = await readSettings(db, other);
      assert.equal(otherPreferences.currency, null);
      await saveSettings(db, other, setting({ currency: "USD" }));
      const [otherAccount] = await db.select().from(accounts).where(eq(accounts.userId, other));
      await insertTransaction(db, otherAccount, entry(1));
    });

    await t.test("falha depois da exclusão reverte todos os dados e a moeda", async () => {
      await insertRecurrence(db, await account(), { ...entry(1), type: "expense", repeat: "monthly", occurredOn: "2026-01-01" }, "settings-rule", "2026-01-01");
      await updateBalance(db, await account(), { requestId: randomUUID(), expectedSettingsVersion: 1, expectedVersion: (await account()).version, balance: "500.00", reason: "Conferência" });
      const before = await account();
      const input = setting({ expectedSettingsVersion: 1, currency: "USD", confirmReset: true });
      await pg.exec(`alter table account_settings_requests add constraint settings_test_failure check(request_id <> '${input.requestId}'::uuid)`);
      await assert.rejects(saveSettings(db, user, input));
      assert.deepEqual(await account(), before);
      assert.equal((await db.select().from(recurringExpenses).where(eq(recurringExpenses.accountId, wallet))).length, 1);
      assert.equal((await db.select().from(balanceAdjustments).where(eq(balanceAdjustments.accountId, wallet))).length, 1);
      await pg.exec("alter table account_settings_requests drop constraint settings_test_failure");
      await saveSettings(db, user, input);
      assert.equal((await account()).balance, "0.00");
      for (const table of [transactions, recurringExpenses, balanceAdjustments]) assert.equal((await db.select().from(table).where(eq(table.accountId, wallet))).length, 0);
      await insertTransaction(db, await account(), entry(2));
      await saveSettings(db, user, input);
      assert.equal((await account()).balance, "25.00");
      assert.equal((await db.select().from(transactions).where(eq(transactions.userId, other))).length, 1);
      await assert.rejects(saveSettings(db, other, input));
      await assert.rejects(insertRecurrence(db, await account(), { ...entry(1), type: "expense", repeat: "monthly" }, "stale", "2026-01-01"), /configurações mudaram/);
    });

    await t.test("ajustes seguem fuso; datas civis permanecem intactas", async () => {
      await saveSettings(db, user, setting({ expectedSettingsVersion: 2, currency: "USD", timeZone: "America/Los_Angeles" }));
      await db.insert(balanceAdjustments).values({ accountId: wallet, userId: user, requestId: randomUUID(), previousBalance: "0.00", newBalance: "10.00", reason: "Fronteira do mês", createdAt: new Date("2026-10-01T01:30:00Z") });
      const history = await readHistory(db, wallet, user, { month: "2026-09", page: 1, query: "", type: "all", category: "all" });
      assert.equal(history.activity[0].day, "2026-09-30");
      assert.equal((await db.select().from(transactions).where(eq(transactions.accountId, wallet)))[0].occurredOn, "2026-01-01");
      assert.equal(history.account.timeZone, "America/Los_Angeles");
    });

    await t.test("cron compara vencimentos pela data de cada carteira e ignora pendentes", async () => {
      const midnight = new Date("2026-01-01T01:30:00Z");
      await insertRecurrence(db, await account(), { ...entry(3), type: "expense", repeat: "monthly", occurredOn: "2026-01-01" }, "zoned", midnight);
      const due = await dueAccounts(db, midnight, "00000000-0000-0000-0000-000000000000");
      assert.ok(!due.some(row => row.accountId === wallet));
      assert.equal(await processRecurrences(db, wallet, user, midnight), 0);
      assert.equal(await processRecurrences(db, wallet, user, new Date("2026-01-01T08:30:00Z")), 1);
      assert.equal(await processRecurrences(db, wallet, user, new Date("2026-01-01T08:30:00Z")), 0);
    });

    await t.test("duas alterações com a mesma versão não sobrescrevem preferências", async () => {
      const results = await Promise.allSettled([
        saveSettings(db, user, setting({ expectedSettingsVersion: 3, currency: "USD", timeZone: "America/New_York" })),
        saveSettings(db, user, setting({ expectedSettingsVersion: 3, currency: "USD", timeZone: "UTC" })),
      ]);
      assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
      assert.equal((await account()).settingsVersion, 4);
    });

    await t.test("dados sem moeda conhecida exigem reinício explícito", async () => {
      const unknown = randomUUID();
      await pg.query("insert into users(id,provider_id) values($1,'settings_unknown')", [unknown]);
      const fresh = await readSettings(db, unknown);
      assert.equal(fresh.configured, false);
      assert.equal(fresh.hasFinancialData, false);
      const [unknownAccount] = await db.select().from(accounts).where(eq(accounts.userId, unknown));
      await db.insert(transactions).values({ accountId: unknownAccount.id, userId: unknown, ...entry(0) });
      assert.equal((await readSettings(db, unknown)).hasFinancialData, true);
      await assert.rejects(saveSettings(db, unknown, setting({ currency: "CAD" })), /Confirme/);
      await saveSettings(db, unknown, setting({ currency: "CAD", confirmReset: true }));
      assert.equal((await db.select().from(transactions).where(eq(transactions.accountId, unknownAccount.id))).length, 0);
    });
  } finally { await pg.close(); }
});
