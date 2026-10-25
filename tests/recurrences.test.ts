import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { recurrenceDate } from "@/lib/recurrence";
import { isCronAuthorized } from "@/lib/cron-auth";
import { createTransactionSchema } from "@schemas/transaction/create-transaction";
import { recurrenceFrequencies } from "@schemas/recurrence/frequency";
import {
  insertRecurrence,
  updateRecurrence,
  processRecurrences,
  dueAccounts,
} from "@/db/mutations/recurrence-operations";
import {
  updateBalance,
  type OwnedAccount,
} from "@/db/mutations/financial-operations";
import { readDashboard } from "@/db/queries/overview";

test("cron exige o segredo exato e falha fechado sem configuração", () => {
  assert.equal(isCronAuthorized(null, "abc"), false);
  assert.equal(isCronAuthorized("Bearer undefined", undefined), false);
  assert.equal(isCronAuthorized("Bearer ", ""), false);
  assert.equal(isCronAuthorized("Bearer abc", "abc"), true);
  assert.equal(isCronAuthorized("Bearer abcd", "abc"), false);
});

test("recorrências: calendário, atomicidade, duplicação, edição e encerramento", async (t) => {
  const pg = new PGlite();
  const db = drizzle({ client: pg });
  const accountId = randomUUID();
  const userId = randomUUID();
  const account = async () =>
    (
      await pg.query<OwnedAccount>(
        'select id, user_id as "userId", balance::text, version from accounts where id=$1',
        [accountId],
      )
    ).rows[0];
  const rules = async () =>
    (
      await pg.query<{ id: string; version: number; next_due_on: string }>(
        "select id, version, next_due_on::text from recurring_expenses order by created_at, id",
      )
    ).rows;
  const input = (patch = {}) =>
    createTransactionSchema.parse({
      requestId: randomUUID(),
      type: "expense",
      amount: "100.10",
      description: "Aluguel",
      category: "housing",
      repeat: "monthly",
      occurredOn: "2026-01-31",
      ...patch,
    });
  try {
    for (const directory of (await readdir("drizzle")).sort())
      await pg.exec(
        await readFile(`drizzle/${directory}/migration.sql`, "utf8"),
      );
    await pg.query(
      "insert into users(id,provider_id) values ($1,'provider_recurring')",
      [userId],
    );
    await pg.query(
      "insert into accounts (currency,currency_configured_at,id, user_id, balance) values ('BRL',now(),$1, $2, 1000)",
      [accountId, userId],
    );

    await t.test(
      "calendários preservam o dia original, inclusive ano bissexto e quinze dias",
      async () => {
        const cases = [
          ["2026-01-31", "monthly", 1, "2026-02-28"],
          ["2026-01-31", "monthly", 2, "2026-03-31"],
          ["2024-02-29", "yearly", 1, "2025-02-28"],
          ["2024-02-29", "yearly", 4, "2028-02-29"],
          ["2025-08-31", "semiannual", 1, "2026-02-28"],
          ["2025-08-31", "semiannual", 2, "2026-08-31"],
          ["2026-01-31", "fortnightly", 1, "2026-02-15"],
          ["2026-01-31", "fortnightly", 2, "2026-03-02"],
        ] as const;
        for (const [start, frequency, index, expected] of cases) {
          assert.equal(recurrenceDate(start, frequency, index), expected);
        }
        for (const repeat of recurrenceFrequencies)
          assert.equal(input({ repeat }).repeat, repeat);
        assert.equal(
          createTransactionSchema.safeParse({ ...input(), type: "income" })
            .success,
          false,
        );
        assert.equal(
          createTransactionSchema.parse({ ...input(), repeat: undefined })
            .repeat,
          "none",
        );
      },
    );

    const initial = input();
    const snapshot = await account();
    let id: string;
    await t.test(
      "criação gera primeira saída hoje; reenviar não debita novamente",
      async () => {
        const result = await insertRecurrence(
          db,
          snapshot,
          initial,
          "hash-original",
          "2026-01-31",
        );
        id = result;
        assert.equal((await account()).balance, "899.90");
        await Promise.all(
          [0, 1, 2].map(() =>
            insertRecurrence(
              db,
              snapshot,
              initial,
              "hash-original",
              "2026-01-31",
            ),
          ),
        );
        assert.equal((await account()).balance, "899.90");
        await assert.rejects(
          insertRecurrence(
            db,
            snapshot,
            { ...initial, amount: "200.00" },
            "changed",
            "2026-01-31",
          ),
        );
      },
    );

    await t.test(
      "cron recupera vencimentos perdidos sem duplicar e invalida ajuste de saldo antigo",
      async () => {
        const before = await account();
        await Promise.all(
          [0, 1, 2].map(() =>
            processRecurrences(db, accountId, userId, "2026-03-31"),
          ),
        );
        assert.equal((await account()).balance, "699.70");
        assert.deepEqual(
          (
            await pg.query<{ date: string }>(
              "select occurred_on::text as date from transactions order by occurred_on",
            )
          ).rows.map((row) => row.date),
          ["2026-01-31", "2026-02-28", "2026-03-31"],
        );
        assert.equal((await rules())[0].next_due_on, "2026-04-30");
        const stale = await updateBalance(db, before, {
          requestId: randomUUID(),
          expectedVersion: before.version,
          balance: "2000.00",
          reason: "Conferência",
        });
        assert.equal(stale.length, 0);
        const dashboard = await readDashboard(db, accountId, userId, "2026-03");
        assert.equal(dashboard.expense, "100.10");
        assert.equal(dashboard.lastActivity?.recurrenceId, id);
      },
    );

    await t.test(
      "edição altera somente próximos vencimentos; dono e versão são obrigatórios",
      async () => {
        const rule = (await rules())[0];
        const change = {
          id: rule.id,
          expectedVersion: rule.version,
          expectedSettingsVersion: 0,
          amount: "120.20",
          description: "Aluguel atualizado",
          category: "housing" as const,
        };
        await assert.rejects(
          updateRecurrence(
            db,
            { ...(await account()), userId: randomUUID() },
            change,
            "2026-04-01",
            change,
          ),
        );
        await updateRecurrence(
          db,
          await account(),
          change,
          "2026-04-01",
          change,
        );
        await assert.rejects(
          updateRecurrence(db, await account(), change, "2026-04-01", change),
        );
        await insertRecurrence(
          db,
          await account(),
          initial,
          "hash-original",
          "2026-04-01",
        );
        await processRecurrences(db, accountId, userId, "2026-04-30");
        assert.equal((await account()).balance, "579.50");
        const rows = (
          await pg.query<{ amount: string; description: string }>(
            "select amount::text, description from transactions order by occurred_on",
          )
        ).rows;
        assert.equal(rows[0].description, "Aluguel");
        assert.equal(rows[3].description, "Aluguel atualizado");
        assert.equal(rows[3].amount, "120.20");
      },
    );

    await t.test(
      "encerramento preserva histórico e impede próximos lançamentos",
      async () => {
        const rule = (await rules())[0];
        const end = { id: rule.id, expectedVersion: rule.version };
        await updateRecurrence(db, await account(), end, "2026-05-01");
        await updateRecurrence(db, await account(), end, "2026-05-01");
        await processRecurrences(db, accountId, userId, "2027-05-31");
        assert.equal((await account()).balance, "579.50");
        assert.equal(
          (await pg.query("select id from transactions")).rows.length,
          4,
        );
      },
    );

    await t.test(
      "data futura aguarda vencimento; falha no saldo reverte lançamento e progresso",
      async () => {
        const future = input({
          amount: "9999999999999.99",
          occurredOn: "2028-01-01",
          repeat: "yearly",
        });
        await insertRecurrence(
          db,
          await account(),
          future,
          "future",
          "2026-05-01",
        );
        assert.equal((await account()).balance, "579.50");
        await pg.query("update accounts set balance = -1 where id=$1", [
          accountId,
        ]);
        await assert.rejects(
          processRecurrences(db, accountId, userId, "2028-01-01"),
        );
        assert.equal((await account()).balance, "-1.00");
        assert.equal(
          (await pg.query("select id from transactions")).rows.length,
          4,
        );
        assert.equal(
          (
            await pg.query<{ next_due_on: string }>(
              "select next_due_on::text from recurring_expenses where ended_at is null",
            )
          ).rows[0].next_due_on,
          "2028-01-01",
        );
      },
    );
    await t.test(
      "as quatro frequências geram vencimentos corretos e não duplicam no reprocessamento",
      async () => {
        const cases = [
          {
            repeat: "monthly",
            start: "2026-01-31",
            today: "2026-03-31",
            dates: ["2026-01-31", "2026-02-28", "2026-03-31"],
          },
          {
            repeat: "semiannual",
            start: "2025-08-31",
            today: "2026-08-31",
            dates: ["2025-08-31", "2026-02-28", "2026-08-31"],
          },
          {
            repeat: "yearly",
            start: "2024-02-29",
            today: "2028-02-29",
            dates: [
              "2024-02-29",
              "2025-02-28",
              "2026-02-28",
              "2027-02-28",
              "2028-02-29",
            ],
          },
          {
            repeat: "fortnightly",
            start: "2026-01-31",
            today: "2026-03-02",
            dates: ["2026-01-31", "2026-02-15", "2026-03-02"],
          },
        ] as const;
        for (const scenario of cases) {
          const owner = randomUUID(),
            wallet = randomUUID();
          await pg.query("insert into users(id,provider_id) values ($1,$2)", [
            owner,
            owner,
          ]);
          await pg.query(
            "insert into accounts(currency,currency_configured_at,id,user_id,balance) values ('BRL',now(),$1,$2,1000)",
            [wallet, owner],
          );
          const ruleId = await insertRecurrence(
            db,
            { id: wallet, userId: owner, balance: "1000.00", version: 0 },
            input({
              repeat: scenario.repeat,
              occurredOn: scenario.start,
              amount: "10.00",
            }),
            scenario.repeat,
            scenario.start,
          );
          assert.equal(
            await processRecurrences(db, wallet, owner, scenario.today),
            scenario.dates.length - 1,
          );
          assert.equal(
            await processRecurrences(db, wallet, owner, scenario.today),
            0,
          );
          const result = await pg.query<{ day: string }>(
            "select occurred_on::text as day from transactions where recurrence_id=$1 order by occurred_on",
            [ruleId],
          );
          assert.deepEqual(
            result.rows.map((row) => row.day),
            [...scenario.dates],
          );
          const balance = await pg.query<{ balance: string }>(
            "select balance::text from accounts where id=$1",
            [wallet],
          );
          assert.equal(
            balance.rows[0].balance,
            (1000 - scenario.dates.length * 10).toFixed(2),
          );
        }
      },
    );

    await t.test(
      "edição processa atrasados com valor antigo e cron seleciona somente carteiras pendentes",
      async () => {
        const owner = randomUUID(),
          wallet = randomUUID();
        await pg.query("insert into users(id,provider_id) values ($1,$2)", [
          owner,
          owner,
        ]);
        await pg.query(
          "insert into accounts(currency,currency_configured_at,id,user_id,balance) values ('BRL',now(),$1,$2,1000)",
          [wallet, owner],
        );
        const owned = {
          id: wallet,
          userId: owner,
          balance: "1000.00",
          version: 0,
        };
        const ruleId = await insertRecurrence(
          db,
          owned,
          input({ amount: "10.00", occurredOn: "2026-01-01" }),
          "overdue",
          "2026-01-01",
        );
        await assert.rejects(
          processRecurrences(db, wallet, randomUUID(), "2026-02-01"),
        );
        const pending = await dueAccounts(
          db,
          "2026-02-01",
          "00000000-0000-0000-0000-000000000000",
        );
        assert.ok(
          pending.some(
            (row) => row.accountId === wallet && row.userId === owner,
          ),
        );
        const afterCursor = await dueAccounts(db, "2026-02-01", wallet);
        assert.ok(afterCursor.every((row) => row.accountId > wallet));
        const change = {
          id: ruleId,
          expectedSettingsVersion: 0,
          expectedVersion: 1,
          amount: "20.00",
          description: "Novo valor",
          category: "housing" as const,
        };
        await updateRecurrence(db, owned, change, "2026-03-01", change);
        await processRecurrences(db, wallet, owner, "2026-04-01");
        const rows = await pg.query<{ amount: string }>(
          "select amount::text from transactions where recurrence_id=$1 order by occurred_on",
          [ruleId],
        );
        assert.deepEqual(
          rows.rows.map((row) => row.amount),
          ["10.00", "10.00", "10.00", "20.00"],
        );
        const noLongerDue = await dueAccounts(
          db,
          "2026-04-01",
          "00000000-0000-0000-0000-000000000000",
        );
        assert.ok(noLongerDue.every((row) => row.accountId !== wallet));
      },
    );
  } finally {
    await pg.close();
  }
});
