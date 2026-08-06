import { describe, it, expect } from "vitest";
import { subscriptionLapsed, addMonths, daysUntilLapse, EXPIRY_WARNING_DAYS, PAYING_STATUSES } from "@/lib/subscription-status";
import { manualSubscriptionSchema } from "@/lib/validators";

// Locks the rule that decides whether a paying tenant keeps write access.
// Getting this wrong in either direction is expensive: too strict locks a
// paying shop out of its own POS mid-sale, too loose means a trial never has to
// convert (which was the actual bug — see the elapsed-period cases below).

const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const past = new Date(Date.now() - 24 * 60 * 60 * 1000);

describe("subscriptionLapsed", () => {
    it("keeps write access while a trial or paid period is still running", () => {
        expect(subscriptionLapsed({ subscriptionStatus: "trialing", currentPeriodEnd: future })).toBe(false);
        expect(subscriptionLapsed({ subscriptionStatus: "active", currentPeriodEnd: future })).toBe(false);
    });

    it("lapses an expired trial that the cron never re-labelled", () => {
        // The regression that mattered: /api/cron/billing swept only `active`, so a
        // finished trial kept status `trialing` and, before this rule, full write
        // access forever. The date is what makes it lapse, not the label.
        expect(subscriptionLapsed({ subscriptionStatus: "trialing", currentPeriodEnd: past })).toBe(true);
    });

    it("lapses an active subscription whose paid period has elapsed", () => {
        expect(subscriptionLapsed({ subscriptionStatus: "active", currentPeriodEnd: past })).toBe(true);
    });

    it("lapses every explicitly non-paying status, even dated in the future", () => {
        // A cancellation must bite immediately rather than waiting out the period.
        for (const status of ["past_due", "canceled", "unpaid"]) {
            expect(subscriptionLapsed({ subscriptionStatus: status, currentPeriodEnd: future })).toBe(true);
        }
    });

    it("does not lock an org that has no subscription row at all", () => {
        // Those resolve no plan, so requireFeature already withholds gated features.
        // Locking here too would break the flagship/internal orgs.
        expect(subscriptionLapsed({ subscriptionStatus: null, currentPeriodEnd: null })).toBe(false);
        expect(subscriptionLapsed({ subscriptionStatus: null, currentPeriodEnd: past })).toBe(false);
    });

    it("evaluates against the supplied clock, not only wall time", () => {
        const end = new Date("2026-08-08T00:00:00Z");
        expect(subscriptionLapsed({ subscriptionStatus: "trialing", currentPeriodEnd: end }, new Date("2026-08-07T23:59:00Z"))).toBe(false);
        expect(subscriptionLapsed({ subscriptionStatus: "trialing", currentPeriodEnd: end }, new Date("2026-08-08T00:01:00Z"))).toBe(true);
    });

    it("treats exactly-at-expiry as still valid (lapse is strictly after)", () => {
        const end = new Date("2026-08-08T00:00:00Z");
        expect(subscriptionLapsed({ subscriptionStatus: "active", currentPeriodEnd: end }, end)).toBe(false);
    });

    it("only trialing and active are paying states", () => {
        // Guards against someone widening the allowlist without thinking it through.
        expect([...PAYING_STATUSES]).toEqual(["trialing", "active"]);
    });
});

// Manual billing means an operator types a duration and the period is computed
// from it, so an off-by-a-few-days bug here is a billing dispute, not a rounding
// detail. Local dates throughout — the period boundary is what the operator sees.
describe("addMonths", () => {
    const at = (y: number, m: number, d: number) => new Date(y, m - 1, d);
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    it("adds whole months on an ordinary date", () => {
        expect(iso(addMonths(at(2026, 8, 5), 1))).toBe("2026-09-05");
        expect(iso(addMonths(at(2026, 8, 5), 6))).toBe("2027-02-05");
        expect(iso(addMonths(at(2026, 8, 5), 12))).toBe("2027-08-05");
    });

    it("clamps instead of overflowing into the following month", () => {
        // Plain setMonth() turns 31 Jan into 3 Mar, quietly granting extra days.
        expect(iso(addMonths(at(2026, 1, 31), 1))).toBe("2026-02-28");
        expect(iso(addMonths(at(2026, 3, 31), 1))).toBe("2026-04-30");
        expect(iso(addMonths(at(2026, 5, 31), 3))).toBe("2026-08-31");
    });

    it("handles February in a leap year", () => {
        expect(iso(addMonths(at(2028, 1, 31), 1))).toBe("2028-02-29");
    });

    it("rolls the year over", () => {
        expect(iso(addMonths(at(2026, 12, 15), 1))).toBe("2027-01-15");
        expect(iso(addMonths(at(2026, 11, 30), 3))).toBe("2027-02-28");
    });

    it("does not mutate the date it was given", () => {
        const original = at(2026, 8, 5);
        addMonths(original, 3);
        expect(iso(original)).toBe("2026-08-05");
    });

    it("always moves the period forward", () => {
        for (const months of [1, 3, 6, 12, 36]) {
            const from = at(2026, 1, 31);
            expect(addMonths(from, months).getTime()).toBeGreaterThan(from.getTime());
        }
    });
});

// Decides whether a shop is warned before its tills stop. Warning a day late is
// the failure that matters — by then the save has already been refused.
describe("daysUntilLapse", () => {
    const at = (y: number, m: number, d: number, h = 9) => new Date(y, m - 1, d, h);
    const sub = (end: Date, status = "trialing") => ({ subscriptionStatus: status, currentPeriodEnd: end });

    it("counts whole calendar days, not elapsed hours", () => {
        // 23:00 today -> 08:00 tomorrow is under 24h but is still "besok".
        // Counting hours would floor that to 0 and say the shop expires today.
        expect(daysUntilLapse(sub(at(2026, 8, 6, 8)), at(2026, 8, 5, 23))).toBe(1);
    });

    it("returns 0 on the last valid day, while the shop can still work", () => {
        expect(daysUntilLapse(sub(at(2026, 8, 5, 23)), at(2026, 8, 5, 9))).toBe(0);
    });

    it("stays quiet outside the warning window", () => {
        expect(daysUntilLapse(sub(at(2026, 8, 12)), at(2026, 8, 5))).toBe(EXPIRY_WARNING_DAYS);
        expect(daysUntilLapse(sub(at(2026, 8, 13)), at(2026, 8, 5))).toBeNull();
        expect(daysUntilLapse(sub(at(2027, 1, 1)), at(2026, 8, 5))).toBeNull();
    });

    it("says nothing once it has already lapsed — the read-only banner owns that", () => {
        // Two banners about the same subscription would contradict each other.
        expect(daysUntilLapse(sub(at(2026, 8, 4)), at(2026, 8, 5))).toBeNull();
        expect(daysUntilLapse(sub(at(2026, 8, 10), "past_due"), at(2026, 8, 5))).toBeNull();
    });

    it("says nothing for an org with no subscription", () => {
        expect(daysUntilLapse({ subscriptionStatus: null, currentPeriodEnd: null }, at(2026, 8, 5))).toBeNull();
    });

    it("warns an active paid plan too, not just a trial", () => {
        expect(daysUntilLapse(sub(at(2026, 8, 8), "active"), at(2026, 8, 5))).toBe(3);
    });
});

describe("manualSubscriptionSchema", () => {
    const valid = { organizationId: "org-1", planKey: "starter", months: 12 };

    it("accepts a well-formed manual activation", () => {
        expect(manualSubscriptionSchema.safeParse(valid).success).toBe(true);
    });

    it("caps the duration an operator can grant by hand", () => {
        // The whole point of the bound: 120 typed instead of 12 would hand out a
        // decade of unpaid access, and nothing downstream would question it.
        expect(manualSubscriptionSchema.safeParse({ ...valid, months: 36 }).success).toBe(true);
        expect(manualSubscriptionSchema.safeParse({ ...valid, months: 37 }).success).toBe(false);
        expect(manualSubscriptionSchema.safeParse({ ...valid, months: 120 }).success).toBe(false);
    });

    it("rejects zero, negative and fractional durations", () => {
        for (const months of [0, -1, -12, 1.5]) {
            expect(manualSubscriptionSchema.safeParse({ ...valid, months }).success).toBe(false);
        }
    });

    it("requires an organization and a plan", () => {
        expect(manualSubscriptionSchema.safeParse({ ...valid, organizationId: "" }).success).toBe(false);
        expect(manualSubscriptionSchema.safeParse({ ...valid, planKey: "" }).success).toBe(false);
    });
});
