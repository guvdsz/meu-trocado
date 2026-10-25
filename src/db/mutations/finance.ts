import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { balanceAdjustments, transactions } from "@/db/schema";
import { getAccount } from "@/db/queries/dashboard";
import type { GoogleIdentity } from "@/lib/auth";
import type { CreateTransactionData } from "@schemas/transaction/create-transaction";
import type { AdjustBalanceData } from "@schemas/account/adjust-balance";
import { adjustBalanceSql, createTransactionSql } from "./financial-sql";

export class FinanceConflict extends Error {}

function databaseCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  if ("code" in error && typeof error.code === "string") return error.code;
  return "cause" in error ? databaseCode(error.cause) : undefined;
}

export async function createTransaction(
  identity: GoogleIdentity,
  input: CreateTransactionData,
) {
  const findExisting = async () => {
    const [row] = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.requestId, input.requestId),
          eq(transactions.googleId, identity.googleId),
        ),
      )
      .limit(1);
    if (!row) return false;
    if (
      row.type !== input.type ||
      row.category !== input.category ||
      row.amount !== input.amount ||
      row.description !== input.description ||
      row.occurredOn !== input.occurredOn
    ) {
      throw new FinanceConflict(
        "Esta operação já foi usada com outros dados. Feche e abra o formulário novamente.",
      );
    }
    return true;
  };
  if (await findExisting()) return;
  for (let attempt = 0; attempt < 3; attempt++) {
    const account = await getAccount(identity);
    try {
      const rows = await db.execute(
        createTransactionSql(account, input),
        "objects",
      );
      if (rows.length) return;
    } catch (error) {
      if (databaseCode(error) === "23505" && (await findExisting())) return;
      if (["22003", "23514"].includes(databaseCode(error) ?? "")) {
        throw new FinanceConflict(
          "O valor ultrapassa o limite permitido para o saldo da carteira.",
        );
      }
      throw error;
    }
    if (await findExisting()) return;
  }
  throw new FinanceConflict(
    "O saldo foi atualizado em outra operação. Tente novamente.",
  );
}

export async function adjustBalance(
  identity: GoogleIdentity,
  input: AdjustBalanceData,
) {
  const findExisting = async () => {
    const [row] = await db
      .select()
      .from(balanceAdjustments)
      .where(
        and(
          eq(balanceAdjustments.requestId, input.requestId),
          eq(balanceAdjustments.googleId, identity.googleId),
        ),
      )
      .limit(1);
    if (!row) return false;
    if (row.newBalance !== input.balance || row.reason !== input.reason) {
      throw new FinanceConflict(
        "Esta operação já foi usada com outros dados. Feche e abra o formulário novamente.",
      );
    }
    return true;
  };
  if (await findExisting()) return;
  const account = await getAccount(identity);
  if (account.version !== input.expectedVersion)
    throw new FinanceConflict(
      "Seu saldo mudou. Atualize a página e confira o valor antes de ajustar.",
    );
  if (account.balance === input.balance) return;
  try {
    const rows = await db.execute(adjustBalanceSql(account, input), "objects");
    if (rows.length) return;
  } catch (error) {
    if (databaseCode(error) === "23505" && (await findExisting())) return;
    throw error;
  }
  if (await findExisting()) return;
  throw new FinanceConflict(
    "Seu saldo mudou. Atualize a página e confira o valor antes de ajustar.",
  );
}
