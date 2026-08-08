import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptions, subscriptionEvents } from "@/db/schema/saas";
import { requireOwner } from "@/lib/auth-guard";
import { checkRateLimit } from "@/lib/rate-limit";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * A shop telling the operator it wants to renew.
 *
 * Billing is settled by transfer, so nothing here takes money. What was missing
 * is the other direction: the tenant could only be told "contact the admin", and
 * the operator had no way of knowing anyone wanted to pay until they actually
 * got in touch. A shop that clicked "Perpanjang" and found only a phone number
 * had, from the product's point of view, done nothing at all.
 *
 * This records the intent so it surfaces in /platform as a queue. Deliberately
 * NOT a payment claim — the operator still confirms the transfer themselves
 * before granting time, which is the whole point of manual billing.
 *
 * Read-only tenants can call it. A lapsed shop is exactly the one that needs to
 * ask, and refusing it here would leave them with no route back at all.
 */
export async function POST(request: Request) {
    // A request is a human clicking a button, so this is generous; it exists to
    // stop a stuck retry loop filling the operator's queue.
    const rateLimited = await checkRateLimit(request, 5, 60_000);
    if (rateLimited) return rateLimited;

    const authResult = await requireOwner();
    if (authResult instanceof NextResponse) return authResult;

    const orgId = authResult.organizationId;
    if (!orgId) {
        return NextResponse.json({ error: "Akun ini tidak terkait toko mana pun." }, { status: 400 });
    }

    try {
        const [sub] = await db.select({ planKey: subscriptions.planKey, status: subscriptions.status })
            .from(subscriptions)
            .where(eq(subscriptions.organizationId, orgId))
            .limit(1);

        await db.insert(subscriptionEvents).values({
            organizationId: orgId,
            type: "renewal_requested",
            payload: JSON.stringify({
                by: authResult.user.email,
                planKey: sub?.planKey ?? null,
                statusAtRequest: sub?.status ?? null,
            }),
        });

        return NextResponse.json({
            ok: true,
            message: "Permintaan perpanjangan terkirim. Admin akan menghubungi Anda.",
        });
    } catch (error) {
        console.error("Failed to record renewal request:", error);
        return NextResponse.json({ error: "Gagal mengirim permintaan" }, { status: 500 });
    }
}
