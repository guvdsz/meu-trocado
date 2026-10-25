import { z } from "zod";
import { positiveMoneySchema } from "@schemas/shared/money";
import { transactionCategorySchema } from "@schemas/transaction/category";

export const endRecurrenceSchema = z.object({
  expectedSettingsVersion: z.number().int().nonnegative().default(0),
  id: z.uuid(),
  expectedVersion: z.number().int().nonnegative(),
});
export const updateRecurrenceSchema = endRecurrenceSchema.extend({
  amount: positiveMoneySchema,
  description: z
    .string()
    .trim()
    .min(1, "Informe uma descrição.")
    .max(160, "Use até 160 caracteres."),
  category: transactionCategorySchema,
});
export type UpdateRecurrenceData = z.output<typeof updateRecurrenceSchema>;
export type UpdateRecurrenceInput = z.input<typeof updateRecurrenceSchema>;
