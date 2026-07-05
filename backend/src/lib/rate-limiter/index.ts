import { LRURateLimiter } from './lru-adapter';
import { RateLimiterAdapter, RateLimitResult } from './types';

// Use LRU cache by default. In the future, this can be swapped with a RedisAdapter
const adapter: RateLimiterAdapter = new LRURateLimiter();

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
