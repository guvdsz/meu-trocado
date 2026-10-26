import "server-only";
import { cache } from "react";
import { httpDatabase } from "../http";
import { withDatabase } from "@/db";
import { ensureAccount } from "./account-state";
import { processRecurrences } from "../mutations/recurrence-operations";

// Deduplicated inside one server render/action, never cached across requests.
export const getRequestAccount = cache(async (userId: string) => {
  const db = httpDatabase();
  const account = await ensureAccount(db, userId);
  if (
    account.hasDueRecurrences &&
    account.currencyConfiguredAt &&
    account.currency
  ) {
    await withDatabase((tx) => processRecurrences(tx, account.id, userId));
    return ensureAccount(db, userId);
  }
  return account;
});
