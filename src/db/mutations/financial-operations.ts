import { PreferencesConflict, requireConfigured } from "@/lib/preferences";
import { localToday } from "@/lib/financial";
import { and, eq, ne, notExists, sql } from "drizzle-orm";
import type { Database } from "../types";
import {
  accounts,
  transactions,
  balanceAdjustments,
  recurringExpenses,
} from "../schema";
import type { CreateTransactionData } from "@schemas/transaction/create-transaction";
import type { AdjustBalanceData } from "@schemas/account/adjust-balance";

export type OwnedAccount = Pick<
  typeof accounts.$inferSelect,
  "id" | "userId" | "balance" | "version"
>;

export function insertTransaction(
  db: Database,
  account: OwnedAccount,
  input: Omit<CreateTransactionData, "repeat" | "expectedSettingsVersion"> & { expectedSettingsVersion?: number },
) {
  return db.transaction(async (tx) => {
    const [locked] = await tx.select().from(accounts).where(and(eq(accounts.id, account.id), eq(accounts.userId, account.userId))).for("update");
    requireConfigured(locked, input.expectedSettingsVersion ?? 0);
    if (input.occurredOn > localToday(new Date(), locked.timeZone)) throw new PreferencesConflict("A data não pode estar no futuro no fuso da sua carteira.");
    const delta = input.type === "income" ? input.amount : `-${input.amount}`;
    const [updated] = await tx
      .update(accounts)
      .set({
        balance: sql`${accounts.balance} + ${delta}::numeric`,
        version: sql`${accounts.version} + 1`,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(accounts.id, account.id),
          eq(accounts.userId, account.userId),
          eq(accounts.version, account.version),
          notExists(
            tx
              .select({ id: recurringExpenses.id })
              .from(recurringExpenses)
              .where(eq(recurringExpenses.requestId, input.requestId)),
          ),
        ),
      )
      .returning({ id: accounts.id });
    if (!updated) return [];
    return tx
      .insert(transactions)
      .values({
        accountId: account.id,
        userId: account.userId,
        requestId: input.requestId,
        type: input.type,
        category: input.category,
        amount: input.amount,
        description: input.description,
        occurredOn: input.occurredOn,
      })
      .returning({ id: transactions.id });
  });
}

export function updateBalance(
  db: Database,
  account: OwnedAccount,
  input: Omit<AdjustBalanceData, "expectedSettingsVersion"> & { expectedSettingsVersion?: number },
) {
  return db.transaction(async (tx) => {
    const [locked] = await tx.select().from(accounts).where(and(eq(accounts.id, account.id), eq(accounts.userId, account.userId))).for("update");
    requireConfigured(locked, input.expectedSettingsVersion ?? 0);
    const [updated] = await tx
      .update(accounts)
      .set({
        balance: input.balance,
        version: sql`${accounts.version} + 1`,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(accounts.id, account.id),
          eq(accounts.userId, account.userId),
          eq(accounts.version, input.expectedVersion),
          eq(accounts.balance, account.balance),
          ne(accounts.balance, input.balance),
        ),
      )
      .returning({ id: accounts.id });
    if (!updated) return [];
    return tx
      .insert(balanceAdjustments)
      .values({
        accountId: account.id,
        userId: account.userId,
        requestId: input.requestId,
        previousBalance: account.balance,
        newBalance: input.balance,
        reason: input.reason,
      })
      .returning({ id: balanceAdjustments.id });
  });
}
