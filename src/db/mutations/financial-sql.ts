import { sql } from "drizzle-orm";
import type { CreateTransactionData } from "@schemas/transaction/create-transaction";
import type { AdjustBalanceData } from "@schemas/account/adjust-balance";

export type OwnedAccount = {
  id: string;
  googleId: string;
  clerkUserId: string;
  balance: string;
  version: number;
};

export function createTransactionSql(
  account: OwnedAccount,
  input: CreateTransactionData,
) {
  const delta = input.type === "income" ? input.amount : `-${input.amount}`;
  return sql`
        with updated_account as (
            update accounts set balance = balance + ${delta}::numeric,
                version = version + 1, updated_at = now()
            where id = ${account.id}::uuid and google_id = ${account.googleId}
                and clerk_user_id = ${account.clerkUserId} and version = ${account.version}
            returning id, google_id
        )
        insert into transactions (account_id, google_id, request_id, type, category, amount, description, occurred_on)
        select id, google_id, ${input.requestId}::uuid, ${input.type}::transaction_type,
            ${input.category}::transaction_category, ${input.amount}::numeric, ${input.description}, ${input.occurredOn}::date
        from updated_account returning id
    `;
}

export function adjustBalanceSql(
  account: OwnedAccount,
  input: AdjustBalanceData,
) {
  return sql`
        with updated_account as (
            update accounts set balance = ${input.balance}::numeric,
                version = version + 1, updated_at = now()
            where id = ${account.id}::uuid and google_id = ${account.googleId}
                and clerk_user_id = ${account.clerkUserId} and version = ${input.expectedVersion}
                and balance = ${account.balance}::numeric and balance <> ${input.balance}::numeric
            returning id, google_id
        )
        insert into balance_adjustments (account_id, google_id, request_id, previous_balance, new_balance, reason)
        select id, google_id, ${input.requestId}::uuid, ${account.balance}::numeric,
            ${input.balance}::numeric, ${input.reason}
        from updated_account returning id
    `;
}
