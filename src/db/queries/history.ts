import "server-only";
import { readOnlyDatabase } from "@/db/http";
import type { UserIdentity } from "@/lib/auth";
import { getRequestAccount } from "./request-account";
import { requireConfigured } from "@/lib/preferences";
import { readHistory } from "./activity";
import type { HistoryFilters } from "./financial-types";

export async function getHistory(
  identity: UserIdentity,
  filters: HistoryFilters,
) {
  const account = await getRequestAccount(identity.userId);
  requireConfigured(account);
  return readHistory(readOnlyDatabase(), account.id, identity.userId, filters);
}

export type HistoryData = Awaited<ReturnType<typeof getHistory>>;
