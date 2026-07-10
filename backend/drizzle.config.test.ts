import { defineConfig } from "drizzle-kit";

/**
 * Drizzle config used ONLY by the Vitest integration harness.
 * Targets a local throwaway SQLite file (dialect "sqlite", not "turso") so the
 * current schema can be pushed offline without Turso credentials.
 */
export default defineConfig({
    schema: "./src/db/schema.ts",
    out: "./drizzle",
    dialect: "sqlite",
    dbCredentials: {
        url: process.env.TEST_DATABASE_FILE || "file:./data/vitest.db",
    },
});
