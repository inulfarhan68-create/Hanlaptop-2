/**
 * Input sanitization utility for XSS and injection prevention.
 * 
 * Provides defense-in-depth by sanitizing user input BEFORE storing in the database.
 * Uses a lightweight regex-based HTML stripper to prevent Vercel Serverless crashes.
 */

/**
 * Strips HTML tags and dangerous attributes from a string.
 */
function sanitizeString(input: string): string {
    if (!input) return input;
    // Strip HTML tags using regex (lightweight alternative to DOMPurify for serverless)
    return input.replace(/<\/?[^>]+(>|$)/g, "").trim();
}

/**
 * Recursively sanitizes all string values in an object or array.
 * Non-string values are returned unchanged.
 */
export function sanitizeInput<T>(input: T): T {
    if (typeof input === 'string') {
        return sanitizeString(input) as unknown as T;
    }
    
    if (Array.isArray(input)) {
        return input.map(item => sanitizeInput(item)) as unknown as T;
    }
    
    if (input !== null && typeof input === 'object') {
        const sanitized: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(input)) {
            sanitized[key] = sanitizeInput(value);
        }
        return sanitized as T;
    }
    
    return input;
}
