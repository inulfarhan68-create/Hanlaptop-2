import { NextResponse } from "next/server";
import { db } from "@/db";
import { serviceOrders, activityLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getPublicService } from "@/lib/public/services";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    try {
        const result = await getPublicService(id);

        if ("error" in result) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        return NextResponse.json(result.data);
    } catch (error: any) {
        // Never echo the raw message: this is unauthenticated, and a driver or
        // constraint error would describe the schema to whoever asked.
        console.error("Public service portal error:", error);
        return NextResponse.json({ error: "Terjadi kesalahan." }, { status: 500 });
    }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    // The customer portal has no login — the link is the credential — so the
    // throttle is the only thing between a leaked link and an unbounded write
    // loop. Every call here also writes an activityLogs row into the shop's
    // audit trail, so an unthrottled one is a spam pipe into a tenant's records.
    // 10/minute is far above a person tapping a star rating.
    const rateLimited = await checkRateLimit(request, 10, 60_000);
    if (rateLimited) return rateLimited;

    const { id } = await context.params;
    try {
        const body = await request.json();
        const { status, rating, ratingComment } = body;

        const existing = await db.query.serviceOrders.findFirst({
            where: eq(serviceOrders.id, id)
        });

        if (!existing) {
            return NextResponse.json({ error: "Data servis tidak ditemukan." }, { status: 404 });
        }

        const updateData: any = {};

        if (rating !== undefined) {
            const ratingNum = Number(rating);
            if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
                return NextResponse.json({ error: "Rating harus berupa angka antara 1 dan 5." }, { status: 400 });
            }
            if (existing.status !== 'Selesai' && existing.status !== 'Diambil') {
                return NextResponse.json({ error: "Ulasan hanya dapat diberikan setelah servis selesai." }, { status: 400 });
            }
            // One rating per order. Nothing stopped a rating being rewritten, so
            // anyone holding the link could swing a shop's average as often as
            // they liked — and leave an audit row each time.
            if (existing.rating !== null && existing.rating !== undefined) {
                return NextResponse.json({ error: "Ulasan untuk servis ini sudah pernah dikirim." }, { status: 409 });
            }
            updateData.rating = ratingNum;
            updateData.ratingComment = ratingComment || "";
            updateData.ratingAt = new Date();
        }
        
        if (status !== undefined) {
            if (status !== 'Dikerjakan' && status !== 'Batal') {
                return NextResponse.json({ error: "Status tidak valid." }, { status: 400 });
            }
            if (existing.status !== 'Diterima' && existing.status !== 'Menunggu Part') {
                return NextResponse.json({ error: "Status servis saat ini tidak dapat diubah oleh pelanggan." }, { status: 400 });
            }
            updateData.status = status;
        }
        
        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: "Tidak ada data yang diperbarui." }, { status: 400 });
        }
        
        const [updated] = await db.update(serviceOrders)
            .set(updateData)
            .where(eq(serviceOrders.id, id))
            .returning({
                // Explicit, because this answers an unauthenticated caller. It
                // used to return the whole row — storeId, customerId,
                // technicianId, originalTransactionId and the shop's internal
                // `notes` — none of which the portal reads: it only checks
                // res.ok and updates its own state from what it sent.
                id: serviceOrders.id,
                status: serviceOrders.status,
                rating: serviceOrders.rating,
                ratingComment: serviceOrders.ratingComment,
            });


        const actionType = rating !== undefined ? "CUSTOMER_RATED" : `CUSTOMER_${status.toUpperCase()}`;
        await db.insert(activityLogs).values({
            storeId: existing.storeId,
            userId: "public-customer",
            userName: "Pelanggan (Portal Publik)",
            action: actionType,
            entityType: "service_orders",
            entityId: id,
            details: JSON.stringify(updateData)
        });
        
        return NextResponse.json(updated);
    } catch (error: any) {
        // Never echo the raw message: this is unauthenticated, and a driver or
        // constraint error would describe the schema to whoever asked.
        console.error("Public service portal error:", error);
        return NextResponse.json({ error: "Terjadi kesalahan." }, { status: 500 });
    }
}
