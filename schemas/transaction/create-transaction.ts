import { z } from "zod";
import { positiveMoneySchema } from "@schemas/shared/money";
import { transactionCategorySchema } from "./category";
import { recurrenceFrequencies } from "@schemas/recurrence/frequency";

export const createTransactionSchema = z
  .object({
    expectedSettingsVersion: z.number().int().nonnegative().default(0),
    requestId: z.uuid({ message: "Identificador da operação inválido." }),
    type: z.enum(["income", "expense"], {
      message: "Selecione entrada ou saída.",
    }),
    amount: positiveMoneySchema,
    category: transactionCategorySchema,
    description: z
      .string()
      .trim()
      .min(1, "Informe uma descrição.")
      .max(160, "Use até 160 caracteres."),
    occurredOn: z.iso.date({ message: "Informe uma data válida." }),
    repeat: z.enum(["none", ...recurrenceFrequencies]).default("none"),
  })
  .refine((value) => value.repeat === "none" || value.type === "expense", {
    path: ["repeat"],
    message: "A repetição está disponível apenas para saídas.",
  });

export type CreateTransactionInput = z.input<typeof createTransactionSchema>;
export type CreateTransactionData = z.output<typeof createTransactionSchema>;
