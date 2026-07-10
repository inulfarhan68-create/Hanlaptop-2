import { NextResponse } from "next/server";

/**
 * Verifies an incoming cron request against CRON_SECRET.
 *
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` automatically when
 * the secret is configured. This helper enforces that.
 *
 * Fail-closed: in production the secret MUST be set — a missing secret rejects
 * the request (503) instead of leaving the endpoint publicly callable. In
 * non-production (local/dev) a missing secret is allowed for convenience.
 *
 * @returns a NextResponse to return immediately if unauthorized, otherwise null.
 */
export function verifyCronRequest(request: Request): NextResponse | null {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        if (process.env.NODE_ENV === "production") {
            return NextResponse.json(
                { error: "Cron endpoint disabled: CRON_SECRET is not configured." },
                { status: 503 }
            );
        }
        return null; // dev/local: allow without a secret
    }

    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return null;
}
