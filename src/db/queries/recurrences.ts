import { requireConfigured, accountPreferences } from "@/lib/preferences";
import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { withDatabase } from "@/db";
import { accounts, recurringExpenses } from "@/db/schema";
import { getAccount } from "./account";
import type { UserIdentity } from "@/lib/auth";
import type { RecurringExpense } from "@/lib/recurrence";

export async function getRecurrences(identity: UserIdentity) {
  return withDatabase(async (db) => {
    const account = await getAccount(db, identity);
    return db.transaction(async tx => {
    const [current] = await tx.select().from(accounts).where(eq(accounts.userId, identity.userId));
    requireConfigured(current);
    const rows = await tx
      .select({
        id: recurringExpenses.id,
        description: recurringExpenses.description,
        amount: recurringExpenses.amount,
        category: recurringExpenses.category,
        frequency: recurringExpenses.frequency,
        startsOn: recurringExpenses.startsOn,
        nextDueOn: recurringExpenses.nextDueOn,
        version: recurringExpenses.version,
        endedAt: recurringExpenses.endedAt,
      })
      .from(recurringExpenses)
      .where(
        and(
          eq(recurringExpenses.accountId, account.id),
          eq(recurringExpenses.userId, identity.userId),
          isNull(recurringExpenses.endedAt),
        ),
      )
      .orderBy(asc(recurringExpenses.nextDueOn), asc(recurringExpenses.id));
    const recurrences: RecurringExpense[] = rows.map((row) => ({
      ...row,
      endedAt: row.endedAt?.toISOString() ?? null,
    }));
    return {
      account: { balance: current.balance, version: current.version, ...accountPreferences(current) },
      recurrences,
    };
    }, { isolationLevel: "repeatable read", accessMode: "read only" });
  });
}
