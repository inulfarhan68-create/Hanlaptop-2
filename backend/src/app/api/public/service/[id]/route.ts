import { NextResponse } from "next/server";
import { db } from "@/db";
import { serviceOrders, activityLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getPublicService } from "@/lib/public/services";

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
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
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
        
        const result = await db.update(serviceOrders)
            .set(updateData)
            .where(eq(serviceOrders.id, id))
            .returning();
            
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
        
        return NextResponse.json(result[0]);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
