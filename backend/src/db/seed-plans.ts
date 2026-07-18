import { db } from "./index";
import { plans } from "./schema";
import { PLAN_SEED, buildFeatures } from "@/lib/features";

/**
 * Seed / upsert the base SaaS plans from PLAN_SEED (`@/lib/features`).
 *
 * Idempotent: each plan is matched by its stable `key`, so re-running syncs the
 * row to the matrix — editing PLAN_SEED (price/limits/features) + re-seeding
 * updates the DB without duplicating. Called by the Phase-2 tenancy migration
 * and safe to run standalone. Returns the number of plans upserted.
 */
export async function seedPlans(): Promise<number> {
    for (const p of PLAN_SEED) {
        const set = {
            name: p.name,
            description: p.description,
            priceMonthly: p.priceMonthly,
            maxStores: p.maxStores,
            maxUsers: p.maxUsers,
            maxTransactionsPerMonth: p.maxTransactionsPerMonth,
            storageLimitMb: p.storageLimitMb,
            features: JSON.stringify(buildFeatures(p.features)),
            isActive: true,
            isPublic: p.isPublic,
            sortOrder: p.sortOrder,
            updatedAt: new Date(),
        };
        await db
            .insert(plans)
            .values({ key: p.key, ...set })
            .onConflictDoUpdate({ target: plans.key, set });
    }
    return PLAN_SEED.length;
}
