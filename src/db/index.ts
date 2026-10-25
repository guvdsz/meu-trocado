import { Client } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import type { Database } from "./types";

// Close request-scoped connections before a serverless invocation ends.
export async function withDatabase<T>(work: (db: Database) => Promise<T>) {
  const client = new Client({ connectionString: process.env.DATABASE_URL! });
  try {
    await client.connect();
    return await work(drizzle({ client }));
  } finally {
    await client.end();
  }
}
