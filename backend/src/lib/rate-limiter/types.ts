export interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number; // timestamp in ms when the limit resets
}

export interface RateLimiterAdapter {
    /**
     * Increment the count for a given key and check against the limit
     * @param key The unique identifier for the client (e.g. IP address)
     * @param limit Maximum allowed requests within the window
     * @param windowMs Time window in milliseconds
     */
    check(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
}
