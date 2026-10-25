import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import type { GoogleIdentity } from "@/lib/auth";
import { dashboardSql, type DashboardSnapshot } from "./dashboard-sql";
export type { Activity, MonthlyTotal } from "./dashboard-sql";

export async function getAccount(identity: GoogleIdentity) {
  await db
    .insert(accounts)
    .values({ clerkUserId: identity.clerkUserId, googleId: identity.googleId })
    .onConflictDoNothing();
  const [account] = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.googleId, identity.googleId),
        eq(accounts.clerkUserId, identity.clerkUserId),
      ),
    )
    .limit(1);
  if (!account)
    throw new Error(
      "A conta Google vinculada à carteira é diferente da conta atual.",
    );
  return account;
}

export async function getDashboard(identity: GoogleIdentity, month: string) {
  const account = await getAccount(identity);
  // One statement gives the totals, chart and history a consistent database snapshot.
  const [result] = await db.execute<DashboardSnapshot>(
    dashboardSql(account.id, identity.googleId, month),
    "objects",
  );
  return {
    ...result,
    account: { balance: result.balance, version: result.version },
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboard>>;
