import { getPreferences } from "@/db/queries/settings";
import { PreferencesProvider } from "./_components/preferences-context";
import { SettingsForm } from "./settings/_components/settings-form";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Loader from "@/app/_components/shared/loader";
import { AppShell } from "./_components/app-shell";

async function ProtectedContent({ children }: { children: React.ReactNode }) {
  const { userId, sessionId } = await auth();
  if (!userId) redirect("/auth/sign-in");
  await auth.protect();
  const [user, preferences] = await Promise.all([currentUser(), getPreferences()]);
  if (!user) redirect("/auth/sign-in");
  return (
    <PreferencesProvider preferences={preferences} key={preferences.settingsVersion}><AppShell
      initialSessionId={sessionId}
      name={user.firstName ?? "Minha conta"}
      email={user.primaryEmailAddress?.emailAddress ?? ""}
    >
      {preferences.configured ? children : <SettingsForm mandatory />}
    </AppShell></PreferencesProvider>
  );
}

export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<Loader />}>
      <ProtectedContent>{children}</ProtectedContent>
    </Suspense>
  );
}
