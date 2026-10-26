import { getPreferences } from "@/db/queries/settings";
import { SettingsForm } from "./_components/settings-form";

export default async function SettingsPage() {
  const preferences = await getPreferences();
  if (!preferences.configured) return null;
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
        <SettingsForm key={preferences.settingsVersion} />
      </section>
    </div>
  );
}
