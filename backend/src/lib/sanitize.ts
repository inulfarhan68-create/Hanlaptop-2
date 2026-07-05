import DOMPurify from 'isomorphic-dompurify';

/**
 * Input sanitization utility for XSS and injection prevention.
 * 
 * Provides defense-in-depth by sanitizing user input BEFORE storing in the database.
 * We use DOMPurify alongside Zod schema validation to strip dangerous HTML 
 * while preserving safe text content.
 */

/**
 * Strips HTML tags and dangerous attributes from a string using DOMPurify.
 */
function sanitizeString(input: string): string {
    // Basic DOMPurify config to strip all tags by default (if you only want pure text)
    // If you need to allow basic formatting, change ALLOWED_TAGS.
    return DOMPurify.sanitize(input, {
        ALLOWED_TAGS: [], // No tags allowed by default to prevent any HTML injection in pure text fields
        ALLOWED_ATTR: [],
    }).trim();
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
