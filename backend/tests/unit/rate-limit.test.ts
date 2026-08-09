import { describe, it, expect } from "vitest";
import { checkRateLimit, checkRateLimitTier, rateLimitTiers } from "@/lib/rate-limit";

/** A request from a given address — the fallback limiter keys on x-forwarded-for. */
const from = (ip: string) => new Request("https://example.test/api/x", { headers: { "x-forwarded-for": ip } });

describe("in-memory rate limiter", () => {
    it("allows up to the limit, then refuses with 429 and Retry-After", async () => {
        const ip = "10.0.0.1";
        for (let i = 0; i < 3; i++) {
            expect(await checkRateLimit(from(ip), 3, 60_000)).toBeNull();
        }
        const refused = await checkRateLimit(from(ip), 3, 60_000);
        expect(refused?.status).toBe(429);
        expect(refused?.headers.get("Retry-After")).toBeTruthy();
    });

    it("counts each address separately", async () => {
        expect(await checkRateLimit(from("10.0.0.2"), 1, 60_000)).toBeNull();
        expect(await checkRateLimit(from("10.0.0.3"), 1, 60_000)).toBeNull();
    });

    it("gives every tier its own budget on one address", async () => {
        // The bug this pins: one counter per IP meant the tiers shared a budget
        // and a reset time. Ordinary API traffic (limit 300) left the count high,
        // and the next call on a strict tier (limit 5) was refused for something
        // the caller never did.
        const ip = "10.0.0.4";
        for (let i = 0; i < 10; i++) {
            expect(await checkRateLimit(from(ip), 300, 60_000)).toBeNull();
        }
        expect(await checkRateLimitTier(from(ip), "login")).toBeNull();
        expect(await checkRateLimitTier(from(ip), "signup")).toBeNull();
    });

    it("does not let a long window strand a short one", async () => {
        // Registration holds an hour-long window. Sharing a key would have parked
        // the caller's reset time an hour out for every other endpoint too.
        const ip = "10.0.0.5";
        expect(await checkRateLimitTier(from(ip), "signup")).toBeNull();
        for (let i = 0; i < 5; i++) {
            expect(await checkRateLimitTier(from(ip), "login")).toBeNull();
        }
    });

    it("keeps signup strict enough to matter but usable by a person", async () => {
        const signup = rateLimitTiers.signup;
        expect(signup.limit).toBeLessThanOrEqual(5);
        expect(signup.windowMs).toBe(3_600_000);
    });

    it("refuses the sixth signup from one address within the hour", async () => {
        const ip = "10.0.0.6";
        for (let i = 0; i < rateLimitTiers.signup.limit; i++) {
            expect(await checkRateLimitTier(from(ip), "signup")).toBeNull();
        }
        expect((await checkRateLimitTier(from(ip), "signup"))?.status).toBe(429);
    });
});
