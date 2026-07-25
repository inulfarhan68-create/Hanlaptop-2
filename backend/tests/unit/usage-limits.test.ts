import { describe, it, expect, vi } from "vitest";

// usage-limits imports the db client at module load; stub it — limitStatus is pure.
vi.mock("@/db", () => ({ db: {} }));

import {
    limitStatus,
    USAGE_WARN_THRESHOLD,
    USAGE_CRITICAL_THRESHOLD,
} from "@/lib/usage-limits";

/**
 * The load-bearing quota rule: how a live count maps to ok/warning/critical/blocked.
 * The API hard-blocks on "blocked"; the banner warns on "warning"/"critical".
 */
describe("limitStatus", () => {
    it("null limit → unlimited (no percent, no remaining)", () => {
        expect(limitStatus(999, null)).toEqual({ status: "unlimited", percent: null, remaining: null });
    });

    it("well under the limit → ok", () => {
        const r = limitStatus(0, 10);
        expect(r.status).toBe("ok");
        expect(r.remaining).toBe(10);
        const r2 = limitStatus(7, 10); // 70%
        expect(r2.status).toBe("ok");
        expect(r2.remaining).toBe(3);
    });

    it("crosses 80% → warning (inclusive boundary)", () => {
        expect(limitStatus(4, 5).status).toBe("warning");   // 0.80 exactly
        expect(limitStatus(89, 100).status).toBe("warning"); // 0.89
        expect(limitStatus(79, 100).status).toBe("ok");      // just under 0.80
    });

    it("crosses 90% → critical (inclusive boundary), still not blocked", () => {
        expect(limitStatus(9, 10).status).toBe("critical");  // 0.90 exactly
        expect(limitStatus(99, 100).status).toBe("critical");
    });

    it("at or over the limit → blocked", () => {
        expect(limitStatus(10, 10).status).toBe("blocked");
        expect(limitStatus(11, 10)).toMatchObject({ status: "blocked", remaining: 0 });
    });

    it("a zero limit blocks immediately", () => {
        expect(limitStatus(0, 0)).toMatchObject({ status: "blocked", percent: 1, remaining: 0 });
    });

    it("thresholds are the documented 80% / 90%", () => {
        expect(USAGE_WARN_THRESHOLD).toBe(0.8);
        expect(USAGE_CRITICAL_THRESHOLD).toBe(0.9);
    });
});
