import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit, RateLimitCategory } from '@/lib/rate-limiter';
// Web Crypto API is globally available in Edge Runtime

export async function middleware(request: NextRequest) {
    // 1. Request ID Generation
    const requestId = crypto.randomUUID();
    
    // Create response object early so we can modify its headers
    let response = NextResponse.next();
    response.headers.set('X-Request-ID', requestId);

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const method = request.method;
    const pathname = request.nextUrl.pathname;

    // 2. Structured Logging / Audit Log
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        requestId,
        level: 'INFO',
        action: 'REQUEST_RECEIVED',
        method,
        path: pathname,
        ip,
        userAgent: request.headers.get('user-agent') || 'unknown'
    }));

    // 3. Rate Limiting
    if (pathname.startsWith('/api/')) {
        let category: RateLimitCategory = 'public';
        
        if (pathname.startsWith('/api/auth')) {
            category = 'auth';
        } else if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            category = 'mutations';
        }

        const rlResult = await checkRateLimit(ip, category);

        // Append rate limit headers
        response.headers.set('X-RateLimit-Limit', rlResult.limit.toString());
        response.headers.set('X-RateLimit-Remaining', rlResult.remaining.toString());
        response.headers.set('X-RateLimit-Reset', rlResult.reset.toString());

        if (!rlResult.success) {
            console.warn(JSON.stringify({
                timestamp: new Date().toISOString(),
                requestId,
                level: 'WARN',
                action: 'RATE_LIMIT_EXCEEDED',
                ip,
                category
            }));
            
            return NextResponse.json(
                { error: 'Too Many Requests' },
                { status: 429, headers: response.headers }
            );
        }
    }

    // 4. CSRF Protection (Origin / Referer Validation)
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const origin = request.headers.get('origin');
        const host = request.headers.get('host');
        
        // For standard cross-site requests, origin is sent. If it exists, it must match our host
        // Note: In development with separated frontend/backend, adjust this logic. 
        // Since Hanlaptop-2 is a single fullstack repo or Next.js proxy, origin might be http://localhost:3000
        if (origin) {
            const originUrl = new URL(origin);
            const isLocalhost = originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1';
            const isSameHost = originUrl.host === host;
            
            if (!isSameHost && !isLocalhost) {
                console.warn(JSON.stringify({
                    timestamp: new Date().toISOString(),
                    requestId,
                    level: 'WARN',
                    action: 'CSRF_BLOCKED',
                    reason: 'Origin mismatch',
                    origin,
                    host
                }));
                return NextResponse.json({ error: 'Forbidden: CSRF blocked' }, { status: 403 });
            }
        }
    }

    // 5. Security Headers
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    // Content-Security-Policy (CSP)
    // Only applied to HTML routes ideally, but putting it globally for strictness
    const csp = `
        default-src 'self';
        script-src 'self' 'unsafe-inline';
        style-src 'self' 'unsafe-inline';
        img-src 'self' data: blob: https://*.public.blob.vercel-storage.com;
        font-src 'self' data:;
        connect-src 'self' https://*.supabase.com;
        frame-ancestors 'none';
    `.replace(/\s{2,}/g, ' ').trim();
    
    response.headers.set('Content-Security-Policy', csp);

    return response;
}

// Ensure middleware runs only on relevant paths
export const config = {
    matcher: [
        // Match all paths EXCEPT health check endpoints (negative lookahead)
        // This regex: (?!) is negative lookahead - matches everything EXCEPT api/health
        '/((?!api/health).*)',
    ],
};
