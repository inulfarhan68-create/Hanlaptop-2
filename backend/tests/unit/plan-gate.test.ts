import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildFeatures, PLAN_SEED, type FeatureKey } from "@/lib/features";

/**
 * The row `getPlanState` would read. Set per test, then the chainable stub below
 * hands it back at the end of the query builder chain.
 */
let row: Record<string, unknown> | undefined;
/** What the `plans` table holds — every query that ends in orderBy reads this. */
let planRows: { name: string; features: string }[] = [];

vi.mock("@/db", () => {
    const chain: Record<string, unknown> = {};
    for (const method of ["select", "from", "leftJoin", "where"]) {
        chain[method] = () => chain;
    }
    chain.limit = () => Promise.resolve(row ? [row] : []);
    chain.orderBy = () => Promise.resolve(planRows);
    return { db: chain };
});

const { planAllows, getUpgradeTargets, storeHasFeature } = await import("@/lib/plan-gate");

const featuresFor = (key: string) =>
    JSON.stringify(buildFeatures(PLAN_SEED.find((p) => p.key === key)!.features as FeatureKey[]));

const tenant = { role: "owner", organizationId: "org-x" };

beforeEach(() => {
    row = undefined;
    planRows = [
        { name: "Starter", features: featuresFor("starter") },
        { name: "Pro", features: featuresFor("pro") },
        { name: "Business", features: featuresFor("business") },
    ];
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

describe("getUpgradeTargets", () => {
    it("names the cheapest plan that sells each missing feature", async () => {
        const starter = JSON.parse(featuresFor("starter"));
        const targets = await getUpgradeTargets(starter);
        expect(targets.service).toBe("Pro");
        expect(targets.catalog).toBe("Pro");
        expect(targets.hr).toBe("Business");
        expect(targets.auditTrail).toBe("Business");
    });

    it("omits features the shop already has", async () => {
        const starter = JSON.parse(featuresFor("starter"));
        const targets = await getUpgradeTargets(starter);
        expect(targets.basicReports).toBeUndefined();
        expect(targets.inventory).toBeUndefined();
    });

    it("omits features no public plan sells", async () => {
        // Enterprise-only keys are absent from the three plans above — naming a
        // plan that does not include the feature would be worse than silence.
        const starter = JSON.parse(featuresFor("starter"));
        const targets = await getUpgradeTargets(starter);
        expect(targets.whiteLabel).toBeUndefined();
    });

    it("returns nothing when no plan resolved", async () => {
        expect(await getUpgradeTargets(null)).toEqual({});
    });
});

describe("storeHasFeature", () => {
    it("reads the plan of the org that owns the store", async () => {
        // The public catalog has no session — the store id is all it has.
        row = { features: featuresFor("starter") };
        expect(await storeHasFeature("store-1", "catalog")).toBe(false);
        row = { features: featuresFor("pro") };
        expect(await storeHasFeature("store-2", "catalog")).toBe(true);
    });

    it("falls open for a store with no plan", async () => {
        row = { features: null };
        expect(await storeHasFeature("store-3", "catalog")).toBe(true);
    });
});
