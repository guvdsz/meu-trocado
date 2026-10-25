"use client";

import { createContext, useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import { defaultPreferences, type Preferences } from "@/lib/preferences";
import { formatDay, formatMoney, localToday } from "@/lib/financial";

const Context = createContext<Preferences>(defaultPreferences);
export function PreferencesProvider({ preferences, children }: { preferences: Preferences; children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    let today = localToday(new Date(), preferences.timeZone);
    const refresh = () => router.refresh();
    const storage = (event: StorageEvent) => { if (event.key === "finance-settings-changed") refresh(); };
    const timer = setInterval(() => {
      const next = localToday(new Date(), preferences.timeZone);
      if (today !== next) { today = next; refresh(); }
    }, 30000);
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", storage);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); window.removeEventListener("storage", storage); };
  }, [preferences.timeZone, router]);
  return <Context.Provider value={preferences}>{children}</Context.Provider>;
}
export function usePreferences() { return useContext(Context); }
export function useFinancialFormat() {
  const preferences = usePreferences();
  return {
    formatMoney: (value: string) => formatMoney(value, preferences.currency ?? "BRL", preferences.locale),
    formatDay: (value: string) => formatDay(value, preferences.locale),
  };
}
