import "server-only";
import { eq } from "drizzle-orm";
import type { Database } from "@/db/types";
import { accounts } from "@/db/schema";
import type { UserIdentity } from "@/lib/auth";
import { requireConfigured } from "@/lib/preferences";
import { processRecurrences } from "@/db/mutations/recurrence-operations";

export async function getAccount(db: Database, identity: UserIdentity, expectedSettingsVersion?: number) {
  await db
    .insert(accounts)
    .values({ userId: identity.userId })
    .onConflictDoNothing();
  const owner = eq(accounts.userId, identity.userId);
  const [account] = await db.select().from(accounts).where(owner).limit(1);
  if (!account)
    throw new Error("Não foi possível encontrar a carteira deste usuário.");
  requireConfigured(account, expectedSettingsVersion);
  // Catch up after delayed/missed cron runs before reading or changing a balance.
  const generated = await processRecurrences(
    db,
    account.id,
    identity.userId,
  );
  if (!generated) return account;
  const [updated] = await db.select().from(accounts).where(owner).limit(1);
  return updated;
}
