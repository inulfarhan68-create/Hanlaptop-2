import { cache } from "react";
import { db } from "@/db";
import { organizations, stores } from "@/db/schema";
import { subscriptions, plans } from "@/db/schema/saas";
import { parseFeatures, FEATURE_KEYS, type FeatureKey } from "@/lib/features";
import type { PlanFeatureMap } from "@/lib/route-features";
import { eq, and, asc } from "drizzle-orm";

/**
 * What a tenant's subscription entitles them to, for Server Components.
 *
 * The API layer has `requireFeature`, but pages had nothing: a Starter shop could
 * type /reports and get the page, which then fired a data call that answered 402.
 * The shop sees a screen that loads and then breaks, which reads as a bug rather
 * than as "this costs more".
 *
 * Wrapped in `cache()` so the shell layout and the page it wraps share one query
 * per request rather than two.
 */
export type PlanState = {
    isDemo: boolean;
    subscriptionStatus: string | null;
    currentPeriodEnd: Date | null;
    planKey: string | null;
    planName: string | null;
    features: PlanFeatureMap | null;
};

export const getPlanState = cache(
    async (organizationId: string | null | undefined): Promise<PlanState | null> => {
        if (!organizationId) return null;
        const [row] = await db
            .select({
                isDemo: organizations.isDemo,
                subscriptionStatus: subscriptions.status,
                currentPeriodEnd: subscriptions.currentPeriodEnd,
                planKey: subscriptions.planKey,
                planName: plans.name,
                planFeatures: plans.features,
            })
            .from(organizations)
            .leftJoin(subscriptions, eq(subscriptions.organizationId, organizations.id))
            .leftJoin(plans, eq(plans.key, subscriptions.planKey))
            .where(eq(organizations.id, organizationId))
            .limit(1);
        if (!row) return null;
        return {
            isDemo: Boolean(row.isDemo),
            subscriptionStatus: row.subscriptionStatus ?? null,
            currentPeriodEnd: row.currentPeriodEnd ?? null,
            planKey: row.planKey ?? null,
            planName: row.planName ?? null,
            features: row.planFeatures ? parseFeatures(row.planFeatures) : null,
        };
    },
);

/**
 * May this user's shop open a feature?
 *
 * Falls open in the two cases where no plan resolves — the operator, and an org
 * with no subscription row — for the same reason the sidebar does: a billing
 * lookup that finds nothing should not lock a shop out of its own data, and the
 * two must agree or the menu shows a link that the page then refuses.
 */
export async function planAllows(
    user: { role?: string | null; organizationId?: string | null },
    feature: FeatureKey,
): Promise<boolean> {
    if (user.role === "platform_admin") return true;
    const state = await getPlanState(user.organizationId);
    if (!state?.features) return true;
    return state.features[feature] === true;
}

/**
 * Whether the shop that owns a STORE has a feature.
 *
 * For surfaces with no session to read an organization from — the public catalog
 * is the one that matters: it is served to a shop's customers with no auth at
 * all, so `catalog` (a Pro feature) was free on every plan, and the page a
 * Starter shop hands out is the most visible thing they never paid for.
 *
 * Falls open on an unresolvable plan, like every other gate here.
 */
export const storeHasFeature = cache(
    async (storeId: string, feature: FeatureKey): Promise<boolean> => {
        const [row] = await db
            .select({ features: plans.features })
            .from(stores)
            .leftJoin(subscriptions, eq(subscriptions.organizationId, stores.organizationId))
            .leftJoin(plans, eq(plans.key, subscriptions.planKey))
            .where(eq(stores.id, storeId))
            .limit(1);
        if (!row?.features) return true;
        return parseFeatures(row.features)[feature] === true;
    },
);

/**
 * The cheapest public plan that actually sells a feature — read from the `plans`
 * rows, not from PLAN_SEED, because the rows are what `requireFeature` enforces
 * and the two drift whenever the matrix changes without `db:sync-plans`. Telling
 * a shop to buy Pro for something Pro no longer includes would be worse than
 * saying nothing, so this returns null when no plan matches.
 */
export const cheapestPlanWith = cache(async (feature: FeatureKey): Promise<string | null> => {
    const rows = await sellablePlans();
    const match = rows.find((p) => parseFeatures(p.features)[feature] === true);
    return match?.name ?? null;
});

const sellablePlans = cache(async () =>
    db
        .select({ name: plans.name, features: plans.features })
        .from(plans)
        .where(and(eq(plans.isPublic, true), eq(plans.isActive, true)))
        .orderBy(asc(plans.sortOrder)),
);

/**
 * For every feature the shop does NOT have, the cheapest plan that sells it.
 *
 * Client components need this and cannot query for it — locked tabs live inside
 * pages the shop legitimately has (Laporan holds tabs from three tiers), so the
 * offer has to render in the browser. Only the missing features are included, so
 * a shop on Business ships an empty object rather than the whole matrix.
 */
export async function getUpgradeTargets(
    features: PlanFeatureMap | null,
): Promise<Partial<Record<FeatureKey, string>>> {
    if (!features) return {};
    const rows = await sellablePlans();
    const out: Partial<Record<FeatureKey, string>> = {};
    for (const key of FEATURE_KEYS) {
        if (features[key] === true) continue;
        const match = rows.find((p) => parseFeatures(p.features)[key] === true);
        if (match) out[key] = match.name;
    }
    return out;
}
