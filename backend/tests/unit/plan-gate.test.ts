import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildFeatures, PLAN_SEED, type FeatureKey } from "@/lib/features";

/**
 * The row `getPlanState` would read. Set per test, then the chainable stub below
 * hands it back at the end of the query builder chain.
 */
let row: Record<string, unknown> | undefined;

vi.mock("@/db", () => {
    const chain: Record<string, unknown> = {};
    for (const method of ["select", "from", "leftJoin", "where", "orderBy"]) {
        chain[method] = () => chain;
    }
    chain.limit = () => Promise.resolve(row ? [row] : []);
    return { db: chain };
});

const { planAllows } = await import("@/lib/plan-gate");

const featuresFor = (key: string) =>
    JSON.stringify(buildFeatures(PLAN_SEED.find((p) => p.key === key)!.features as FeatureKey[]));

const tenant = { role: "owner", organizationId: "org-x" };

beforeEach(() => {
    row = undefined;
});

describe("planAllows", () => {
    it("denies a Pro/Business feature to a Starter shop", async () => {
        row = { isDemo: false, planKey: "starter", planFeatures: featuresFor("starter") };
        expect(await planAllows(tenant, "service")).toBe(false);
        expect(await planAllows(tenant, "hr")).toBe(false);
        expect(await planAllows(tenant, "auditTrail")).toBe(false);
    });

    it("allows what Starter does include", async () => {
        row = { isDemo: false, planKey: "starter", planFeatures: featuresFor("starter") };
        expect(await planAllows(tenant, "basicReports")).toBe(true);
        expect(await planAllows(tenant, "inventory")).toBe(true);
    });

    it("allows Business features on Business", async () => {
        row = { isDemo: false, planKey: "business", planFeatures: featuresFor("business") };
        expect(await planAllows(tenant, "service")).toBe(true);
        expect(await planAllows(tenant, "auditTrail")).toBe(true);
    });

    it("never gates the platform operator", async () => {
        // They have no organization at all; a plan lookup would find nothing and
        // the operator console would gate itself off.
        row = undefined;
        expect(await planAllows({ role: "platform_admin", organizationId: null }, "hr")).toBe(true);
    });

    it("falls open when the org has no plan row", async () => {
        row = { isDemo: false, planKey: null, planFeatures: null };
        expect(await planAllows(tenant, "service")).toBe(true);
    });

    it("falls open when the org itself is missing", async () => {
        row = undefined;
        expect(await planAllows(tenant, "service")).toBe(true);
    });
});
