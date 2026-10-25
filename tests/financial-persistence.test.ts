import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import {
  insertTransaction,
  updateBalance,
  type OwnedAccount,
} from "@/db/mutations/financial-operations";
import { resolveUser } from "@/db/queries/users";
import { readDashboard } from "@/db/queries/overview";
import { readHistory } from "@/db/queries/activity";
import { localToday, toCents, fromCents, formatMoney } from "@/lib/financial";
import {
  transactionCategories,
  type TransactionCategory,
} from "@schemas/transaction/category";

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
  const db = drizzle({ client: pg });
  const execute = async (operation: PromiseLike<{ id: string }[]>) => ({
    rows: await operation,
  });
  const accountId = randomUUID();
  const userA = "00000000-0000-4000-8000-000000000001";
  const userB = "00000000-0000-4000-8000-000000000002";
  const account = async () =>
    (
      await pg.query<OwnedAccount>(
        `select id, user_id as "userId", balance::text, version from accounts where id = $1`,
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
      await pg.exec(
        await readFile(`drizzle/${directory}/migration.sql`, "utf8"),
      );
    }
    await pg.query(
      "insert into users(id,provider_id) values ($1,'provider_a'),($2,'provider_b'),('00000000-0000-4000-8000-000000000003','provider_analytics')",
      [userA, userB],
    );
    await pg.query("insert into accounts(currency,currency_configured_at,id,user_id) values ('BRL',now(),$1,$2)", [
      accountId,
      userA,
    ]);
    await t.test(
      "UUID interno é estável, único por provedor e desacoplado da autenticação",
      async () => {
        const resolved = await Promise.all(
          [1, 2, 3].map(() => execute(resolveUser(db, "provider_new"))),
        );
        const ids = resolved.map(
          (result) => (result.rows[0] as { id: string }).id,
        );
        assert.equal(new Set(ids).size, 1);
        assert.match(ids[0], /^[0-9a-f-]{36}$/);
        assert.notEqual(ids[0], "provider_new");
        await pg.query(
          "update users set provider_id='replacement_provider' where id=$1",
          [userA],
        );
        const row = await execute(resolveUser(db, "replacement_provider"));
        assert.equal((row.rows[0] as { id: string }).id, userA);
        assert.equal((await account()).userId, userA);
        await assert.rejects(
          pg.query("insert into accounts(user_id) values($1)", [randomUUID()]),
        );
        await assert.rejects(
          pg.query("insert into accounts(user_id) values($1)", [userA]),
        );
        const columns = await pg.query<{ column_name: string }>(
          "select column_name from information_schema.columns where table_name in ('accounts','transactions','balance_adjustments','recurring_expenses')",
        );
        assert.equal(
          columns.rows.some((row) => row.column_name === "provider_id"),
          false,
        );
      },
    );
    await t.test(
      "entrada e saída atualizam o saldo sem ponto flutuante",
      async () => {
        await execute(insertTransaction(db, await account(), entry("0.10")));
        await execute(insertTransaction(db, await account(), entry("0.20")));
        await execute(
          insertTransaction(db, await account(), entry("0.05", "expense")),
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
          execute(insertTransaction(db, snapshot, first)),
          execute(insertTransaction(db, snapshot, second)),
        ]);
        assert.equal(results.filter((result) => result.rows.length).length, 1);
        await execute(
          insertTransaction(
            db,
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
        await execute(insertTransaction(db, await account(), input));
        const before = await account();
        await assert.rejects(execute(insertTransaction(db, before, input)));
        assert.deepEqual(await account(), before);
      },
    );
    await t.test(
      "nenhum proprietário recebido de fora consegue movimentar a carteira",
      async () => {
        const before = await account();
        await assert.rejects(updateBalance(db, { ...before, userId: userB }, {
          requestId: randomUUID(), balance: "500.00", reason: "Outro proprietário", expectedVersion: before.version,
        }));
        await assert.rejects(insertTransaction(db, { ...before, userId: userB }, entry("500.00")));
        await assert.rejects(
          pg.query(
            "insert into transactions(account_id,user_id,request_id,type,amount,description,occurred_on) values($1,$2,$3,'income',10,'Invasão','2026-10-25')",
            [accountId, userB, randomUUID()],
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
          updateBalance(db, before, {
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
              updateBalance(db, before, {
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
          updateBalance(db, current, {
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
              updateBalance(db, before, {
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
          "insert into accounts(currency,currency_configured_at,id,user_id) values ('BRL',now(),$1,'00000000-0000-4000-8000-000000000002')",
          [otherId],
        );
        await execute(
          insertTransaction(
            db,
            {
              id: otherId,
              userId: userB,
              balance: "0.00",
              version: 0,
            },
            entry("9000.00"),
          ),
        );
        const result = {
          rows: [await readDashboard(db, accountId, userA, "2026-10")],
        };
        assert.equal(result.rows[0].income, "8.30");
        assert.equal(result.rows[0].expense, "0.05");
        assert.equal(result.rows[0].count, 6);
        assert.equal(result.rows[0].balance, "0.00");
        assert.ok(result.rows[0].lastActivity?.id);
        assert.equal("activity" in result.rows[0], false);
        await assert.rejects(readDashboard(db, accountId, userB, "2026-10"));
      },
    );
    await t.test(
      "histórico filtra e pagina no banco sem misturar proprietários",
      async () => {
        for (let index = 0; index < 25; index++) {
          await execute(
            insertTransaction(db, await account(), {
              ...entry("0.01"),
              description: `Registro ${index}`,
            }),
          );
        }
        const getPage = async (
          page: number,
          query = "Registro",
          type: "all" | "income" | "expense" | "adjustment" = "all",
          userId = userA,
          category: "all" | TransactionCategory = "all",
        ) => {
          return readHistory(db, accountId, userId, {
            month: "2026-10",
            page,
            query,
            type,
            category,
          });
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
        await assert.rejects(getPage(1, "Registro", "all", userB));
        await execute(
          insertTransaction(db, await account(), {
            ...entry("0.01"),
            description: "Teste literal %_",
          }),
        );
        assert.equal((await getPage(1, "%_")).total, 1);
        for (const type of ["income", "expense", "expense"] as const) {
          await execute(insertTransaction(db, await account(), {
            ...entry("1.00", type), category: "food", description: "Registro alimentação",
          }));
        }
        const food = await getPage(1, "Registro", "all", userA, "food");
        assert.equal(food.total, 3);
        assert.ok(food.activity.every(row => row.category === "food"));
        assert.equal((await getPage(1, "Registro", "expense", userA, "food")).total, 2);
        assert.equal((await getPage(1, "inexistente", "all", userA, "food")).total, 0);
        assert.equal((await getPage(1, "", "adjustment", userA, "food")).total, 0);
        const otherFirst = await getPage(1, "Registro", "all", userA, "other");
        const otherSecond = await getPage(2, "Registro", "all", userA, "other");
        assert.equal(otherFirst.total, 25);
        assert.equal(otherFirst.activity.length, 20);
        assert.equal(otherSecond.activity.length, 5);
        await assert.rejects(getPage(1, "", "all", userB, "food"));
      },
    );
    await t.test(
      "análises somam categorias, comparam meses e ordenam o top 5 sem incluir ajustes ou outra carteira",
      async () => {
        const id = randomUUID();
        await pg.query(
          "insert into accounts(currency,currency_configured_at,id,user_id) values ('BRL',now(),$1,'00000000-0000-4000-8000-000000000003')",
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
            "insert into transactions(account_id,user_id,request_id,type,category,amount,description,occurred_on) values($1,'00000000-0000-4000-8000-000000000003',$2,'expense',$3::text::transaction_category,$4,$3::text,'2026-10-10')",
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
            "insert into transactions(account_id,user_id,request_id,type,amount,description,occurred_on) values($1,'00000000-0000-4000-8000-000000000003',$2,$3,$4,'Fixture',$5)",
            [id, randomUUID(), type, amount, day],
          );
        }
        await pg.query(
          "insert into balance_adjustments(account_id,user_id,request_id,previous_balance,new_balance,reason) values($1,'00000000-0000-4000-8000-000000000003',$2,0,50000,'Ajuste')",
          [id, randomUUID()],
        );
        const data = await readDashboard(
          db,
          id,
          "00000000-0000-4000-8000-000000000003",
          "2026-10",
        );
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
        await assert.rejects(readDashboard(db, id, userA, "2026-10"));
      },
    );
  } finally {
    await pg.close();
  }
});
