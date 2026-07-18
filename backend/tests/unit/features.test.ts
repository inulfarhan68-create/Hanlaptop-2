import { describe, it, expect } from "vitest";
import {
    hasFeature,
    parseFeatures,
    buildFeatures,
    FEATURE_KEYS,
    PLAN_SEED,
} from "@/lib/features";

// Locks the SaaS feature-gating layer. Plans gate capabilities via
// hasFeature(plan, key) — never plan.key === "business" — so these guard that
// (a) parsing tolerates the JSON-in-text column and junk, (b) a missing key is
// false (fail-closed), and (c) the seed matrix matches the intended tiers.

describe("parseFeatures", () => {
    it("parses a plan row's JSON-text features column", () => {
        expect(parseFeatures({ features: '{"payroll":true,"crm":false}' })).toEqual({
            payroll: true,
            crm: false,
        });
    });

    it("accepts a raw JSON string or an already-parsed map", () => {
        expect(parseFeatures('{"pos":true}')).toEqual({ pos: true });
        expect(parseFeatures({ pos: true })).toEqual({ pos: true });
    });

    it("returns an empty map for null / invalid JSON (never throws)", () => {
        expect(parseFeatures(null)).toEqual({});
        expect(parseFeatures(undefined)).toEqual({});
        expect(parseFeatures({ features: "not json {" })).toEqual({});
        expect(parseFeatures({ features: null })).toEqual({});
    });
});

describe("hasFeature", () => {
    it("is true only when the key is explicitly enabled", () => {
        const plan = { features: '{"accounting":true,"payroll":false}' };
        expect(hasFeature(plan, "accounting")).toBe(true);
        expect(hasFeature(plan, "payroll")).toBe(false);
    });

    it("fails closed on a missing key or empty plan", () => {
        expect(hasFeature({ features: "{}" }, "aiPricing")).toBe(false);
        expect(hasFeature(null, "inventory")).toBe(false);
    });
});

describe("buildFeatures", () => {
    it("expands a subset into a full map with every key present", () => {
        const map = buildFeatures(["inventory", "pos"]);
        expect(Object.keys(map).sort()).toEqual([...FEATURE_KEYS].sort());
        expect(map.inventory).toBe(true);
        expect(map.pos).toBe(true);
        expect(map.accounting).toBe(false);
    });
});

describe("PLAN_SEED matrix", () => {
    const byKey = Object.fromEntries(PLAN_SEED.map((p) => [p.key, p]));

    it("Starter sells core (inventory/POS/servis/AI) but not the back office", () => {
        const f = buildFeatures(byKey.starter.features);
        expect(f.inventory && f.pos && f.services && f.aiPricing).toBe(true);
        expect(f.accounting || f.crm || f.payroll || f.multiStore).toBe(false);
    });

    it("Business adds full books + CRM + HR, still single-region", () => {
        const f = buildFeatures(byKey.business.features);
        expect(f.accounting && f.crm && f.payroll && f.procurement).toBe(true);
        expect(f.multiStore).toBe(false);
    });

    it("Growth enables every feature incl. multi-cabang", () => {
        expect(byKey.growth.features).toEqual(FEATURE_KEYS);
    });

    it("the internal (unlimited) plan is hidden from public pricing", () => {
        expect(byKey.internal.isPublic).toBe(false);
        expect(byKey.internal.maxStores).toBeNull();
    });
});
