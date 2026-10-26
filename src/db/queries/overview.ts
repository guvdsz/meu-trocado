import { requireConfigured, accountPreferences } from "@/lib/preferences";
import { and, asc, count, desc, eq, gte, lt, sql } from "drizzle-orm";
import type { Database } from "../types";
import { readSnapshot } from "../snapshot";
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

export async function readDashboard(
  db: Database,
  accountId: string,
  userId: string,
  month: string,
): Promise<DashboardSnapshot> {
  const [
    [account],
    [totals],
    [previous],
    categories,
    topExpenses,
    chart,
    [lastActivity],
  ] = await readSnapshot(db, (tx) => {
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
    const accountQuery = tx
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
    const totalsQuery = tx
      .select({ income, expense, count: count() })
      .from(transactions)
      .where(period);
    const previousQuery = tx
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
    const categoriesQuery = tx
      .select({ category: transactions.category, amount: totalAmount })
      .from(transactions)
      .where(expenses)
      .groupBy(transactions.category)
      .orderBy(
        desc(sql`sum(${transactions.amount})`),
        asc(sql`${transactions.category}::text`),
      );
    const topExpensesQuery = tx
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
    const chartQuery = tx
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
    const lastActivityQuery = tx
      .select(activityFields(activity))
      .from(activity)
      .orderBy(desc(activity.createdAt), desc(activity.id))
      .limit(1);
    return [
      accountQuery,
      totalsQuery,
      previousQuery,
      categoriesQuery,
      topExpensesQuery,
      chartQuery,
      lastActivityQuery,
    ] as const;
  });
  requireConfigured(account);
  return {
    preferences: accountPreferences(account),
    balance: account.balance,
    version: account.version,
    ...totals,
    previousExpense: previous.amount,
    categories,
    topExpenses,
    chart,
    lastActivity: lastActivity ?? null,
  };
}
