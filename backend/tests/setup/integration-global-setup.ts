import { execSync } from "node:child_process";
import path from "node:path";

/**
 * Vitest globalSetup for the integration harness.
 *
 * Pushes the CURRENT Drizzle schema into the test Postgres (via `drizzle-kit
 * push`) so integration tests exercise the real Postgres table shapes. Point
 * TEST_DATABASE_URL at a local/CI Postgres (e.g. a `postgres:16` service
 * container). `push` is idempotent; individual tests self-clean their rows.
 */
const BACKEND_ROOT = path.resolve(__dirname, "../..");
const TEST_DB_URL =
    process.env.TEST_DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres";

export default function setup() {
    execSync("npx drizzle-kit push --force --config=drizzle.config.test.ts", {
        cwd: BACKEND_ROOT,
        stdio: "inherit",
        env: { ...process.env, TEST_DATABASE_URL: TEST_DB_URL },
    });
    // No teardown: CI uses a fresh Postgres container and tests self-clean.
}
