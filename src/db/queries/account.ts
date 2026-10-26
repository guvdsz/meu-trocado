import "server-only";
import type { Database } from "@/db/types";
import type { UserIdentity } from "@/lib/auth";
import { requireConfigured } from "@/lib/preferences";
import { processRecurrences } from "@/db/mutations/recurrence-operations";
import { ensureAccount } from "./account-state";

export async function getAccount(
  db: Database,
  identity: UserIdentity,
  expectedSettingsVersion?: number,
) {
  const account = await ensureAccount(db, identity.userId);
  requireConfigured(account, expectedSettingsVersion);
  // Catch up after delayed/missed cron runs before reading or changing a balance.
  if (!account.hasDueRecurrences) return account;
  await processRecurrences(db, account.id, identity.userId);
  const updated = await ensureAccount(db, identity.userId);
  requireConfigured(updated, expectedSettingsVersion);
  return updated;
}
