import "server-only";
import { createHash } from "node:crypto";
import { withDatabase } from "@/db";
import { getAccount } from "@/db/queries/account";
import type { UserIdentity } from "@/lib/auth";
import type { CreateTransactionData } from "@schemas/transaction/create-transaction";
import type { UpdateRecurrenceData } from "@schemas/recurrence/manage";
import { insertRecurrence, updateRecurrence } from "./recurrence-operations";
import { databaseCode, FinanceConflict } from "./finance";

async function handleConflict(work: () => Promise<unknown>) {
  try {
    await work();
  } catch (error) {
    const code = databaseCode(error);
    if (["P0001", "P0002", "23505"].includes(code ?? ""))
      throw new FinanceConflict(
        "A recorrência mudou ou esta operação já foi usada. Atualize a página e tente novamente.",
      );
    if (["22003", "23514"].includes(code ?? ""))
      throw new FinanceConflict(
        "O valor ultrapassa o limite permitido para o saldo da carteira.",
      );
    if (code === "22007")
      throw new FinanceConflict(
        "Escolha hoje ou uma data futura para o primeiro lançamento.",
      );
    throw error;
  }
}

export async function createRecurringExpense(
  identity: UserIdentity,
  input: CreateTransactionData,
) {
  return withDatabase(async (db) => {
    const account = await getAccount(db, identity, input.expectedSettingsVersion);
    const hash = createHash("sha256")
      .update(
        JSON.stringify([
          input.type,
          input.amount,
          input.description,
          input.category,
          input.repeat,
          input.occurredOn,
        ]),
      )
      .digest("hex");
    await handleConflict(() =>
      insertRecurrence(db, account, input, hash),
    );
  });
}

export async function manageRecurringExpense(
  identity: UserIdentity,
  input: { id: string; expectedVersion: number; expectedSettingsVersion?: number },
  update?: UpdateRecurrenceData,
) {
  return withDatabase(async (db) => {
    const account = await getAccount(db, identity, input.expectedSettingsVersion);
    await handleConflict(() =>
      updateRecurrence(db, account, input, undefined, update),
    );
  });
}
