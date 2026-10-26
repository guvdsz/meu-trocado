import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// HTTP handles independent queries/upserts; financial writes keep the WebSocket
// driver and its interactive transactions in withDatabase.
export function httpDatabase() {
  return drizzle({ client: neon(process.env.DATABASE_URL!) });
}

// Only read reports use this connection. No account creation or writes run here.
export function readOnlyDatabase() {
  return drizzle({
    client: neon(process.env.DATABASE_URL!, {
      isolationLevel: "RepeatableRead",
      readOnly: true,
    }),
  });
}
