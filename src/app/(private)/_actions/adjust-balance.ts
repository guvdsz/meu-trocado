"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adjustBalanceSchema } from "@schemas/account/adjust-balance";
import { IdentityError, requireGoogleIdentity } from "@/lib/auth";
import { adjustBalance, FinanceConflict } from "@/db/mutations/finance";
import type { ActionResult } from "@/lib/action-result";

export async function adjustBalanceAction(
  payload: unknown,
): Promise<ActionResult> {
  try {
    const identity = await requireGoogleIdentity();
    const parsed = adjustBalanceSchema.safeParse(payload);
    if (!parsed.success)
      return {
        success: false,
        message: "Confira os campos informados.",
        fieldErrors: z.flattenError(parsed.error).fieldErrors,
      };
    await adjustBalance(identity, parsed.data);
  } catch (error) {
    if (error instanceof FinanceConflict)
      return { success: false, message: error.message, code: "conflict" };
    if (error instanceof IdentityError)
      return { success: false, message: error.message };
    return {
      success: false,
      message: "Não foi possível ajustar agora. Tente novamente.",
    };
  }
  revalidatePath("/");
  revalidatePath("/transactions");
  return { success: true };
}
