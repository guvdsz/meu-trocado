import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { neonConfig } from "@neondatabase/serverless";
import { readOnlyDatabase } from "@/db/http";
import { readDashboard } from "@/db/queries/overview";
import { readHistory } from "@/db/queries/activity";
import { ensureAccount } from "@/db/queries/account-state";
import { users, accounts, transactions, recurringExpenses } from "@/db/schema";

test("relatórios HTTP usam uma chamada, snapshot de leitura e os mesmos resultados do PostgreSQL", async () => {
  const pg = new PGlite();
  const db = drizzle({ client: pg });
  const originalFetch = neonConfig.fetchFunction;
  const originalUrl = process.env.DATABASE_URL;
  const calls: {
    size: number;
    readOnly: string | null;
    isolation: string | null;
  }[] = [];
  try {
    for (const folder of (await readdir("drizzle")).sort())
      await pg.exec(await readFile(`drizzle/${folder}/migration.sql`, "utf8"));
    const userId = randomUUID(),
      accountId = randomUUID(),
      otherUser = randomUUID(),
      otherAccount = randomUUID();
    await db.insert(users).values([
      { id: userId, providerId: userId },
      { id: otherUser, providerId: otherUser },
    ]);
    await db.insert(accounts).values([
      {
        id: accountId,
        userId,
        currency: "BRL",
        currencyConfiguredAt: new Date(),
        balance: "150.00",
      },
      {
        id: otherAccount,
        userId: otherUser,
        currency: "BRL",
        currencyConfiguredAt: new Date(),
      },
    ]);
    await db.insert(transactions).values([
      {
        accountId,
        userId,
        requestId: randomUUID(),
        type: "income",
        amount: "200.00",
        description: "Salário",
        category: "salary",
        occurredOn: "2026-10-20",
      },
      {
        accountId,
        userId,
        requestId: randomUUID(),
        type: "expense",
        amount: "50.00",
        description: "Mercado",
        category: "food",
        occurredOn: "2026-10-21",
      },
      {
        accountId: otherAccount,
        userId: otherUser,
        requestId: randomUUID(),
        type: "expense",
        amount: "999.00",
        description: "Outra carteira",
        category: "food",
        occurredOn: "2026-10-21",
      },
    ]);

    // Run the real Neon HTTP + Drizzle batch protocol against isolated PostgreSQL.
    // No financial data or credentials go over the network.
    process.env.DATABASE_URL = "postgresql://test:test@read-test.invalid/test";
    neonConfig.fetchFunction = async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        queries: { query: string; params: unknown[] }[];
      };
      const headers = new Headers(init?.headers);
      calls.push({
        size: body.queries.length,
        readOnly: headers.get("Neon-Batch-Read-Only"),
        isolation: headers.get("Neon-Batch-Isolation-Level"),
      });
      const results = await pg.transaction(async (tx) => {
        const rows = [];
        for (const query of body.queries) {
          const result = await tx.query(query.query, query.params, {
            rowMode: "array",
            parsers: {
              1082: (value) => value,
              1114: (value) => value,
              1184: (value) => value,
            },
          });
          rows.push(result);
        }
        return rows;
      });
      return new Response(JSON.stringify({ results }), {
        headers: { "content-type": "application/json" },
      });
    };
    const http = readOnlyDatabase();
    assert.deepEqual(
      await readDashboard(http, accountId, userId, "2026-10"),
      await readDashboard(db, accountId, userId, "2026-10"),
    );
    assert.deepEqual(calls, [
      { size: 7, readOnly: "true", isolation: "RepeatableRead" },
    ]);
    const filters = {
      month: "2026-10",
      query: "",
      type: "all" as const,
      category: "food" as const,
      page: 1,
    };
    assert.deepEqual(
      await readHistory(http, accountId, userId, filters),
      await readHistory(db, accountId, userId, filters),
    );
    assert.deepEqual(calls[1], {
      size: 3,
      readOnly: "true",
      isolation: "RepeatableRead",
    });
    await assert.rejects(readDashboard(http, accountId, otherUser, "2026-10"));
    await assert.rejects(readHistory(http, accountId, otherUser, filters));

    // Checking an existing account must not alter its balance or version.
    const before = await ensureAccount(db, userId);
    assert.equal(before.hasDueRecurrences, false);
    await db
      .insert(recurringExpenses)
      .values({
        accountId,
        userId,
        requestId: randomUUID(),
        creationHash: "test",
        description: "Pendente",
        amount: "1.00",
        frequency: "monthly",
        startsOn: "2000-01-01",
        nextDueOn: "2000-01-01",
      });
    const pending = await ensureAccount(db, userId);
    assert.equal(pending.hasDueRecurrences, true);
    assert.equal(pending.balance, before.balance);
    assert.equal(pending.version, before.version);
    assert.equal((await ensureAccount(db, otherUser)).hasDueRecurrences, false);
  } finally {
    neonConfig.fetchFunction = originalFetch;
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
    await pg.close();
  }
});
