import type { Database } from "../types";
import { users } from "../schema";
import { eq } from "drizzle-orm";

export async function resolveUser(db: Database, providerId: string) {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.providerId, providerId))
    .limit(1);
  if (existing.length) return existing;
  return db
    .insert(users)
    .values({ providerId })
    .onConflictDoUpdate({
      target: users.providerId,
      set: { providerId },
    })
    .returning({ id: users.id });
}
