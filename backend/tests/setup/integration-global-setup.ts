import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * Vitest globalSetup for the integration harness.
 *
 * Builds a throwaway SQLite database from the CURRENT Drizzle schema (via
 * `drizzle-kit push`, dialect sqlite) so integration tests exercise the real
 * table shapes — no stale migration, no Turso credentials, fully offline.
 * The file is created fresh before the suite and removed afterwards.
 */
const BACKEND_ROOT = path.resolve(__dirname, "../..");
const DB_FILE = path.join(BACKEND_ROOT, "data", "vitest.db");
const SIDECARS = [DB_FILE, `${DB_FILE}-shm`, `${DB_FILE}-wal`];

function removeDbFiles() {
    for (const f of SIDECARS) {
        try {
            if (fs.existsSync(f)) fs.rmSync(f);
        } catch {
            // On Windows the DB file can still be locked by the libsql client at
            // teardown. It's a gitignored throwaway that the next run rebuilds,
            // so a failed delete must not fail the test command.
        }
    }
}

export default function setup() {
    removeDbFiles();
    execSync("npx drizzle-kit push --force --config=drizzle.config.test.ts", {
        cwd: BACKEND_ROOT,
        stdio: "inherit",
    });

    return () => {
        removeDbFiles();
    };
}
