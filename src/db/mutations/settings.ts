import { and, eq, sql } from "drizzle-orm";
import type { Database } from "../types";
import { accounts, transactions, recurringExpenses, balanceAdjustments, settingsRequests } from "../schema";
import { PreferencesConflict, accountPreferences } from "@/lib/preferences";
import { settingsSchema, type SettingsInput } from "@schemas/settings/account-settings";

async function hasFinancialData(db: Database, account: typeof accounts.$inferSelect) {
  if (account.balance !== "0.00") return true;
  for (const table of [transactions, recurringExpenses, balanceAdjustments]) {
    const rows = await db.select({ id: table.id }).from(table)
      .where(and(eq(table.accountId, account.id), eq(table.userId, account.userId)))
      .limit(1);
    if (rows.length) return true;
  }
  return false;
}

export async function readSettings(db: Database, userId: string, providedAccount?: typeof accounts.$inferSelect) {
  let account = providedAccount;
  if (!account) {
    const [existing] = await db.select().from(accounts).where(eq(accounts.userId, userId));
    account = existing;
    if (!account) {
      [account] = await db.insert(accounts).values({ userId }).onConflictDoNothing().returning();
      if (!account) [account] = await db.select().from(accounts).where(eq(accounts.userId, userId));
    }
  }
  if (!account) throw new PreferencesConflict();
  return { ...accountPreferences(account), hasFinancialData: account.currency === null && await hasFinancialData(db, account) };
}

export async function saveSettings(db: Database, userId: string, raw: SettingsInput) {
  const input = settingsSchema.parse(raw);
  return db.transaction(async tx => {
    const [account] = await tx.select().from(accounts).where(eq(accounts.userId, userId)).for("update");
    if (!account) throw new PreferencesConflict();
    const payload = JSON.stringify(input);
    const [existing] = await tx.select().from(settingsRequests).where(eq(settingsRequests.requestId, input.requestId));
    if (existing) {
      if (existing.userId !== userId || existing.accountId !== account.id || existing.payload !== payload) throw new PreferencesConflict();
      return accountPreferences(account);
    }
    if (account.settingsVersion !== input.expectedSettingsVersion) throw new PreferencesConflict();
    const changedCurrency = account.currency !== input.currency;
    const hasUnknownData = account.currency === null && await hasFinancialData(tx, account);
    const reset = changedCurrency && (account.currency !== null || hasUnknownData);
    if (reset && !input.confirmReset) throw new PreferencesConflict("Confirme a exclusão de entradas, saídas, ajustes e recorrências para trocar a moeda.");
    const owner = and(eq(transactions.accountId, account.id), eq(transactions.userId, userId));
    if (reset) {
      await tx.delete(transactions).where(owner);
      await tx.delete(balanceAdjustments).where(and(eq(balanceAdjustments.accountId, account.id), eq(balanceAdjustments.userId, userId)));
      await tx.delete(recurringExpenses).where(and(eq(recurringExpenses.accountId, account.id), eq(recurringExpenses.userId, userId)));
    }
    const changed = changedCurrency || !account.currencyConfiguredAt || account.timeZone !== input.timeZone || account.locale !== input.locale;
    const [updated] = await tx.update(accounts).set({
      currency: input.currency, currencyConfiguredAt: account.currencyConfiguredAt ?? new Date(),
      timeZone: input.timeZone, locale: input.locale,
      ...(reset ? { balance: "0.00", version: sql`${accounts.version} + 1` } : {}),
      ...(changed ? { settingsVersion: sql`${accounts.settingsVersion} + 1` } : {}),
      updatedAt: new Date(),
    }).where(and(eq(accounts.id, account.id), eq(accounts.userId, userId))).returning();
    await tx.insert(settingsRequests).values({ requestId: input.requestId, userId, accountId: account.id, payload });
    return accountPreferences(updated);
  });
}
