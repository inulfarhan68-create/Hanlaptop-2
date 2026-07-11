import { defineConfig, configDefaults } from "vitest/config";
import path from "path";

export default defineConfig({
    test: {
        environment: "node",
        // Only run our unit tests here. The Playwright specs under tests/e2e
        // have their own runner and must NOT be picked up by Vitest.
        include: ["tests/unit/**/*.test.ts"],
        exclude: [...configDefaults.exclude, "tests/e2e/**"],
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
