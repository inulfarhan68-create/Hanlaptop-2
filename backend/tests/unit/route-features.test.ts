import { describe, it, expect } from "vitest";
import { ROUTE_FEATURE, routeAllowedByPlan } from "@/lib/route-features";
import { FEATURE_KEYS, buildFeatures, PLAN_SEED, type FeatureKey } from "@/lib/features";

const starter = buildFeatures(PLAN_SEED.find((p) => p.key === "starter")!.features);
const business = buildFeatures(PLAN_SEED.find((p) => p.key === "business")!.features);

describe("ROUTE_FEATURE", () => {
    it("only maps routes to features that actually exist", () => {
        // A typo'd key would silently gate on `undefined === true` → always denied,
        // locking every plan out of the page.
        for (const feature of Object.values(ROUTE_FEATURE)) {
            expect(FEATURE_KEYS).toContain(feature);
        }
    });

    it("maps every gated route to a feature some public plan sells", () => {
        for (const [href, feature] of Object.entries(ROUTE_FEATURE)) {
            const sellable = PLAN_SEED.some(
                (p) => p.isPublic && (p.features as readonly FeatureKey[]).includes(feature),
            );
            expect(sellable, `${href} → ${feature} is on no public plan`).toBe(true);
        }
    });
});

describe("routeAllowedByPlan", () => {
    it("allows routes that are not gated at all", () => {
        expect(routeAllowedByPlan("/dashboard", starter)).toBe(true);
        expect(routeAllowedByPlan("/transactions", starter)).toBe(true);
        expect(routeAllowedByPlan("/inventory", starter)).toBe(true);
        expect(routeAllowedByPlan("/settings/billing", starter)).toBe(true);
    });

    it("locks Pro and Business routes on a Starter plan", () => {
        // The reported bug: a Starter shop could open the whole menu.
        expect(routeAllowedByPlan("/services", starter)).toBe(false);
        expect(routeAllowedByPlan("/passports", starter)).toBe(false);
        expect(routeAllowedByPlan("/opname", starter)).toBe(false);
        expect(routeAllowedByPlan("/transfer", starter)).toBe(false);
        expect(routeAllowedByPlan("/payroll", starter)).toBe(false);
        expect(routeAllowedByPlan("/reconciliation", starter)).toBe(false);
        expect(routeAllowedByPlan("/approvals", starter)).toBe(false);
        expect(routeAllowedByPlan("/audit", starter)).toBe(false);
    });

    it("keeps basic reports on Starter", () => {
        // Laporan is core — gating it would take away something already sold.
        expect(routeAllowedByPlan("/reports", starter)).toBe(true);
    });

    it("allows every gated route on Business", () => {
        for (const href of Object.keys(ROUTE_FEATURE)) {
            expect(routeAllowedByPlan(href, business), href).toBe(true);
        }
    });

    it("falls open when no plan resolves", () => {
        // An org without a subscription row must not be locked out of its own shop
        // by a billing lookup that found nothing.
        expect(routeAllowedByPlan("/services", null)).toBe(true);
        expect(routeAllowedByPlan("/services", undefined)).toBe(true);
    });

    it("treats an empty feature map as denial, not as unknown", () => {
        // A plan that resolved and grants nothing is a real answer.
        expect(routeAllowedByPlan("/services", {})).toBe(false);
    });
});
