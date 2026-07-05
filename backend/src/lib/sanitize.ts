/**
 * Input sanitization utility for XSS and injection prevention.
 * 
 * Provides defense-in-depth by sanitizing user input BEFORE storing in the database.
 * While React auto-escapes rendered output, data may be consumed by:
 * - Excel/PDF exports (no auto-escape)
 * - WhatsApp message templates
 * - Email templates
 * - External API consumers
 * 
 * This sanitizer strips dangerous HTML while preserving safe text content.
 */

/**
 * Strips HTML tags and dangerous attributes from a string.
 * Preserves mathematical operators (<, >) by encoding them as entities.
 */
function sanitizeString(input: string): string {
    return input
        // Remove script tags and their content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove event handler attributes (onerror, onclick, etc.)
        .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
        // Remove javascript: protocol URIs
        .replace(/javascript\s*:/gi, '')
        // Remove data: URIs that could contain HTML
        .replace(/data\s*:\s*text\/html/gi, '')
        // Encode remaining angle brackets to prevent tag injection
        // but only those that look like HTML tags (preceded/followed by letters)
        .replace(/<(\/?[a-zA-Z][^>]*?)>/g, '&lt;$1&gt;')
        // Trim whitespace
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
