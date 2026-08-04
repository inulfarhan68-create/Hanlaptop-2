import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptions, subscriptionEvents } from "@/db/schema/saas";
import { eq, lt, and, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Marks subscriptions whose paid period has elapsed as `past_due`.
 *
 * This keeps the stored status honest (it is what the billing UI and reports
 * read). It is NOT what enforces the lock: auth-guard derives read-only from
 * `currentPeriodEnd` directly, so access is correct even if this never runs.
 *
 * Two bugs kept it inert until now: it was never listed in vercel.json, and it
 * only exported POST while Vercel Cron issues GET (405). It also swept only
 * `active`, leaving expired trials at `trialing` forever.
 */
async function handle(request: Request) {
    try {
        // SECURITY: only the platform scheduler may run billing. Vercel Cron sends
        // `Authorization: Bearer <CRON_SECRET>`. Fail-closed if the secret is unset.
        const cronSecret = process.env.CRON_SECRET;
        if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const now = new Date();

        // Any paying state whose period has elapsed — `trialing` included, which the
        // original sweep missed entirely (an expired trial never left `trialing`).
        const expiredSubs = await db.select()
            .from(subscriptions)
            .where(
                and(
                    inArray(subscriptions.status, ['active', 'trialing']),
                    lt(subscriptions.currentPeriodEnd, now)
                )
            );

        if (expiredSubs.length === 0) {
            return NextResponse.json({ processed: 0 });
        }

        // Mark them as past_due
        for (const sub of expiredSubs) {
            await db.update(subscriptions)
                .set({ status: 'past_due', updatedAt: new Date() })
                .where(eq(subscriptions.id, sub.id));

            await db.insert(subscriptionEvents).values({
                organizationId: sub.organizationId,
                type: 'past_due',
                payload: JSON.stringify({
                    reason: sub.status === 'trialing'
                        ? 'trial ended without conversion'
                        : 'billing cycle ended without renewal',
                    previousStatus: sub.status,
                })
            });
        }

        return NextResponse.json({ processed: expiredSubs.length });
    } catch (error) {
        console.error("Cron billing processing failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// Vercel Cron issues GET. POST kept so the existing manual/webhook callers and
// tests keep working.
export const GET = handle;
export const POST = handle;
