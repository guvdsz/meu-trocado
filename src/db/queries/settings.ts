import "server-only";
import { cache } from "react";
import { withDatabase } from "@/db";
import { requireUser } from "@/lib/auth";
import { readSettings } from "../mutations/settings";

export const getPreferences = cache(async () => {
  const identity = await requireUser();
  return withDatabase(db => readSettings(db, identity.userId));
});
