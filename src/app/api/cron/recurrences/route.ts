import { revalidatePath } from "next/cache";
import { withDatabase } from "@/db";
import {
  dueAccounts,
  processRecurrences,
} from "@/db/mutations/recurrence-operations";
import { isCronAuthorized } from "@/lib/cron-auth";

export const maxDuration = 60;

export async function GET(request: Request) {
  if (
    !isCronAuthorized(
      request.headers.get("authorization"),
      process.env.CRON_SECRET,
    )
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const started = performance.now();
  let cursor = "00000000-0000-0000-0000-000000000000";
  let generated = 0;
  let failures = 0;
  let complete = false;
  await withDatabase(async (db) => {
    while (performance.now() - started < 45_000) {
      const rows = await dueAccounts(db, new Date(), cursor);
      if (!rows.length) {
        complete = true;
        break;
      }
      for (const row of rows) {
        if (performance.now() - started >= 45_000) break;
        cursor = row.accountId;
        try {
          generated += await processRecurrences(
            db,
            row.accountId,
            row.userId,
          );
        } catch {
          // Don't expose financial details or provider queries in cron logs.
          failures++;
          console.error("Recurring expense processing failed for one account.");
        }
      }
    }
  });
  if (generated) {
    revalidatePath("/");
    revalidatePath("/transactions");
    revalidatePath("/recurrences");
  }
  return Response.json(
    { generated, failures, complete },
    {
      status: failures || !complete ? 503 : 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
