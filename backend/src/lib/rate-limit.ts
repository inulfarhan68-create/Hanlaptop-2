/**
 * Distributed rate limiter for Next.js API routes with local in-memory fallback.
 *
 * Production (Vercel Serverless): Uses Upstash Redis via HTTP REST for stateless,
 * multi-instance accurate rate limiting.
 * Local/Development: Falls back automatically to local in-memory Map rate limiting.
 *
 * Rate Limit Tiers:
 * - login: 5/min (very strict for brute force protection)
 * - token: 20/min (moderate for token refresh)
 * - export: 10/hour (generous but limited)
 * - ai: 30/hour (expensive operations)
 * - strict: 50/min (for sensitive operations)
 * - api: 300/min (standard API)
 * - default: 100/min (fallback)
 */

import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limit tiers for different endpoint types
 */
export type RateLimitTier = "login" | "signup" | "token" | "export" | "ai" | "api" | "strict" | "default";

export interface RateLimitTierConfig {
  limit: number;
  windowMs: number;
  description: string;
}

/**
 * Pre-configured rate limit tiers
 */
export const rateLimitTiers: Record<RateLimitTier, RateLimitTierConfig> = {
  // Very strict - 5 attempts per minute for login
  login: { limit: 5, windowMs: 60_000, description: "Login attempts" },

  // Signing up is a once-per-lifetime action, and each one writes an
  // organization, a store, a subscription, a user and a whole chart of accounts.
  // Per hour rather than per minute, because the thing worth stopping is a
  // script working through a list, not a person who mistyped their password.
  // Still generous enough for a shared office or a phone on CGNAT.
  signup: { limit: 5, windowMs: 3_600_000, description: "Tenant registration" },

  // Moderate - 20 per minute for token refresh
  token: { limit: 20, windowMs: 60_000, description: "Token refresh" },

  // Generous but limited - 10 per hour for exports
  export: { limit: 10, windowMs: 3_600_000, description: "Export operations" },

  // Expensive operations - 30 per hour for AI
  ai: { limit: 30, windowMs: 3_600_000, description: "AI operations" },

  // Strict API - 50 per minute
  strict: { limit: 50, windowMs: 60_000, description: "Strict API" },

  // Standard API - 300 per minute
  api: { limit: 300, windowMs: 60_000, description: "Standard API" },

  // Default fallback - 100 per minute
  default: { limit: 100, windowMs: 60_000, description: "Default" },
};

/**
 * Check rate limit using a specific tier
 */
export async function checkRateLimitTier(
  request: Request,
  tier: RateLimitTier = "default"
): Promise<NextResponse | null> {
  const config = rateLimitTiers[tier];
  return checkRateLimit(request, config.limit, config.windowMs);
}

// Check if Upstash Redis credentials are set
const upstashUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

// Cache for Upstash Ratelimit instances keyed by 'limit-windowMs'
const ratelimitCache = new Map<string, Ratelimit>();

function getUpstashRatelimit(limit: number, windowMs: number): Ratelimit | null {
    if (!upstashUrl || !upstashToken) return null;
    
    const key = `${limit}-${windowMs}`;
    if (ratelimitCache.has(key)) {
        return ratelimitCache.get(key)!;
    }
    
    try {
        const redis = new Redis({
            url: upstashUrl,
            token: upstashToken,
        });
        
        const seconds = Math.max(1, Math.ceil(windowMs / 1000));
        const limiter = new Ratelimit({
            redis: redis,
            limiter: Ratelimit.slidingWindow(limit, `${seconds} s`),
            analytics: true,
            prefix: "@upstash/ratelimit",
        });
        
        ratelimitCache.set(key, limiter);
        return limiter;
    } catch (e) {
        console.error("Error creating Upstash Ratelimit instance:", e);
        return null;
    }
}

// --- In-Memory Fallback State ---
interface RateLimitEntry {
    count: number;
    resetTime: number; // timestamp ms
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let lastCleanup = Date.now();

function cleanupExpiredEntries() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
    lastCleanup = now;
    for (const [key, entry] of rateLimitMap) {
        if (now > entry.resetTime) {
            rateLimitMap.delete(key);
        }
    }
}

function getClientIp(request: Request): string {
    const headersList = new Headers(request.headers);
    const forwarded = headersList.get("x-forwarded-for");
    if (forwarded) {
        return forwarded.split(",")[0].trim();
    }
    return headersList.get("x-real-ip") || "unknown";
}

/**
 * Check rate limit for an incoming request.
 * Returns a NextResponse with 429 status if the limit is exceeded, or null if OK.
 * Supports async execution for Upstash Redis lookup.
 *
 * @param request - The incoming Request object
 * @param limit - Max requests allowed within the window (default 60)
 * @param windowMs - Time window in milliseconds (default 60000 = 1 minute)
 */
export async function checkRateLimit(
    request: Request,
    limit: number = 60,
    windowMs: number = 60_000
): Promise<NextResponse | null> {
    const ip = getClientIp(request);
    
    // 1. Try Upstash Redis Rate Limiting (Distributed)
    const upstashLimiter = getUpstashRatelimit(limit, windowMs);
    if (upstashLimiter) {
        try {
            const { success, limit: limitVal, remaining, reset } = await upstashLimiter.limit(ip);
            if (!success) {
                const now = Date.now();
                const retryAfterSec = Math.max(1, Math.ceil((reset - now) / 1000));
                return NextResponse.json(
                    { error: "Terlalu banyak permintaan. Silakan coba lagi nanti." },
                    {
                        status: 429,
                        headers: {
                            "Retry-After": String(retryAfterSec),
                            "X-RateLimit-Limit": String(limitVal),
                            "X-RateLimit-Remaining": String(remaining),
                            "X-RateLimit-Reset": String(Math.ceil(reset / 1000)),
                        },
                    }
                );
            }
            return null;
        } catch (e) {
            console.error("Upstash Rate Limiter failed, falling back to local memory:", e);
            // fallback to local in-memory map on any Upstash errors
        }
    }
    
    // 2. Local In-Memory Limiting (Fallback / Local Dev)
    //
    // Keyed by tier as well as IP. It used to key on the IP alone, so every tier
    // shared one counter and one reset time: whichever endpoint an address hit
    // first set the window, and the next check compared that shared count
    // against ITS own limit. Six ordinary API calls in a minute (limit 300) left
    // the counter at 6, and the next login attempt (limit 5) was refused. The
    // Upstash path never had this — it builds a separate limiter per
    // limit/window — so it only bites where the fallback runs, which today is
    // production. Adding an hour-long signup tier would have made it routine.
    cleanupExpiredEntries();
    const now = Date.now();
    const bucket = `${ip}:${limit}:${windowMs}`;
    const entry = rateLimitMap.get(bucket);

    if (!entry || now > entry.resetTime) {
        rateLimitMap.set(bucket, { count: 1, resetTime: now + windowMs });
        return null;
    }
    
    entry.count++;
    
    if (entry.count > limit) {
        const retryAfterSec = Math.ceil((entry.resetTime - now) / 1000);
        return NextResponse.json(
            { error: "Terlalu banyak permintaan. Silakan coba lagi nanti." },
            {
                status: 429,
                headers: {
                    "Retry-After": String(retryAfterSec),
                    "X-RateLimit-Limit": String(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": String(Math.ceil(entry.resetTime / 1000)),
                },
            }
        );
    }
    
    return null;
}

/**
 * A ceiling on how often something may happen ACROSS the whole platform, not per
 * caller.
 *
 * Per-IP limiting caps one visitor; it does nothing about the total bill. The
 * public buyback estimate calls Gemini on every request and sits on the landing
 * page as a lead magnet, so its cost scales with traffic — including bot traffic
 * — with no upper bound. This is that bound.
 *
 * Keyed on a fixed name rather than the caller, and on the UTC date so it resets
 * daily. Falls back to the in-memory map when Upstash is absent (local dev),
 * where "global" only means "this process" — acceptable for dev, and the reason
 * production needs Redis for this to mean anything.
 *
 * Returns a 429 when the ceiling is reached, otherwise null.
 */
export async function checkGlobalDailyLimit(
    name: string,
    limit: number
): Promise<NextResponse | null> {
    const day = new Date().toISOString().slice(0, 10);
    const key = `global:${name}:${day}`;
    const refusal = NextResponse.json(
        {
            error: "Kuota estimasi AI harian sudah habis. Silakan coba lagi besok, atau hubungi kami langsung.",
            code: "DAILY_QUOTA_REACHED",
        },
        { status: 429 }
    );

    if (upstashUrl && upstashToken) {
        try {
            const redis = new Redis({ url: upstashUrl, token: upstashToken });
            const used = await redis.incr(key);
            // Only the first write needs an expiry; re-setting it every call would
            // slide the window forward and the counter would never reset.
            if (used === 1) await redis.expire(key, 2 * 24 * 60 * 60);
            return used > limit ? refusal : null;
        } catch (e) {
            console.error("Global daily limiter failed, falling back to local memory:", e);
        }
    }

    const now = Date.now();
    const entry = rateLimitMap.get(key);
    if (!entry || now > entry.resetTime) {
        // Midnight UTC, so the local fallback resets on the same boundary as the key.
        const tomorrow = new Date();
        tomorrow.setUTCHours(24, 0, 0, 0);
        rateLimitMap.set(key, { count: 1, resetTime: tomorrow.getTime() });
        return null;
    }
    entry.count++;
    return entry.count > limit ? refusal : null;
}
