import { describe, it, expect } from "vitest";
import { calculateAdjustedPrice, estimateRepairCost } from "@/lib/pricingUtils";

// Locks the buyback offer algorithm. It was once ported as a one-line stub that
// returned baseMarketPrice unchanged, which quoted customers the full market
// price — no 30% shop margin, no condition discount, no repair deduction. These
// expectations are computed by hand from the algorithm, so they fail if any
// stage (spec deltas, age, warranty, completeness, margin, condition) is
// dropped rather than just re-tuned.

const SPEC = {
  processorFamily: "Intel Core i5",
  ram: "8GB",
  storage: "256GB SSD",
  vgaType: "Integrated",
  purchaseYear: "2023",
  hasWarranty: false,
};

const quote = (over: Record<string, unknown> = {}, condition = "USED_B", baseMarketPrice = 5_000_000) =>
  calculateAdjustedPrice({
    baseMarketPrice,
    baseline: { ...SPEC },
    current: { ...SPEC, ...over },
    condition,
  });

describe("calculateAdjustedPrice", () => {
  it("applies the 30% shop margin and the USED_B condition factor", () => {
    // 5,000,000 * 0.70 margin = 3,500,000; * 0.85 = 2,975,000; round to 50k
    expect(quote()).toBe(3_000_000);
  });

  it("does not return the raw market price (the stub regression)", () => {
    expect(quote()).not.toBe(5_000_000);
  });

  it("pays the full base offer for mint units (USED_A)", () => {
    expect(quote({}, "USED_A")).toBe(3_500_000);
  });

  it("credits a spec upgrade over the baseline (8GB -> 16GB RAM)", () => {
    // +400,000 RAM delta -> 5,400,000 * 0.70 * 0.85 = 3,213,000 -> 3,200,000
    expect(quote({ ram: "16GB" })).toBe(3_200_000);
  });

  it("discounts an older unit via the age ratio", () => {
    // 2020 (0.65) vs baseline 2023 (0.80) -> ratio 0.8125
    expect(quote({ purchaseYear: "2020" })).toBe(2_400_000);
  });

  it("pays a premium when the unit still has warranty", () => {
    expect(quote({ hasWarranty: true })).toBe(3_250_000);
  });

  it("deducts for incomplete accessories", () => {
    expect(quote({ completeness: "Hanya Batangan" })).toBe(2_750_000);
  });

  it("subtracts estimated repair cost for USED_C", () => {
    // 3,500,000 * 0.90 - 500,000 battery = 2,650,000
    expect(quote({ minusDetails: "baterai drop" }, "USED_C")).toBe(2_650_000);
  });

  it("subtracts inflated repair cost for BROKEN units", () => {
    // screen 1,000,000 * 1.5 = 1,500,000; 3,500,000 * 0.80 - 1,500,000 = 1,300,000
    expect(quote({ minusDetails: "layar pecah" }, "BROKEN")).toBe(1_300_000);
  });

  it("never quotes below the 500k floor", () => {
    expect(quote({}, "BROKEN", 0)).toBeGreaterThanOrEqual(500_000);
  });

  it("holds the USED_C floor at 40% of the base offer when repairs exceed value", () => {
    // Repairs far exceed the unit's worth -> floor at 3,500,000 * 0.40 = 1,400,000
    expect(quote({ minusDetails: "mati total, layar rusak, engsel patah" }, "USED_C")).toBe(1_400_000);
  });
});

describe("estimateRepairCost", () => {
  it("sums the cost of each distinct fault named", () => {
    expect(estimateRepairCost("layar bergaris, engsel patah")).toBe(1_350_000);
  });

  it("falls back to a default service cost for unspecified faults", () => {
    expect(estimateRepairCost("ada minus kecil")).toBe(500_000);
  });

  it("treats an empty description as the default cost", () => {
    expect(estimateRepairCost("")).toBe(500_000);
  });
});
