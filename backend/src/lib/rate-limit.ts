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
export type RateLimitTier = "login" | "token" | "export" | "ai" | "api" | "strict" | "default";

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
const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

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
    cleanupExpiredEntries();
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    
    if (!entry || now > entry.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
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
