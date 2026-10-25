import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import {
  createTransactionSql,
  adjustBalanceSql,
  type OwnedAccount,
} from "@/db/mutations/financial-sql";
import { getGoogleId } from "@/lib/google-identity";
import {
  dashboardSql,
  type Activity,
  type DashboardSnapshot,
} from "@/db/queries/dashboard-sql";
import { historySql } from "@/db/queries/history-sql";
import { localToday, toCents, fromCents, formatMoney } from "@/lib/financial";
import {
  transactionCategories,
  type TransactionCategory,
} from "@schemas/transaction/category";

test("identidade usa providerUserId do Google, sem confundir com IDs do Clerk", () => {
  assert.equal(
    getGoogleId([
      { provider: "oauth_google", providerUserId: "123456789012345678901" },
    ]),
    "123456789012345678901",
  );
  assert.equal(
    getGoogleId([{ provider: "google", providerUserId: "123" }]),
    "123",
  );
  assert.equal(
    getGoogleId([{ provider: "oauth_github", providerUserId: "123" }]),
    null,
  );
  assert.equal(
    getGoogleId([{ provider: "google", providerUserId: " " }]),
    null,
  );
  assert.equal(
    getGoogleId([
      { provider: "google", providerUserId: "1" },
      { provider: "oauth_google", providerUserId: "2" },
    ]),
    null,
  );
});

test("datas usam São Paulo e aritmética monetária preserva centavos e limites", () => {
  assert.equal(localToday(new Date("2026-10-25T01:30:00Z")), "2026-10-24");
  assert.equal(fromCents(toCents("0.10") + toCents("0.20")), "0.30");
  assert.equal(
    fromCents(toCents("9999999999999.99") - toCents("-9999999999999.99")),
    "19999999999999.98",
  );
  assert.equal(formatMoney("-1200.01"), "− R$ 1.200,01");
});

test("migrations e mutations executam em PostgreSQL com isolamento, atomicidade e auditoria", async (t) => {
  const pg = new PGlite();
  const dialect = new PgDialect();
  const execute = async (query: SQL) => {
    const built = dialect.sqlToQuery(query);
    return pg.query(built.sql, built.params);
  };
  const accountId = randomUUID();
  const legacyId = randomUUID();
  const account = async () =>
    (
      await pg.query<OwnedAccount>(
        `select id, google_id as "googleId", clerk_user_id as "clerkUserId", balance::text, version from accounts where id = $1`,
        [accountId],
      )
    ).rows[0];
  const entry = (amount: string, type: "income" | "expense" = "income") => ({
    requestId: randomUUID(),
    type,
    amount,
    category: "other" as const,
    description: "Teste de persistência",
    occurredOn: "2026-10-25",
  });
  try {
    for (const directory of (await readdir("drizzle")).sort()) {
      if (directory.endsWith("transaction-categories")) {
        await pg.query(
          "insert into accounts(id, clerk_user_id, google_id) values($1, 'legacy_clerk', 'legacy_google')",
          [legacyId],
        );
        await pg.query(
          "insert into transactions(account_id,google_id,request_id,type,amount,description,occurred_on) values($1,'legacy_google',$2,'expense',12.34,'Legado','2026-10-01')",
          [legacyId, randomUUID()],
        );
      }
      await pg.exec(
        await readFile(`drizzle/${directory}/migration.sql`, "utf8"),
      );
    }
    await t.test(
      "migration preserva transações existentes e preenche a categoria padrão",
      async () => {
        const result = await pg.query<{ category: string }>(
          "select category::text from transactions where account_id=$1",
          [legacyId],
        );
        assert.equal(result.rows[0].category, "other");
        await assert.rejects(
          pg.query(
            "update transactions set category='invalid' where account_id=$1",
            [legacyId],
          ),
        );
      },
    );
    await pg.query(
      "insert into accounts(id, clerk_user_id, google_id) values ($1, $2, $3)",
      [accountId, "clerk_test_a", "google_test_a"],
    );
    await t.test(
      "entrada e saída atualizam o saldo sem ponto flutuante",
      async () => {
        await execute(createTransactionSql(await account(), entry("0.10")));
        await execute(createTransactionSql(await account(), entry("0.20")));
        await execute(
          createTransactionSql(await account(), entry("0.05", "expense")),
        );
        assert.equal((await account()).balance, "0.25");
      },
    );
    await t.test(
      "envios concorrentes com a mesma versão não sobrescrevem saldo",
      async () => {
        const snapshot = await account();
        const first = entry("1.00"),
          second = entry("2.00");
        const results = await Promise.all([
          execute(createTransactionSql(snapshot, first)),
          execute(createTransactionSql(snapshot, second)),
        ]);
        assert.equal(results.filter((result) => result.rows.length).length, 1);
        await execute(
          createTransactionSql(
            await account(),
            results[0].rows.length ? second : first,
          ),
        );
        assert.equal((await account()).balance, "3.25");
      },
    );
    await t.test(
      "falha por requestId duplicado reverte também a alteração de saldo",
      async () => {
        const input = entry("5.00");
        await execute(createTransactionSql(await account(), input));
        const before = await account();
        await assert.rejects(execute(createTransactionSql(before, input)));
        assert.deepEqual(await account(), before);
      },
    );
    await t.test(
      "nenhum proprietário recebido de fora consegue movimentar a carteira",
      async () => {
        const before = await account();
        assert.equal(
          (
            await execute(
              createTransactionSql(
                { ...before, googleId: "another_google" },
                entry("500.00"),
              ),
            )
          ).rows.length,
          0,
        );
        assert.equal(
          (
            await execute(
              createTransactionSql(
                { ...before, clerkUserId: "another_clerk" },
                entry("500.00"),
              ),
            )
          ).rows.length,
          0,
        );
        await assert.rejects(
          pg.query(
            "insert into transactions(account_id,google_id,request_id,type,amount,description,occurred_on) values($1,$2,$3,'income',10,'Invasão','2026-10-25')",
            [accountId, "another_google", randomUUID()],
          ),
        );
        assert.deepEqual(await account(), before);
      },
    );
    await t.test(
      "ajuste registra saldo anterior e aceita negativo e zero; versão antiga é rejeitada",
      async () => {
        const before = await account();
        await execute(
          adjustBalanceSql(before, {
            requestId: randomUUID(),
            balance: "-15.50",
            reason: "Conferência",
            expectedVersion: before.version,
          }),
        );
        assert.equal((await account()).balance, "-15.50");
        assert.equal(
          (
            await execute(
              adjustBalanceSql(before, {
                requestId: randomUUID(),
                balance: "999.00",
                reason: "Formulário antigo",
                expectedVersion: before.version,
              }),
            )
          ).rows.length,
          0,
        );
        const current = await account();
        await execute(
          adjustBalanceSql(current, {
            requestId: randomUUID(),
            balance: "0.00",
            reason: "Zerar saldo",
            expectedVersion: current.version,
          }),
        );
        assert.equal((await account()).balance, "0.00");
        const rows = await pg.query<{
          previous_balance: string;
          new_balance: string;
        }>(
          "select previous_balance::text,new_balance::text from balance_adjustments",
        );
        assert.equal(rows.rows.length, 2);
        assert.ok(
          rows.rows.some(
            (row) =>
              row.previous_balance === before.balance &&
              row.new_balance === "-15.50",
          ),
        );
      },
    );
    await t.test(
      "ajuste sem mudança não cria histórico nem incrementa versão",
      async () => {
        const before = await account();
        assert.equal(
          (
            await execute(
              adjustBalanceSql(before, {
                requestId: randomUUID(),
                balance: before.balance,
                reason: "Sem mudança",
                expectedVersion: before.version,
              }),
            )
          ).rows.length,
          0,
        );
        assert.deepEqual(await account(), before);
      },
    );
    await t.test(
      "saldo corresponde às entradas menos saídas mais ajustes",
      async () => {
        const result = await pg.query<{ expected: string }>(
          `select (
                coalesce((select sum(case when type = 'income' then amount else -amount end) from transactions where account_id = $1), 0)
                + coalesce((select sum(new_balance - previous_balance) from balance_adjustments where account_id = $1), 0)
            )::numeric(15,2)::text as expected`,
          [accountId],
        );
        assert.equal(result.rows[0].expected, (await account()).balance);
      },
    );
    await t.test(
      "dashboard soma apenas movimentações da carteira e mantém ajustes fora dos totais",
      async () => {
        const otherId = randomUUID();
        await pg.query(
          "insert into accounts(id, clerk_user_id, google_id) values ($1,'clerk_b','google_b')",
          [otherId],
        );
        await execute(
          createTransactionSql(
            {
              id: otherId,
              clerkUserId: "clerk_b",
              googleId: "google_b",
              balance: "0.00",
              version: 0,
            },
            entry("9000.00"),
          ),
        );
        const built = dialect.sqlToQuery(
          dashboardSql(accountId, "google_test_a", "2026-10"),
        );
        const result = await pg.query<{
          income: string;
          expense: string;
          count: number;
          lastActivity: Activity | null;
          balance: string;
        }>(built.sql, built.params);
        assert.equal(result.rows[0].income, "8.30");
        assert.equal(result.rows[0].expense, "0.05");
        assert.equal(result.rows[0].count, 6);
        assert.equal(result.rows[0].balance, "0.00");
        assert.ok(result.rows[0].lastActivity?.id);
        assert.equal("activity" in result.rows[0], false);
        const wrongOwner = dialect.sqlToQuery(
          dashboardSql(accountId, "google_b", "2026-10"),
        );
        const denied = await pg.query<{
          count: number;
          lastActivity: Activity | null;
        }>(wrongOwner.sql, wrongOwner.params);
        assert.equal(denied.rows[0].count, 0);
        assert.equal(denied.rows[0].lastActivity, null);
      },
    );
    await t.test(
      "histórico filtra e pagina no banco sem misturar proprietários",
      async () => {
        for (let index = 0; index < 25; index++) {
          await execute(
            createTransactionSql(await account(), {
              ...entry("0.01"),
              description: `Registro ${index}`,
            }),
          );
        }
        const getPage = async (
          page: number,
          query = "Registro",
          type: "all" | "income" | "expense" | "adjustment" = "all",
          googleId = "google_test_a",
        ) => {
          const built = dialect.sqlToQuery(
            historySql(accountId, googleId, {
              month: "2026-10",
              page,
              query,
              type,
            }),
          );
          return (
            await pg.query<{ total: number; activity: Activity[] }>(
              built.sql,
              built.params,
            )
          ).rows[0];
        };
        const first = await getPage(1),
          second = await getPage(2);
        assert.equal(first.total, 25);
        assert.equal(first.activity.length, 20);
        assert.equal(second.activity.length, 5);
        assert.equal(
          new Set([...first.activity, ...second.activity].map((row) => row.id))
            .size,
          25,
        );
        assert.equal((await getPage(1, "Registro", "expense")).total, 0);
        assert.deepEqual(
          (await getPage(1, "Registro", "all", "google_b")).activity,
          [],
        );
        await execute(
          createTransactionSql(await account(), {
            ...entry("0.01"),
            description: "Teste literal %_",
          }),
        );
        assert.equal((await getPage(1, "%_")).total, 1);
      },
    );
    await t.test(
      "análises somam categorias, comparam meses e ordenam o top 5 sem incluir ajustes ou outra carteira",
      async () => {
        const id = randomUUID();
        await pg.query(
          "insert into accounts(id, clerk_user_id, google_id) values($1,'analytics_clerk','analytics_google')",
          [id],
        );
        const expenses: [TransactionCategory, string][] = [
          ["housing", "1000.00"],
          ["food", "300.00"],
          ["transport", "200.00"],
          ["leisure", "100.00"],
          ["health", "50.00"],
          ["other", "25.00"],
        ];
        for (const [category, amount] of expenses) {
          await pg.query(
            "insert into transactions(account_id,google_id,request_id,type,category,amount,description,occurred_on) values($1,'analytics_google',$2,'expense',$3::text::transaction_category,$4,$3::text,'2026-10-10')",
            [id, randomUUID(), category, amount],
          );
        }
        for (const [type, amount, day] of [
          ["income", "2200.00", "2026-10-10"],
          ["expense", "1500.00", "2026-09-05"],
          ["income", "400.00", "2026-08-05"],
          ["expense", "600.00", "2026-08-05"],
          ["expense", "9999.00", "2026-04-05"],
          ["expense", "999.00", "2026-11-05"],
        ]) {
          await pg.query(
            "insert into transactions(account_id,google_id,request_id,type,amount,description,occurred_on) values($1,'analytics_google',$2,$3,$4,'Fixture',$5)",
            [id, randomUUID(), type, amount, day],
          );
        }
        await pg.query(
          "insert into balance_adjustments(account_id,google_id,request_id,previous_balance,new_balance,reason) values($1,'analytics_google',$2,0,50000,'Ajuste')",
          [id, randomUUID()],
        );
        const query = dialect.sqlToQuery(
          dashboardSql(id, "analytics_google", "2026-10"),
        );
        const data = (
          await pg.query<DashboardSnapshot>(query.sql, query.params)
        ).rows[0];
        assert.equal(data.expense, "1675.00");
        assert.equal(data.income, "2200.00");
        assert.equal(data.previousExpense, "1500.00");
        assert.equal(data.categories[0].category, "housing");
        assert.equal(data.categories[0].amount, "1000.00");
        assert.equal(
          data.categories.reduce(
            (sum, row) => sum + toCents(row.amount),
            BigInt(0),
          ),
          toCents(data.expense),
        );
        assert.equal(data.topExpenses.length, 5);
        assert.deepEqual(
          data.topExpenses.map((row) => row.amount),
          ["1000.00", "300.00", "200.00", "100.00", "50.00"],
        );
        assert.ok(
          data.topExpenses.every(
            (row) =>
              row.day.startsWith("2026-10") &&
              transactionCategories.includes(row.category),
          ),
        );
        assert.deepEqual(
          data.chart.map((row) => row.month),
          ["2026-08", "2026-09", "2026-10"],
        );
        const deniedQuery = dialect.sqlToQuery(
          dashboardSql(id, "google_test_a", "2026-10"),
        );
        const denied = (
          await pg.query<DashboardSnapshot>(deniedQuery.sql, deniedQuery.params)
        ).rows[0];
        assert.deepEqual(denied.categories, []);
        assert.deepEqual(denied.topExpenses, []);
        assert.equal(denied.previousExpense, "0");
      },
    );
  } finally {
    await pg.close();
  }
});
