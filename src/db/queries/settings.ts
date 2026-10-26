import "server-only";
import { cache } from "react";
import { httpDatabase } from "@/db/http";
import { requireIdentity } from "@/lib/auth";
import { readSettings } from "../mutations/settings";
import { getRequestAccount } from "./request-account";

export const getPreferences = cache(async () => {
  const identity = await requireIdentity();
  const account = await getRequestAccount(identity.userId);
  return readSettings(httpDatabase(), identity.userId, account);
});
