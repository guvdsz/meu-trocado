"use server";

import { PreferencesConflict } from "@/lib/preferences";

import { revalidatePath } from "next/cache";
import {
  endRecurrenceSchema,
  updateRecurrenceSchema,
} from "@schemas/recurrence/manage";
import { IdentityError, requireIdentity } from "@/lib/auth";
import { manageRecurringExpense } from "@/db/mutations/recurrences";
import { FinanceConflict } from "@/db/mutations/finance";
import type { ActionResult } from "@/lib/action-result";

async function manage(payload: unknown, end: boolean): Promise<ActionResult> {
  try {
    const identity = await requireIdentity();
    if (end) {
      const input = endRecurrenceSchema.safeParse(payload);
      if (!input.success)
        return { success: false, message: "Confira os dados da recorrência." };
      await manageRecurringExpense(identity, input.data);
    } else {
      const input = updateRecurrenceSchema.safeParse(payload);
      if (!input.success)
        return {
          success: false,
          message: "Confira o valor, a descrição e a categoria.",
        };
      await manageRecurringExpense(identity, input.data, input.data);
    }
  } catch (error) {
    if (error instanceof IdentityError || error instanceof FinanceConflict || error instanceof PreferencesConflict)
      return { success: false, message: error.message, code: "conflict" };
    return {
      success: false,
      message: "Não foi possível salvar. Tente novamente.",
    };
  }
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/recurrences");
  return { success: true };
}

export async function endRecurrenceAction(payload: unknown) {
  return manage(payload, true);
}
export async function updateRecurrenceAction(payload: unknown) {
  return manage(payload, false);
}
