"use server";

import { PreferencesConflict } from "@/lib/preferences";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createTransactionSchema } from "@schemas/transaction/create-transaction";
import { IdentityError, requireIdentity } from "@/lib/auth";
import { createTransaction, FinanceConflict } from "@/db/mutations/finance";
import type { ActionResult } from "@/lib/action-result";
import { createRecurringExpense } from "@/db/mutations/recurrences";

export async function createTransactionAction(
  payload: unknown,
): Promise<ActionResult> {
  try {
    const identity = await requireIdentity();
    const parsed = createTransactionSchema.safeParse(payload);
    if (!parsed.success)
      return {
        success: false,
        message: "Confira os campos informados.",
        fieldErrors: z.flattenError(parsed.error).fieldErrors,
      };
    if (parsed.data.repeat !== "none") {
      await createRecurringExpense(identity, parsed.data);
    } else {
      await createTransaction(identity, parsed.data);
    }
  } catch (error) {
    if (error instanceof IdentityError || error instanceof FinanceConflict || error instanceof PreferencesConflict)
      return { success: false, message: error.message };
    return {
      success: false,
      message:
        "Não foi possível salvar agora. Seus dados continuam no formulário; tente novamente.",
    };
  }
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/recurrences");
  return { success: true };
}
