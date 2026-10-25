import "server-only";
import { withDatabase } from "@/db";
import type { UserIdentity } from "@/lib/auth";
import { getAccount } from "./account";
import { readHistory } from "./activity";
import type { HistoryFilters } from "./financial-types";

export async function getHistory(
  identity: UserIdentity,
  filters: HistoryFilters,
) {
  return withDatabase(async (db) => {
    const account = await getAccount(db, identity);
    return readHistory(db, account.id, identity.userId, filters);
  });
}

export type HistoryData = Awaited<ReturnType<typeof getHistory>>;
