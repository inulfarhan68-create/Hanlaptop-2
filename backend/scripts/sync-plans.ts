import { seedPlans } from "../src/db/seed-plans";
import { PLAN_SEED, buildFeatures } from "../src/lib/features";
import { db } from "../src/db";
import { plans } from "../src/db/schema/saas";

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
 *   cd backend && npx tsx scripts/sync-plans.ts
 */
async function syncPlans() {
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
