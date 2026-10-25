import "server-only";
import { db } from "@/db";
import type { GoogleIdentity } from "@/lib/auth";
import type { Activity } from "./dashboard-sql";
import { getAccount } from "./dashboard";
import { historySql, type HistoryFilters } from "./history-sql";

export async function getHistory(
  identity: GoogleIdentity,
  filters: HistoryFilters,
) {
  const account = await getAccount(identity);
  const [result] = await db.execute<{ total: number; activity: Activity[] }>(
    historySql(account.id, identity.googleId, filters),
    "objects",
  );
  return {
    ...result,
    account: { balance: account.balance, version: account.version },
  };
}

export type HistoryData = Awaited<ReturnType<typeof getHistory>>;
