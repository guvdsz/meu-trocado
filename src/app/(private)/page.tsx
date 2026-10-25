import { PreferencesProvider } from "@/app/(private)/_components/preferences-context";
import { getPreferences } from "@/db/queries/settings";
import { Suspense } from "react";
import { requireUser, IdentityError } from "@/lib/auth";
import { localToday, resolveMonth } from "@/lib/financial";
import { getDashboard } from "@/db/queries/dashboard";
import { Dashboard } from "./_components/dashboard";
import { PageSkeleton } from "./_components/data-skeleton";
import { UnavailableState } from "@/app/_components/shared/unavailable-state";
import { connection } from "next/server";

async function DashboardContent({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  // The current day must be computed for this request, outside the static shell.
  await connection();
  const preferences = await getPreferences();
  if (!preferences.configured) return null;
  const params = await searchParams;
  const today = localToday(new Date(), preferences.timeZone);
  const month = resolveMonth(params.month, today);
  const result = await (async () => {
    try {
      const identity = await requireUser();
      const data = await getDashboard(identity, month);
      return { identity, data };
    } catch (error) {
      return { message: error instanceof IdentityError ? error.message : null };
    }
  })();
  if ("data" in result && result.data && result.identity)
    return (
      <PreferencesProvider preferences={result.data.account}><Dashboard
        data={result.data}
        name={result.identity.name}
        today={today}
        month={month}
      /></PreferencesProvider>
    );
  return (
    <UnavailableState
      title={
        result.message
          ? "Verifique seu acesso"
          : "Não foi possível carregar seu resumo"
      }
      description={result.message ?? undefined}
    />
  );
}

export default function Page(props: {
  searchParams: Promise<{ month?: string }>;
}) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DashboardContent {...props} />
    </Suspense>
  );
}
