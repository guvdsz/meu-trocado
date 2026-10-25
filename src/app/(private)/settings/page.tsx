import { Suspense } from "react";
import { Skeleton } from "@/app/_components/ui/skeleton";
import { getPreferences } from "@/db/queries/settings";
import { SettingsForm } from "./_components/settings-form";

async function SettingsContent() {
  const preferences = await getPreferences();
  if (!preferences.configured) return null;
  return <SettingsForm key={preferences.settingsVersion} />;
}

function SettingsSkeleton() {
  return (
    <div role="status" aria-label="Carregando configurações">
      <span className="sr-only">Carregando configurações…</span>
      <div className="grid gap-5" aria-hidden="true">
        {["currency", "time-zone", "locale"].map((field) => (
          <div className="grid gap-2" key={field}>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ))}
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="grid w-full min-w-0 gap-6">
      <div>
        <h1 className="text-3xl font-semibold">Configurações</h1>
        <p className="mt-2 text-muted-foreground">
          Preferências financeiras e formato de exibição
        </p>
      </div>
      <section className="w-full min-w-0 rounded-2xl border bg-white p-4 sm:p-6">
        <h2 className="mb-5 text-lg font-semibold">Moeda e região</h2>
        <Suspense fallback={<SettingsSkeleton />}>
          <SettingsContent />
        </Suspense>
      </section>
    </div>
  );
}
