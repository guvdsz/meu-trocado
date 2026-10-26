import {
  and,
  eq,
  exists,
  getTableColumns,
  isNull,
  lte,
  sql,
} from "drizzle-orm";
import { accounts, recurringExpenses } from "../schema";
import type { Database } from "../types";

export function findAccount(db: Database, userId: string) {
  return db
    .select({
      ...getTableColumns(accounts),
      hasDueRecurrences: exists(
        db
          .select({ id: recurringExpenses.id })
          .from(recurringExpenses)
          .where(
            and(
              eq(recurringExpenses.accountId, accounts.id),
              eq(recurringExpenses.userId, accounts.userId),
              isNull(recurringExpenses.endedAt),
              lte(
                recurringExpenses.nextDueOn,
                sql`(now() at time zone ${accounts.timeZone})::date`,
              ),
            ),
          ),
      ),
    })
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .limit(1);
}

export async function ensureAccount(db: Database, userId: string) {
  const [existing] = await findAccount(db, userId);
  if (existing) return existing;
  await db.insert(accounts).values({ userId }).onConflictDoNothing();
  const [created] = await findAccount(db, userId);
  if (!created)
    throw new Error("Não foi possível encontrar a carteira deste usuário.");
  return created;
}
