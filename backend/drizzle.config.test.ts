import { defineConfig } from "drizzle-kit";

/**
 * Drizzle config used ONLY by the Vitest integration harness.
 * Targets a local/CI Postgres (NOT Supabase prod) so the current schema can be
 * pushed for integration tests. Set TEST_DATABASE_URL to point at it.
 */
export default defineConfig({
    schema: "./src/db/schema.ts",
    out: "./drizzle",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.TEST_DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres",
    },
});
