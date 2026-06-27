import { createClient } from "@libsql/client";
import { drizzle, LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import fs from "fs";
import path from "path";

// Check if we are running with Turso credentials
const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;

// Global caching for Next.js hot-reloads in development
const globalForDb = globalThis as unknown as {
  client: ReturnType<typeof createClient> | undefined;
  db: LibSQLDatabase<typeof schema> | undefined;
};

if (!globalForDb.client) {
  if (url && url.startsWith("libsql://")) {
    // Production / Turso Cloud
    globalForDb.client = createClient({
      url: url,
      authToken: authToken,
    });
  } else {
    // Local SQLite fallback
    const dataDir = path.join(process.cwd(), "data");
    if (process.env.VERCEL !== "1" && !fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // libsql client supports local file paths using file: protocol
    globalForDb.client = createClient({
      url: `file:${path.join(dataDir, "han-laptop.db")}`,
    });
  }
}

if (!globalForDb.db) {
  globalForDb.db = drizzle(globalForDb.client!, { schema });
}

export const db = globalForDb.db!;
