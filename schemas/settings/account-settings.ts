import { z } from "zod";
import { currencies } from "@/lib/preferences";
import { validTimeZone } from "@/lib/date-time";

export const settingsSchema = z.object({
  requestId: z.uuid(),
  expectedSettingsVersion: z.number().int().nonnegative(),
  currency: z.enum(currencies),
  timeZone: z.string().max(100).refine(validTimeZone, "Selecione um fuso horário válido."),
  locale: z.enum(["pt-BR", "en-US"]),
  confirmReset: z.boolean().default(false),
});
export type SettingsInput = z.output<typeof settingsSchema>;
