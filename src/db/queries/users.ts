import type { Database } from "../types";
import { users } from "../schema";

export function resolveUser(db: Database, providerId: string) {
  return db
    .insert(users)
    .values({ providerId })
    .onConflictDoUpdate({
      target: users.providerId,
      set: { providerId },
    })
    .returning({ id: users.id });
}
