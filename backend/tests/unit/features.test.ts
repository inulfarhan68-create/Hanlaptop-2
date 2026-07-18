import { describe, it, expect } from "vitest";
import {
    hasFeature,
    parseFeatures,
    buildFeatures,
    FEATURE_KEYS,
    PLAN_SEED,
} from "@/lib/features";

// Locks the SaaS feature-gating layer. Plans gate capabilities via
// hasFeature(plan, key) — never plan.key === "pro" — so these guard that
// (a) parsing tolerates the JSON-in-text column and junk, (b) a missing key is
// false (fail-closed), and (c) the v1 seed matrix matches the intended tiers.

describe("parseFeatures", () => {
    it("parses a plan row's JSON-text features column", () => {
        expect(parseFeatures({ features: '{"service":true,"accountingReports":false}' })).toEqual({
            service: true,
            accountingReports: false,
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
        const plan = { features: '{"accountingReports":true,"hr":false}' };
        expect(hasFeature(plan, "accountingReports")).toBe(true);
        expect(hasFeature(plan, "hr")).toBe(false);
    });

    it("fails closed on a missing key or empty plan", () => {
        expect(hasFeature({ features: "{}" }, "service")).toBe(false);
        expect(hasFeature(null, "pos")).toBe(false);
    });
});

describe("buildFeatures", () => {
    it("expands a subset into a full map with every key present", () => {
        const map = buildFeatures(["pos", "inventory"]);
        expect(Object.keys(map).sort()).toEqual([...FEATURE_KEYS].sort());
        expect(map.pos).toBe(true);
        expect(map.inventory).toBe(true);
        expect(map.service).toBe(false);
    });
});

describe("PLAN_SEED matrix (v1)", () => {
    const byKey = Object.fromEntries(PLAN_SEED.map((p) => [p.key, p]));

    it("Starter runs the shop but not servis / full books", () => {
        const f = buildFeatures(byKey.starter.features);
        expect(f.pos && f.inventory && f.purchasing && f.buyback).toBe(true);
        expect(f.service || f.accountingReports || f.roles || f.multiStore).toBe(false);
        expect(byKey.starter.priceMonthly).toBe(69_000);
        expect(byKey.starter.maxUsers).toBe(1);
        expect(byKey.starter.maxStores).toBe(1);
    });

    it("Pro unlocks servis + accounting reports + team roles, single-cabang", () => {
        const f = buildFeatures(byKey.pro.features);
        expect(f.service && f.accountingReports && f.roles).toBe(true);
        expect(f.multiStore || f.hr).toBe(false);
        expect(byKey.pro.maxUsers).toBe(5);
        expect(byKey.pro.maxStores).toBe(1);
    });

    it("Business adds multi-cabang + controls + HR", () => {
        const f = buildFeatures(byKey.business.features);
        expect(f.multiStore && f.stockOpname && f.qc && f.procurement && f.auditTrail && f.approvals && f.hr).toBe(true);
        expect(f.api || f.whiteLabel).toBe(false);
        expect(byKey.business.maxStores).toBe(5);
    });

    it("Enterprise is custom-priced, unlimited, with API + white-label", () => {
        const f = buildFeatures(byKey.enterprise.features);
        expect(f.api && f.whiteLabel).toBe(true);
        expect(byKey.enterprise.priceMonthly).toBeNull();
        expect(byKey.enterprise.maxUsers).toBeNull();
        expect(byKey.enterprise.maxStores).toBeNull();
    });

    it("the internal (unlimited) plan is hidden from public pricing", () => {
        expect(byKey.internal.isPublic).toBe(false);
    });
});
