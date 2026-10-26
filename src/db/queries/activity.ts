import { requireConfigured, accountPreferences } from "@/lib/preferences";
import { and, count, desc, eq, gte, lt, sql } from "drizzle-orm";
import type { Database } from "../types";
import { readSnapshot } from "../snapshot";
import { accounts, balanceAdjustments, transactions } from "../schema";
import { monthBounds } from "@/lib/financial";
import {
  HISTORY_PAGE_SIZE,
  type Activity,
  type HistoryFilters,
} from "./financial-types";

export function activityQuery(db: Database, accountId: string, userId: string) {
  const zone = db
    .select({ value: accounts.timeZone })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
  const entries = db
    .select({
      id: transactions.id,
      type: sql<Activity["type"]>`${transactions.type}::text`.as("type"),
      description: transactions.description,
      amount: sql<string>`${transactions.amount}::text`.as("amount"),
      day: sql<string>`${transactions.occurredOn}::text`.as("day"),
      createdAt: transactions.createdAt,
      newBalance: sql<string | null>`null::text`.as("new_balance"),
      category: sql<Activity["category"]>`${transactions.category}::text`.as(
        "category",
      ),
      recurrenceId: transactions.recurrenceId,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.accountId, accountId),
        eq(transactions.userId, userId),
      ),
    );
  const adjustments = db
    .select({
      id: balanceAdjustments.id,
      type: sql<Activity["type"]>`'adjustment'::text`.as("type"),
      description: sql<string>`${balanceAdjustments.reason}`.as("description"),
      amount:
        sql<string>`(${balanceAdjustments.newBalance} - ${balanceAdjustments.previousBalance})::text`.as(
          "amount",
        ),
      day: sql<string>`(${balanceAdjustments.createdAt} at time zone (${zone}))::date::text`.as(
        "day",
      ),
      createdAt: balanceAdjustments.createdAt,
      newBalance: sql<string | null>`${balanceAdjustments.newBalance}::text`.as(
        "new_balance",
      ),
      category: sql<Activity["category"]>`null::text`.as("category"),
      recurrenceId: sql<string | null>`null::uuid`.as("recurrence_id"),
    })
    .from(balanceAdjustments)
    .where(
      and(
        eq(balanceAdjustments.accountId, accountId),
        eq(balanceAdjustments.userId, userId),
      ),
    );
  // Cast matching union columns explicitly to avoid PostgreSQL enum/date coercion.
  return entries.unionAll(adjustments).as("activity");
}

export function activityFields(activity: ReturnType<typeof activityQuery>) {
  return {
    id: activity.id,
    type: activity.type,
    description: activity.description,
    amount: activity.amount,
    day: activity.day,
    newBalance: activity.newBalance,
    category: activity.category,
    recurrenceId: activity.recurrenceId,
  };
}

export async function readHistory(
  db: Database,
  accountId: string,
  userId: string,
  filters: HistoryFilters,
) {
  const [[account], [totals], rows] = await readSnapshot(db, (tx) => {
    const accountQuery = tx
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
    const activity = activityQuery(tx, accountId, userId);
    const { start, end } = monthBounds(filters.month);
    const where = and(
      gte(activity.day, start),
      lt(activity.day, end),
      filters.type === "all" ? undefined : eq(activity.type, filters.type),
      filters.category === "all"
        ? undefined
        : eq(activity.category, filters.category),
      // Literal substring search: '%' and '_' are not wildcard characters.
      sql`position(lower(${filters.query}) in lower(${activity.description})) > 0`,
    );
    const totalsQuery = tx
      .select({ total: count() })
      .from(activity)
      .where(where);
    const rowsQuery = tx
      .select(activityFields(activity))
      .from(activity)
      .where(where)
      .orderBy(desc(activity.day), desc(activity.createdAt), desc(activity.id))
      .limit(HISTORY_PAGE_SIZE)
      .offset((filters.page - 1) * HISTORY_PAGE_SIZE);
    return [accountQuery, totalsQuery, rowsQuery] as const;
  });
  requireConfigured(account);
  return {
    total: totals.total,
    activity: rows,
    account: {
      balance: account.balance,
      version: account.version,
      ...accountPreferences(account),
    },
  };
}
