import { randomUUID } from "node:crypto";
import { and, asc, eq, gt, isNull, lte, sql } from "drizzle-orm";
import type { Database } from "../types";
import { accounts, recurringExpenses, transactions } from "../schema";
import type { OwnedAccount } from "./financial-operations";
import type { CreateTransactionData } from "@schemas/transaction/create-transaction";
import type { UpdateRecurrenceData } from "@schemas/recurrence/manage";
import { recurrenceDate } from "@/lib/recurrence";
import { requireConfigured } from "@/lib/preferences";
import { localToday } from "@/lib/financial";
import { fromCents, toCents } from "@/lib/financial";

class RecurrenceConflict extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
  }
}

async function lockAccount(tx: Database, accountId: string, userId: string) {
  const [account] = await tx
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .for("update");
  if (!account) throw new RecurrenceConflict("Account not found", "P0002");
  return account;
}

// Caller holds the account lock. Every financial writer locks the account first,
// so cron, manual entries and recurrence edits cannot overwrite each other.
async function processDue(
  tx: Database,
  accountId: string,
  userId: string,
  today: string,
) {
  const rules = await tx
    .select()
    .from(recurringExpenses)
    .where(
      and(
        eq(recurringExpenses.accountId, accountId),
        eq(recurringExpenses.userId, userId),
        isNull(recurringExpenses.endedAt),
        lte(recurringExpenses.nextDueOn, today),
      ),
    )
    .orderBy(asc(recurringExpenses.id))
    .for("update");
  let generated = 0;
  let debit = BigInt(0);
  for (const rule of rules) {
    let due = rule.nextDueOn;
    let occurrence = rule.nextOccurrence;
    const occurrences: (typeof transactions.$inferInsert)[] = [];
    while (due <= today) {
      occurrences.push({
        accountId,
        userId,
        requestId: occurrence === 0 ? rule.requestId : randomUUID(),
        type: "expense",
        category: rule.category,
        amount: rule.amount,
        description: rule.description,
        occurredOn: due,
        recurrenceId: rule.id,
      });
      occurrence++;
      due = recurrenceDate(rule.startsOn, rule.frequency, occurrence);
    }
    // Catch up in bounded batches instead of a network round trip per charge.
    for (let offset = 0; offset < occurrences.length; offset += 500) {
      const inserted = await tx
        .insert(transactions)
        .values(occurrences.slice(offset, offset + 500))
        .onConflictDoNothing({
          target: [transactions.recurrenceId, transactions.occurredOn],
        })
        .returning({ amount: transactions.amount });
      generated += inserted.length;
      for (const row of inserted) debit += toCents(row.amount);
    }
    await tx
      .update(recurringExpenses)
      .set({
        nextDueOn: due,
        nextOccurrence: occurrence,
        version: sql`${recurringExpenses.version} + 1`,
        updatedAt: sql`now()`,
      })
      .where(eq(recurringExpenses.id, rule.id));
  }
  if (generated)
    await tx
      .update(accounts)
      .set({
        balance: sql`${accounts.balance} - ${fromCents(debit)}::numeric`,
        version: sql`${accounts.version} + 1`,
        updatedAt: sql`now()`,
      })
      .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
  return generated;
}

export function processRecurrences(
  db: Database,
  accountId: string,
  userId: string,
  now?: string | Date,
) {
  return db.transaction(async (tx) => {
    const account = await lockAccount(tx, accountId, userId);
    if (!account.currencyConfiguredAt || !account.currency) return 0;
    const today = typeof now === "string" ? now : localToday(now ?? new Date(), account.timeZone);
    return processDue(tx, accountId, userId, today);
  });
}

export function insertRecurrence(
  db: Database,
  account: OwnedAccount,
  input: CreateTransactionData,
  hash: string,
  now?: string | Date,
) {
  return db.transaction(async (tx) => {
    const locked = await lockAccount(tx, account.id, account.userId);
    requireConfigured(locked, input.expectedSettingsVersion);
    const today = typeof now === "string" ? now : localToday(now ?? new Date(), locked.timeZone);
    const [existing] = await tx
      .select()
      .from(recurringExpenses)
      .where(eq(recurringExpenses.requestId, input.requestId));
    if (existing) {
      if (
        existing.accountId !== account.id ||
        existing.userId !== account.userId ||
        existing.creationHash !== hash
      )
        throw new RecurrenceConflict("Request already used", "P0001");
      return existing.id;
    }
    const [used] = await tx
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.requestId, input.requestId));
    if (used) throw new RecurrenceConflict("Request already used", "P0001");
    if (input.occurredOn < today || input.occurredOn > "2099-12-31")
      throw new RecurrenceConflict("Invalid start date", "22007");
    if (input.repeat === "none" || input.type !== "expense")
      throw new RecurrenceConflict("Invalid recurrence", "P0001");
    const [rule] = await tx
      .insert(recurringExpenses)
      .values({
        accountId: account.id,
        userId: account.userId,
        requestId: input.requestId,
        creationHash: hash,
        description: input.description,
        amount: input.amount,
        category: input.category,
        frequency: input.repeat,
        startsOn: input.occurredOn,
        nextDueOn: input.occurredOn,
      })
      .returning({ id: recurringExpenses.id });
    await tx
      .update(accounts)
      .set({ version: sql`${accounts.version} + 1`, updatedAt: sql`now()` })
      .where(eq(accounts.id, account.id));
    await processDue(tx, account.id, account.userId, today);
    return rule.id;
  });
}

export function updateRecurrence(
  db: Database,
  account: OwnedAccount,
  input: { id: string; expectedVersion: number; expectedSettingsVersion?: number },
  now: string | Date | undefined,
  update?: UpdateRecurrenceData,
) {
  return db.transaction(async (tx) => {
    const locked = await lockAccount(tx, account.id, account.userId);
    requireConfigured(locked, input.expectedSettingsVersion ?? 0);
    const today = typeof now === "string" ? now : localToday(now ?? new Date(), locked.timeZone);
    const [rule] = await tx
      .select()
      .from(recurringExpenses)
      .where(
        and(
          eq(recurringExpenses.id, input.id),
          eq(recurringExpenses.accountId, account.id),
          eq(recurringExpenses.userId, account.userId),
        ),
      )
      .for("update");
    if (!rule) throw new RecurrenceConflict("Recurrence not found", "P0002");
    if (!update && rule.endedAt) return;
    if (rule.endedAt || rule.version !== input.expectedVersion)
      throw new RecurrenceConflict("Recurrence changed", "P0001");
    // Overdue occurrences retain the old terms, including when ending a rule.
    await processDue(tx, account.id, account.userId, today);
    await tx
      .update(recurringExpenses)
      .set({
        ...(update
          ? {
              description: update.description,
              amount: update.amount,
              category: update.category,
            }
          : { endedAt: sql`now()` }),
        version: sql`${recurringExpenses.version} + 1`,
        updatedAt: sql`now()`,
      })
      .where(eq(recurringExpenses.id, input.id));
    await tx
      .update(accounts)
      .set({ version: sql`${accounts.version} + 1`, updatedAt: sql`now()` })
      .where(eq(accounts.id, account.id));
  });
}

export function dueAccounts(db: Database, today: string | Date, cursor: string) {
  return db
    .selectDistinct({
      accountId: recurringExpenses.accountId,
      userId: recurringExpenses.userId,
    })
    .from(recurringExpenses)
    .innerJoin(accounts, eq(accounts.id, recurringExpenses.accountId))
    .where(
      and(
        sql`${accounts.currencyConfiguredAt} is not null`,
        isNull(recurringExpenses.endedAt),
        typeof today === "string" ? lte(recurringExpenses.nextDueOn, today) : sql`${recurringExpenses.nextDueOn} <= (${today.toISOString()}::timestamptz at time zone ${accounts.timeZone})::date`,
        gt(recurringExpenses.accountId, cursor),
      ),
    )
    .orderBy(asc(recurringExpenses.accountId))
    .limit(20);
}
