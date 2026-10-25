import "server-only";
import { withDatabase } from "@/db";
import type { UserIdentity } from "@/lib/auth";
import { readDashboard } from "./overview";
export type { Activity, MonthlyTotal } from "./financial-types";

import { getAccount } from "./account";

export async function getDashboard(identity: UserIdentity, month: string) {
  return withDatabase(async (db) => {
    const account = await getAccount(db, identity);
    const result = await readDashboard(db, account.id, identity.userId, month);
    return {
      ...result,
      account: { balance: result.balance, version: result.version, ...result.preferences },
    };
  });
}

export type DashboardData = Awaited<ReturnType<typeof getDashboard>>;
