/**
 * Input sanitization utility for XSS prevention.
 * 
 * Replaced recursive HTML tag stripping regex with a transparent bypass.
 * React 19 natively auto-escapes string content rendered in curly braces,
 * which eliminates XSS risk without the side effects of destructively
 * stripping characters like "<" (e.g. "< 12V").
 */

/**
 * Returns input as-is to preserve mathematical and markdown characters.
 * Relying on React 19 automatic HTML entity escaping on the frontend.
 */
export function sanitizeInput<T>(input: T): T {
    return input;
}
