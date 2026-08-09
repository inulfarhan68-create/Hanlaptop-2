import * as path from "path";
import * as dotenv from "dotenv";

// Loaded here, before anything touches the database — and the `db` import below
// is dynamic for exactly that reason. ESM hoists every static import and
// evaluates it before a single line of this file runs, and `src/db` reads
// DATABASE_URL at module scope, so a static import would resolve the connection
// string before dotenv ever ran. The script then died on a missing
// DATABASE_URL and had to be wrapped in `dotenv-cli` by hand — for a script
// CLAUDE.md rule 18 says to run after every feature-matrix change. Same shape as
// set-platform-admin.ts.
//
// `.env.local` FIRST: dotenv never overrides an already-set variable, so the
// file loaded first wins. Loading `.env` first would let a stale DATABASE_URL
// there shadow the real one and point this at the wrong database.
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

/**
 * Push the feature matrix in lib/features.ts into the `plans` table.
 *
 * requireFeature() reads the `features` JSON stored on the plan ROW, not the
 * TypeScript constant. So editing PLAN_SEED / FEATURES changes nothing at
 * runtime until this runs — and the failure is silent and backwards: a plan that
 * gained a feature keeps being refused, and a tenant on `internal` (which is
 * meant to have everything) loses whatever was just added.
 *
 * That is exactly how the AI gating change first showed up: the demo tenant, on
 * the unlimited internal plan, was told its plan "does not support aiPricing".
 *
 * Idempotent — seedPlans() upserts by key, so running it twice is harmless.
 *
 *   cd backend && npm run db:sync-plans
 */
async function syncPlans() {
    const { seedPlans } = await import("../src/db/seed-plans");
    const { PLAN_SEED, buildFeatures } = await import("../src/lib/features");
    const { db } = await import("../src/db");
    const { plans } = await import("../src/db/schema/saas");

    const before = await db.select({ key: plans.key, features: plans.features }).from(plans);
    const beforeByKey = new Map(before.map((p) => [p.key, p.features]));

    const count = await seedPlans();

    const after = await db.select({ key: plans.key, features: plans.features }).from(plans);

    console.log(`synced ${count} plans\n`);
    for (const row of after) {
        const seed = PLAN_SEED.find((p) => p.key === row.key);
        const expected = seed ? Object.entries(buildFeatures(seed.features)).filter(([, on]) => on).length : 0;
        const changed = beforeByKey.get(row.key) !== row.features;
        const had = beforeByKey.has(row.key);
        const mark = !had ? "created" : changed ? "updated" : "unchanged";
        console.log(`  ${row.key.padEnd(12)} ${String(expected).padStart(2)} features enabled  (${mark})`);
    }
    process.exit(0);
}

syncPlans().catch((e) => {
    console.error("Failed to sync plans:", e);
    process.exit(1);
});
