import { z } from "zod";
import { positiveMoneySchema } from "@schemas/shared/money";
import { transactionCategorySchema } from "./category";

export const createTransactionSchema = z.object({
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
});

export type CreateTransactionInput = z.input<typeof createTransactionSchema>;
export type CreateTransactionData = z.output<typeof createTransactionSchema>;
