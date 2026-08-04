import { describe, it, expect } from "vitest";
import { subscriptionLapsed, PAYING_STATUSES } from "@/lib/subscription-status";

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
