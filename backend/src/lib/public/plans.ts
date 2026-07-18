import { cache } from "react";
import { db } from "@/db";
import { plans } from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { PLAN_SEED, buildFeatures } from "@/lib/features";

export interface PublicPlan {
    key: string;
    name: string;
    description: string | null;
    bestFor: string | null;
    priceMonthly: number | null; // null = custom ("Hubungi kami")
    maxStores: number | null;
    maxUsers: number | null;
    maxTransactionsPerMonth: number | null;
    storageLimitMb: number | null;
    features: Record<string, boolean>;
    sortOrder: number;
}

function safeParseFeatures(s: string): Record<string, boolean> {
    try {
        const o = JSON.parse(s || "{}");
        return o && typeof o === "object" ? o : {};
    } catch {
        return {};
    }
}

/** "Cocok untuk …" is marketing copy kept in code (PLAN_SEED), merged onto DB rows by key. */
function bestForOf(key: string): string | null {
    return PLAN_SEED.find((p) => p.key === key)?.bestFor ?? null;
}

/**
 * Public pricing plans — active + public, ordered for the pricing table.
 *
 * Falls back to `PLAN_SEED` (the code source of truth) when the `plans` table is
 * empty or unreadable — e.g. a fresh environment before the seed/migration has
 * run — so the landing/pricing page always renders. `cache()`'d for per-request
 * dedup, matching the other `lib/public/*` loaders.
 */
export const getPublicPlans = cache(async (): Promise<PublicPlan[]> => {
    try {
        const rows = await db
            .select()
            .from(plans)
            .where(and(eq(plans.isActive, true), eq(plans.isPublic, true)))
            .orderBy(asc(plans.sortOrder));

        if (rows.length > 0) {
            return rows.map((r) => ({
                key: r.key,
                name: r.name,
                description: r.description,
                bestFor: bestForOf(r.key),
                priceMonthly: r.priceMonthly,
                maxStores: r.maxStores,
                maxUsers: r.maxUsers,
                maxTransactionsPerMonth: r.maxTransactionsPerMonth,
                storageLimitMb: r.storageLimitMb,
                features: safeParseFeatures(r.features),
                sortOrder: r.sortOrder,
            }));
        }
    } catch {
        // table not migrated yet / DB unreachable — use the seed defaults below.
    }

    return PLAN_SEED.filter((p) => p.isPublic).map((p) => ({
        key: p.key,
        name: p.name,
        description: p.description,
        bestFor: p.bestFor,
        priceMonthly: p.priceMonthly,
        maxStores: p.maxStores,
        maxUsers: p.maxUsers,
        maxTransactionsPerMonth: p.maxTransactionsPerMonth,
        storageLimitMb: p.storageLimitMb,
        features: buildFeatures(p.features),
        sortOrder: p.sortOrder,
    }));
});
