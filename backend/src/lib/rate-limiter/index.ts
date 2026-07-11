import { LRURateLimiter } from './lru-adapter';
import { RedisRateLimiter } from './redis-adapter';
import { RateLimiterAdapter, RateLimitResult } from './types';

// Prefer a distributed Upstash Redis limiter when configured — its counters are
// shared across serverless instances, so limits hold globally. Fall back to the
// in-memory LRU adapter (per-instance) when Upstash env vars are absent, e.g.
// local development.
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const adapter: RateLimiterAdapter =
    redisUrl && redisToken
        ? new RedisRateLimiter(redisUrl, redisToken)
        : new LRURateLimiter();

export type RateLimitCategory = 'auth' | 'mutations' | 'public';

interface RateLimitConfig {
    limit: number;
    windowMs: number;
}

// Tiered rate limit configurations
const CONFIGS: Record<RateLimitCategory, RateLimitConfig> = {
    auth: {
        limit: 5,           // 5 requests
        windowMs: 10 * 60 * 1000, // per 10 minutes
    },
    mutations: {
        limit: 30,          // 30 requests
        windowMs: 60 * 1000, // per 1 minute
    },
    public: {
        limit: 100,         // 100 requests
        windowMs: 60 * 1000, // per 1 minute
    }
};

/**
 * Check the rate limit for a given identifier (e.g. IP address)
 * @param ip Client IP address or unique identifier
 * @param category The tier of rate limit to apply
 * @returns RateLimitResult containing success status and headers info
 */
export async function checkRateLimit(ip: string, category: RateLimitCategory): Promise<RateLimitResult> {
    const config = CONFIGS[category];
    const key = `${category}:${ip}`;
    
    return await adapter.check(key, config.limit, config.windowMs);
}
