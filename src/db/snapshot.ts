import type { BatchItem, BatchResponse } from "drizzle-orm/batch";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import type { Database } from "./types";

type Queries = readonly [BatchItem<"pg">, ...BatchItem<"pg">[]];

/** Reports use readOnlyDatabase in production; PostgreSQL tests use the same queries. */
export async function readSnapshot<T extends Queries>(
  db: Database,
  build: (db: Database) => T,
): Promise<BatchResponse<T>> {
  if ("batch" in db && typeof db.batch === "function") {
    return (db as NeonHttpDatabase).batch(build(db));
  }
  return db.transaction(
    async (tx) => {
      const results: unknown[] = [];
      for (const query of build(tx)) results.push(await query);
      return results as BatchResponse<T>;
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}
