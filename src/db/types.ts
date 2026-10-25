import type { PgAsyncDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

// Shared by Neon in production and PostgreSQL persistence tests.
export type Database = PgAsyncDatabase<PgQueryResultHKT>;
