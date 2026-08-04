import { NextResponse } from "next/server";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { subscriptions, plans, subscriptionEvents } from "@/db/schema/saas";
import { requirePlatformAdmin } from "@/lib/auth-guard";
import { manualSubscriptionSchema } from "@/lib/validators";
import { addMonths } from "@/lib/subscription-status";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Record a manually-settled subscription payment.
 *
 * Billing has no payment gateway: a shop transfers the money and the platform
 * operator marks it here. Without this endpoint the write-lock added for lapsed
 * subscriptions would have no way to be released short of hand-editing the
 * production database.
 *
 * Platform-admin only, and deliberately not reachable by a tenant — a tenant
 * being able to extend its own subscription would make the whole gate decorative.
 */
export async function POST(request: Request) {
    const authResult = await requirePlatformAdmin();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const parsed = manualSubscriptionSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Validasi gagal", details: parsed.error.format() },
                { status: 400 }
            );
        }
        const { organizationId, planKey, months, note } = parsed.data;

        const [org] = await db.select({ id: organizations.id, name: organizations.name })
            .from(organizations)
            .where(eq(organizations.id, organizationId))
            .limit(1);
        if (!org) {
            return NextResponse.json({ error: "Organisasi tidak ditemukan" }, { status: 404 });
        }

        // Any active plan may be assigned here, including non-public ones: this is
        // the operator's console, not self-serve checkout (which stays restricted
        // to public, self-serve plans in /api/subscription/checkout).
        const [plan] = await db.select().from(plans).where(eq(plans.key, planKey)).limit(1);
        if (!plan || !plan.isActive) {
            return NextResponse.json({ error: "Paket tidak valid" }, { status: 400 });
        }

        const now = new Date();
        const [existing] = await db.select()

            .from(subscriptions)
            .where(eq(subscriptions.organizationId, organizationId))
            .limit(1);

        // Renewing early must not burn the days already paid for, so extend from
        // whichever is later. A lapsed subscription restarts from today rather
        // than back-dating into the gap the shop did not pay for.
        const previousEnd = existing?.currentPeriodEnd ?? null;
        const stillRunning = previousEnd !== null && previousEnd.getTime() > now.getTime();
        const newEnd = addMonths(stillRunning ? previousEnd : now, months);

        if (existing) {
            await db.update(subscriptions)
                .set({
                    planKey,
                    status: "active",
                    // Keep the original start when extending an unexpired period —
                    // it is the same billing run, just longer.
                    currentPeriodStart: stillRunning ? existing.currentPeriodStart : now,
                    currentPeriodEnd: newEnd,
                    cancelAtPeriodEnd: false,
                    updatedAt: now,
                })
                .where(eq(subscriptions.id, existing.id));
        } else {
            await db.insert(subscriptions).values({
                organizationId,
                planKey,
                status: "active",
                currentPeriodStart: now,
                currentPeriodEnd: newEnd,
            });
        }

        // subscriptionEvents (org-scoped) rather than auditLogs, which is keyed to a
        // storeId and has no entity type for billing — there is no honest store to
        // attribute a tenant-wide subscription change to.
        await db.insert(subscriptionEvents).values({
            organizationId,
            type: existing ? "manual_renewal" : "manual_activation",
            payload: JSON.stringify({
                by: authResult.user.email,
                planKey,
                months,
                previousStatus: existing?.status ?? null,
                previousPeriodEnd: previousEnd?.toISOString() ?? null,
                newPeriodEnd: newEnd.toISOString(),
                note: note ?? null,
            }),
        });

        return NextResponse.json({
            organizationId,
            organizationName: org.name,
            planKey,
            status: "active",
            currentPeriodEnd: newEnd.toISOString(),
        });
    } catch (error) {
        console.error("Manual subscription activation failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
