import { requireConfigured, accountPreferences } from "@/lib/preferences";
import { and, asc, count, desc, eq, gte, lt, sql } from "drizzle-orm";
import type { Database } from "../types";
import { accounts, transactions } from "../schema";
import { monthBounds } from "@/lib/financial";
import { activityFields, activityQuery } from "./activity";
import type { DashboardSnapshot } from "./financial-types";

function shiftedMonthStart(month: string, offset: number) {
  const [year, value] = month.split("-").map(Number);
  return new Date(Date.UTC(year, value - 1 + offset, 1))
    .toISOString()
    .slice(0, 10);
}

export function readDashboard(
  db: Database,
  accountId: string,
  userId: string,
  month: string,
): Promise<DashboardSnapshot> {
  // Multiple typed queries share one snapshot, even during concurrent writes.
  return db.transaction(
    async (tx) => {
      const { start, end } = monthBounds(month);
      const owner = and(
        eq(transactions.accountId, accountId),
        eq(transactions.userId, userId),
      );
      const period = and(
        owner,
        gte(transactions.occurredOn, start),
        lt(transactions.occurredOn, end),
      );
      const expenses = and(period, eq(transactions.type, "expense"));
      const totalAmount = sql<string>`coalesce(sum(${transactions.amount}), 0)::text`;
      const income = sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.type} = 'income'), 0)::text`;
      const expense = sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.type} = 'expense'), 0)::text`;
      const [account] = await tx
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
      requireConfigured(account);
      const [totals] = await tx
        .select({ income, expense, count: count() })
        .from(transactions)
        .where(period);
      const [previous] = await tx
        .select({ amount: totalAmount })
        .from(transactions)
        .where(
          and(
            owner,
            eq(transactions.type, "expense"),
            gte(transactions.occurredOn, shiftedMonthStart(month, -1)),
            lt(transactions.occurredOn, start),
          ),
        );
      const categories = await tx
        .select({ category: transactions.category, amount: totalAmount })
        .from(transactions)
        .where(expenses)
        .groupBy(transactions.category)
        .orderBy(
          desc(sql`sum(${transactions.amount})`),
          asc(sql`${transactions.category}::text`),
        );
      const topExpenses = await tx
        .select({
          id: transactions.id,
          description: transactions.description,
          amount: transactions.amount,
          day: transactions.occurredOn,
          category: transactions.category,
        })
        .from(transactions)
        .where(expenses)
        .orderBy(
          desc(transactions.amount),
          desc(transactions.occurredOn),
          desc(transactions.id),
        )
        .limit(5);
      const monthKey = sql<string>`to_char(${transactions.occurredOn}, 'YYYY-MM')`;
      const chart = await tx
        .select({ month: monthKey, income, expense })
        .from(transactions)
        .where(
          and(
            owner,
            gte(transactions.occurredOn, shiftedMonthStart(month, -5)),
            lt(transactions.occurredOn, end),
          ),
        )
        .groupBy(monthKey)
        .orderBy(asc(monthKey));
      const activity = activityQuery(tx, accountId, userId);
      const [lastActivity] = await tx
        .select(activityFields(activity))
        .from(activity)
        .orderBy(desc(activity.createdAt), desc(activity.id))
        .limit(1);
      return {
        preferences: accountPreferences(account),
        balance: account?.balance ?? "0.00",
        version: account?.version ?? 0,
        ...totals,
        previousExpense: previous.amount,
        categories,
        topExpenses,
        chart,
        lastActivity: lastActivity ?? null,
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}
