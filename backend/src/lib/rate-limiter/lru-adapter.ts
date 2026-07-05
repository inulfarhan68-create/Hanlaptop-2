import { LRUCache } from 'lru-cache';
import { RateLimiterAdapter, RateLimitResult } from './types';

// Global cache instance to persist across Next.js hot reloads / API routes
const cache = new LRUCache<string, { count: number; resetTime: number }>({
    max: 5000, // Maximum number of IPs to track
    ttl: 60 * 60 * 1000, // Default TTL 1 hour, items are pruned if untouched
});

export class LRURateLimiter implements RateLimiterAdapter {
    async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
        const now = Date.now();
        const record = cache.get(key);

        if (!record) {
            // First request in the window
            const resetTime = now + windowMs;
            cache.set(key, { count: 1, resetTime }, { ttl: windowMs });
            return {
                success: true,
                limit,
                remaining: limit - 1,
                reset: resetTime,
            };
        }

        if (now > record.resetTime) {
            // Window expired, reset
            const resetTime = now + windowMs;
            cache.set(key, { count: 1, resetTime }, { ttl: windowMs });
            return {
                success: true,
                limit,
                remaining: limit - 1,
                reset: resetTime,
            };
        }

        // Increment existing count
        record.count += 1;
        
        // Ensure cache TTL is updated to match the remaining window time
        const ttlRemaining = record.resetTime - now;
        cache.set(key, record, { ttl: ttlRemaining });

        return {
            success: record.count <= limit,
            limit,
            remaining: Math.max(0, limit - record.count),
            reset: record.resetTime,
        };
    }
}
