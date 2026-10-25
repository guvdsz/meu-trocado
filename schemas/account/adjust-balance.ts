import { z } from "zod";
import { moneySchema } from "@schemas/shared/money";

export const adjustBalanceSchema = z.object({
  requestId: z.uuid({ message: "Identificador da operação inválido." }),
  balance: moneySchema,
  reason: z
    .string()
    .trim()
    .min(1, "Informe o motivo do ajuste.")
    .max(240, "Use até 240 caracteres."),
  // A stale form must not overwrite income or expenses submitted in another tab.
  expectedVersion: z.number().int().min(0).max(2_147_483_646),
});

export type AdjustBalanceInput = z.input<typeof adjustBalanceSchema>;
export type AdjustBalanceData = z.output<typeof adjustBalanceSchema>;
