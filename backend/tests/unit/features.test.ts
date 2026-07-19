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
// false (fail-closed), and (c) the fine-grained v2 seed matrix matches the tiers.

describe("parseFeatures", () => {
    it("parses a plan row's JSON-text features column", () => {
        expect(parseFeatures({ features: '{"service":true,"accounting":false}' })).toEqual({
            service: true,
            accounting: false,
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
        const plan = { features: '{"accounting":true,"hr":false}' };
        expect(hasFeature(plan, "accounting")).toBe(true);
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

describe("PLAN_SEED matrix (v2)", () => {
    const byKey = Object.fromEntries(PLAN_SEED.map((p) => [p.key, p]));

    it("Starter runs the shop (POS/inventory/barcode/basic reports) — no servis/akuntansi/katalog", () => {
        const f = buildFeatures(byKey.starter.features);
        expect(f.dashboard && f.pos && f.inventory && f.printBarcode && f.basicReports && f.invoice).toBe(true);
        expect(f.service || f.accounting || f.catalog || f.buyback || f.roles || f.multiStore).toBe(false);
        expect(byKey.starter.priceMonthly).toBe(69_000);
        expect(byKey.starter.maxUsers).toBe(1);
        expect(byKey.starter.maxStores).toBe(1);
    });

    it("Pro adds servis, katalog, buyback, akuntansi & tim — still single-cabang, no Business ops", () => {
        const f = buildFeatures(byKey.pro.features);
        expect(f.service && f.devicePassport && f.buyback && f.catalog && f.consignment && f.accounting && f.roles).toBe(true);
        expect(f.multiStore || f.qc || f.hr || f.generalJournal || f.purchaseOrder).toBe(false);
        expect(byKey.pro.priceMonthly).toBe(159_000);
        expect(byKey.pro.maxUsers).toBe(3);
        expect(byKey.pro.maxStores).toBe(1);
    });

    it("Business adds multi-cabang, kontrol operasional, akuntansi lanjutan & HR", () => {
        const f = buildFeatures(byKey.business.features);
        expect(f.multiStore && f.stockTransfer && f.stockOpname && f.qc && f.purchaseOrder).toBe(true);
        expect(f.bankReconciliation && f.generalJournal && f.fixedAssets && f.closingPeriod).toBe(true);
        expect(f.hr && f.technicianCommission && f.auditTrail && f.approvals).toBe(true);
        expect(f.api || f.whiteLabel).toBe(false);
        expect(byKey.business.priceMonthly).toBe(349_000);
        expect(byKey.business.maxUsers).toBe(10);
        expect(byKey.business.maxStores).toBe(3);
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
