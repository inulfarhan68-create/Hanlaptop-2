import { Redis } from '@upstash/redis';
import { RateLimiterAdapter, RateLimitResult } from './types';

/**
 * Distributed rate limiter backed by Upstash Redis (fixed-window counter).
 *
 * Unlike the in-memory LRU adapter, counters are shared across all serverless
 * instances, so limits are enforced globally rather than per-instance.
 *
 * Fails OPEN: if Redis is unreachable the request is allowed, so a cache
 * outage degrades protection rather than taking the whole API down.
 */
export class RedisRateLimiter implements RateLimiterAdapter {
    private redis: Redis;

    constructor(url: string, token: string) {
        this.redis = new Redis({ url, token });
    }

    async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
        const redisKey = `ratelimit:${key}`;

        try {
            const count = await this.redis.incr(redisKey);

            // First request in this window — start the expiry clock.
            if (count === 1) {
                await this.redis.pexpire(redisKey, windowMs);
            }

            let ttl = await this.redis.pttl(redisKey);
            if (ttl < 0) {
                // Key exists without a TTL (e.g. a crash between INCR and PEXPIRE)
                // — repair it so the counter cannot get stuck forever.
                await this.redis.pexpire(redisKey, windowMs);
                ttl = windowMs;
            }

            return {
                success: count <= limit,
                limit,
                remaining: Math.max(0, limit - count),
                reset: Date.now() + ttl,
            };
        } catch {
            // Fail open — never block traffic because the limiter is unavailable.
            return {
                success: true,
                limit,
                remaining: limit - 1,
                reset: Date.now() + windowMs,
            };
        }
    }
}
