import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getAppUrl } from "@/lib/app-url";

const KEYS = ["NEXT_PUBLIC_APP_URL", "VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_URL"] as const;

describe("getAppUrl — canonical/OG base URL resolution", () => {
    const saved: Record<string, string | undefined> = {};

    beforeEach(() => {
        for (const k of KEYS) {
            saved[k] = process.env[k];
            delete process.env[k];
        }
    });

    afterEach(() => {
        for (const k of KEYS) {
            if (saved[k] === undefined) delete process.env[k];
            else process.env[k] = saved[k];
        }
    });

    it("prefers the explicit override", () => {
        process.env.NEXT_PUBLIC_APP_URL = "https://hanlaptop.id";
        process.env.VERCEL_PROJECT_PRODUCTION_URL = "hanlaptop.vercel.app";
        expect(getAppUrl()).toBe("https://hanlaptop.id");
    });

    it("strips a trailing slash from the override", () => {
        process.env.NEXT_PUBLIC_APP_URL = "https://hanlaptop.id/";
        expect(getAppUrl()).toBe("https://hanlaptop.id");
    });

    it("adds the protocol when the override omits it", () => {
        process.env.NEXT_PUBLIC_APP_URL = "hanlaptop.id";
        expect(getAppUrl()).toBe("https://hanlaptop.id");
    });

    it("falls back to the Vercel production domain (bare host -> https)", () => {
        process.env.VERCEL_PROJECT_PRODUCTION_URL = "hanlaptop.vercel.app";
        process.env.VERCEL_URL = "some-preview-abc123.vercel.app";
        expect(getAppUrl()).toBe("https://hanlaptop.vercel.app");
    });

    it("uses the per-deployment URL for previews", () => {
        process.env.VERCEL_URL = "some-preview-abc123.vercel.app";
        expect(getAppUrl()).toBe("https://some-preview-abc123.vercel.app");
    });

    it("falls back to localhost in dev", () => {
        expect(getAppUrl()).toBe("http://localhost:3000");
    });

    it("never returns the old hardcoded aspirational domain", () => {
        // Regression guard: canonical once pointed at hanlaptop.com (NXDOMAIN),
        // which tells crawlers the real page lives on a dead host.
        process.env.VERCEL_PROJECT_PRODUCTION_URL = "hanlaptop.vercel.app";
        expect(getAppUrl()).not.toContain("hanlaptop.com");
    });
});
