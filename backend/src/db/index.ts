import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Supabase/Postgres connection via postgres-js.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL (Postgres connection string) is required");
}

// Cache the client across Next.js hot-reloads / serverless invocations to avoid
// exhausting Postgres connections.
const globalForDb = globalThis as unknown as {
  client?: ReturnType<typeof postgres>;
};

// `prepare: false` is REQUIRED when connecting through the Supabase transaction
// pooler (port 6543) — prepared statements are unsupported in transaction mode.
const client =
  globalForDb.client ?? postgres(connectionString, { prepare: false });

if (process.env.NODE_ENV !== "production") {
  globalForDb.client = client;
}

export const db = drizzle(client, { schema });
