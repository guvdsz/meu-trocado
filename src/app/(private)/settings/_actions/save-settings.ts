"use server";

import { revalidatePath } from "next/cache";
import { requireIdentity } from "@/lib/auth";
import { withDatabase } from "@/db";
import { saveSettings } from "@/db/mutations/settings";
import { settingsSchema } from "@schemas/settings/account-settings";
import { PreferencesConflict } from "@/lib/preferences";

export async function saveSettingsAction(payload: unknown) {
  const identity = await requireIdentity();
  const parsed = settingsSchema.safeParse(payload);
  if (!parsed.success) return { success: false, message: "Confira a moeda, o fuso e o formato selecionados." };
  try {
    await withDatabase(db => saveSettings(db, identity.userId, parsed.data));
  } catch (error) {
    return { success: false, message: error instanceof PreferencesConflict ? error.message : "Não foi possível salvar. Seus dados foram preservados; tente novamente." };
  }
  for (const path of ["/", "/transactions", "/recurrences", "/settings"]) revalidatePath(path);
  return { success: true, message: "Configurações salvas." };
}
