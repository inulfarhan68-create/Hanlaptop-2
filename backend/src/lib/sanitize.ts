/**
 * Input sanitization utility for XSS and injection prevention.
 *
 * Provides defense-in-depth by sanitizing user input BEFORE storing in the database.
 * Uses a lightweight regex-based HTML stripper to prevent Vercel Serverless crashes.
 */

/**
 * Strips HTML tags and dangerous content from a string.
 *
 * Lightweight, dependency-free alternative to DOMPurify (which crashed on
 * Vercel serverless). Order matters: remove whole <script>/<style> blocks
 * WITH their inner content first, otherwise the plain tag stripper below would
 * leave the executable script / style text behind as plain text.
 */
function sanitizeString(input: string): string {
    if (!input) return input;
    return input
        // Remove <script>...</script> and <style>...</style> including inner content
        .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
        // Strip any remaining HTML tags
        .replace(/<\/?[^>]+(>|$)/g, "")
        .trim();
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
