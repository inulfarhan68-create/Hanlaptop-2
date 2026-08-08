import type { FeatureKey } from "./features";

/** What `parseFeatures` yields: known keys, any of them possibly absent. */
export type PlanFeatureMap = Partial<Record<FeatureKey, boolean>>;

/**
 * Which plan feature each admin route belongs to.
 *
 * Plan tiers were being sold but not enforced anywhere a shop could see: the
 * sidebar filters by ROLE only and no admin page checked the plan at all, so a
 * Starter shop could open the same menu as a Business one. Some API routes did
 * enforce it, which produced the worst of both — the page opened, then its data
 * call answered 402, so the shop got a broken screen instead of an offer.
 *
 * Used in two places that must agree: the sidebar (marks the entry locked) and
 * the page itself (renders the upgrade offer instead of the module).
 *
 * Routes absent from this map are available on every plan (dashboard, POS,
 * inventory, invoices — the things `starter` already includes), so they are
 * deliberately not listed rather than mapped to a feature nobody gates.
 */
export const ROUTE_FEATURE: Record<string, FeatureKey> = {
    "/services": "service",
    "/passports": "devicePassport",
    "/opname": "stockOpname",
    "/transfer": "stockTransfer",
    "/payroll": "hr",
    "/reports": "basicReports",
    "/reconciliation": "bankReconciliation",
    "/approvals": "approvals",
    "/audit": "auditTrail",
};

/**
 * May this plan open that route? Unknown routes are allowed — the map lists what
 * is restricted, not what exists, so adding a page cannot accidentally hide it.
 */
export function routeAllowedByPlan(href: string, features: PlanFeatureMap | null | undefined): boolean {
    const needed = ROUTE_FEATURE[href];
    if (!needed) return true;
    // No plan resolved (e.g. an org without a subscription): fall open rather
    // than lock a tenant out of their own shop over a billing lookup.
    if (!features) return true;
    return features[needed] === true;
}
