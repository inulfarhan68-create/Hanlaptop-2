import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptions, subscriptionEvents } from "@/db/schema/saas";
import { eq, lt, and } from "drizzle-orm";

/**
 * Cron job endpoint to process subscription states (e.g. active -> past_due).
 * In production, this would be hit securely by Vercel Cron.
 */
export async function POST(request: Request) {
    try {
        // Normally we'd verify an Authorization header matching CRON_SECRET.
        // Skipping for now since it's a stub phase.

        const now = new Date();

        // Find subscriptions that have expired (currentPeriodEnd < now) and are 'active'
        const expiredSubs = await db.select()
            .from(subscriptions)
            .where(
                and(
                    eq(subscriptions.status, 'active'),
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
                payload: JSON.stringify({ reason: 'billing cycle ended without renewal' })
            });
        }

        return NextResponse.json({ processed: expiredSubs.length });
    } catch (error) {
        console.error("Cron billing processing failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
