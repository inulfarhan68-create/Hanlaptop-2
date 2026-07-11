import { defineConfig, configDefaults } from "vitest/config";
import path from "path";

/**
 * Integration test config — separate from the fast unit suite (vitest.config.ts).
 * These tests drive real service code against a throwaway SQLite database built
 * by tests/setup/integration-global-setup.ts. Kept out of `npm test` so the unit
 * run stays instant; invoked via `npm run test:integration`.
 */
export default defineConfig({
    test: {
        environment: "node",
        include: ["tests/integration/**/*.test.ts"],
        exclude: [...configDefaults.exclude, "tests/e2e/**"],
        globalSetup: ["tests/setup/integration-global-setup.ts"],
        // Single shared DB file — avoid concurrent writers across files.
        fileParallelism: false,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
