import "server-only";
import { readOnlyDatabase } from "@/db/http";
import type { UserIdentity } from "@/lib/auth";
import { readDashboard } from "./overview";
export type { Activity, MonthlyTotal } from "./financial-types";

import { getRequestAccount } from "./request-account";
import { requireConfigured } from "@/lib/preferences";

export async function getDashboard(identity: UserIdentity, month: string) {
  const account = await getRequestAccount(identity.userId);
  requireConfigured(account);
  const result = await readDashboard(
    readOnlyDatabase(),
    account.id,
    identity.userId,
    month,
  );
  return {
    ...result,
    account: {
      balance: result.balance,
      version: result.version,
      ...result.preferences,
    },
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboard>>;
