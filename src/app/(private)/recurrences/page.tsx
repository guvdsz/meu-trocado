import { PreferencesProvider } from "@/app/(private)/_components/preferences-context";
import { getPreferences } from "@/db/queries/settings";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { localToday } from "@/lib/financial";
import { getRecurrences } from "@/db/queries/recurrences";
import { RecurrencesScreen } from "./_components/recurrences-screen";

export default async function RecurrencesPage() {
  await connection();
  const preferences = await getPreferences();
  if (!preferences.configured) return null;
  const identity = await requireUser();
  const data = await getRecurrences(identity);
  return <PreferencesProvider preferences={data.account}><RecurrencesScreen {...data} today={localToday(new Date(), data.account.timeZone)} /></PreferencesProvider>;
}
