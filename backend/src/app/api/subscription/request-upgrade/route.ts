import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptions, subscriptionEvents, plans } from "@/db/schema/saas";
import { requireOwner } from "@/lib/auth-guard";
import { checkRateLimit } from "@/lib/rate-limit";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

const upgradeSchema = z.object({ planKey: z.string().min(1) });

/**
 * A shop saying which plan it wants to move to.
 *
 * The gates added in the two previous changes all end at "upgrade to Pro", and
 * that sentence pointed at a page whose plan cards listed quotas and told the
 * shop to phone someone. The intent died there: the operator never learned that
 * a shop had tried to open Servis and wanted to pay for it.
 *
 * Like the renewal request, this takes no money — billing is settled by
 * transfer, and the operator still confirms it and moves the plan themselves.
 * What it does is put the ask in their queue with the plan attached.
 */
export async function POST(request: Request) {
    const rateLimited = await checkRateLimit(request, 5, 60_000);
    if (rateLimited) return rateLimited;

    const authResult = await requireOwner();
    if (authResult instanceof NextResponse) return authResult;

    const orgId = authResult.organizationId;
    if (!orgId) {
        return NextResponse.json({ error: "Akun ini tidak terkait toko mana pun." }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsed = upgradeSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Paket tujuan tidak valid", details: parsed.error.format() },
            { status: 400 },
        );
    }

    try {
        // Only a plan actually on sale. Without this the queue could name a
        // retired or internal tier, and the operator would be asked to grant
        // something that is not offered.
        const [target] = await db
            .select({ key: plans.key, name: plans.name })
            .from(plans)
            .where(and(eq(plans.key, parsed.data.planKey), eq(plans.isPublic, true), eq(plans.isActive, true)))
            .limit(1);
        if (!target) {
            return NextResponse.json({ error: "Paket tidak tersedia" }, { status: 400 });
        }

        const [sub] = await db
            .select({ planKey: subscriptions.planKey, status: subscriptions.status })
            .from(subscriptions)
            .where(eq(subscriptions.organizationId, orgId))
            .limit(1);

        if (sub?.planKey === target.key) {
            return NextResponse.json({ error: "Toko Anda sudah memakai paket ini" }, { status: 400 });
        }

        await db.insert(subscriptionEvents).values({
            organizationId: orgId,
            type: "upgrade_requested",
            payload: JSON.stringify({
                by: authResult.user.email,
                from: sub?.planKey ?? null,
                to: target.key,
                statusAtRequest: sub?.status ?? null,
            }),
        });

        return NextResponse.json({
            ok: true,
            message: `Permintaan upgrade ke paket ${target.name} terkirim. Admin akan menghubungi Anda.`,
        });
    } catch (error) {
        console.error("Failed to record upgrade request:", error);
        return NextResponse.json({ error: "Gagal mengirim permintaan" }, { status: 500 });
    }
}
