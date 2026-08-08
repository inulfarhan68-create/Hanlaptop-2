import { describe, it, expect } from "vitest";
import { pendingRequest } from "@/lib/subscription-requests";

const t = (day: number) => new Date(2026, 7, day).getTime();

describe("pendingRequest", () => {
    it("is quiet when nothing was ever asked", () => {
        expect(pendingRequest({})).toEqual({ pending: false, kind: null });
        expect(pendingRequest({ grantedAt: t(1) })).toEqual({ pending: false, kind: null });
    });

    it("holds an ask that has not been served", () => {
        expect(pendingRequest({ renewalAskedAt: t(5) })).toEqual({ pending: true, kind: "renewal" });
        expect(pendingRequest({ upgradeAskedAt: t(5) })).toEqual({ pending: true, kind: "upgrade" });
    });

    it("clears once the operator grants after the ask", () => {
        // Without this every tenant ever served would sit in the queue forever
        // and the console would stop meaning anything.
        expect(pendingRequest({ renewalAskedAt: t(5), grantedAt: t(6) })).toEqual({
            pending: false,
            kind: null,
        });
        expect(pendingRequest({ upgradeAskedAt: t(5), grantedAt: t(6) })).toEqual({
            pending: false,
            kind: null,
        });
    });

    it("reopens when the shop asks again after being served", () => {
        expect(pendingRequest({ renewalAskedAt: t(7), grantedAt: t(6) })).toEqual({
            pending: true,
            kind: "renewal",
        });
    });

    it("treats a grant at the same instant as serving the ask", () => {
        expect(pendingRequest({ renewalAskedAt: t(5), grantedAt: t(5) })).toEqual({
            pending: false,
            kind: null,
        });
    });

    it("reports the later of two open asks", () => {
        expect(pendingRequest({ renewalAskedAt: t(3), upgradeAskedAt: t(9) })).toEqual({
            pending: true,
            kind: "upgrade",
        });
        expect(pendingRequest({ renewalAskedAt: t(9), upgradeAskedAt: t(3) })).toEqual({
            pending: true,
            kind: "renewal",
        });
    });

    it("prefers the upgrade on a tie — it names the plan to set", () => {
        expect(pendingRequest({ renewalAskedAt: t(4), upgradeAskedAt: t(4) })).toEqual({
            pending: true,
            kind: "upgrade",
        });
    });

    it("clears both kinds with one grant", () => {
        expect(pendingRequest({ renewalAskedAt: t(2), upgradeAskedAt: t(3), grantedAt: t(4) })).toEqual({
            pending: false,
            kind: null,
        });
    });
});
