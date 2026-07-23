import { NextResponse } from "next/server";
import { db } from "@/db";
import { purchaseRequisitions, inventory } from "@/db/schema";
import { and, eq, like } from "drizzle-orm";
import { requireAuth, storeScope } from "@/lib/auth-guard";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const body = await request.json();
        const { status, notes } = body;

        if (!status) {
            return NextResponse.json({ error: "Status wajib disertakan." }, { status: 400 });
        }

        // 🔒 SaaS Tenant Isolation: Fetch with storeScope
        const existing = await db.query.purchaseRequisitions.findFirst({
            where: and(eq(purchaseRequisitions.id, id), storeScope(authResult, purchaseRequisitions.storeId))
        });

        if (!existing) {
            return NextResponse.json({ error: "Permintaan pembelian tidak ditemukan." }, { status: 404 });
        }

        // Use the actual storeId from the requisition
        const actualStoreId = existing.storeId;

        const updateData: any = {};

        if (status === "APPROVED" || status === "REJECTED") {
            const isOwnerOrManager = authResult.storeRole === "owner" ||
                                     authResult.storeRole === "manager" ||
                                     (authResult.user.role === "owner" || authResult.user.role === "platform_admin") ||
                                     authResult.user.role === "manager";
            if (!isOwnerOrManager) {
                return NextResponse.json({ error: "Hanya Owner atau Manager yang dapat menyetujui pengajuan pembelian." }, { status: 403 });
            }
            updateData.status = status;
            updateData.approvedBy = authResult.user.name || "Owner";
            updateData.approvedAt = new Date();
        } else if (status === "RECEIVED") {
            if (existing.status !== "APPROVED") {
                return NextResponse.json({ error: "Permintaan pembelian harus disetujui (APPROVED) terlebih dahulu sebelum ditandai diterima." }, { status: 400 });
            }
            updateData.status = status;

            // Automatically increase/create inventory item
            // 1. Search matching item in branch
            const matchedItem = await db.query.inventory.findFirst({
                where: and(
                    eq(inventory.storeId, actualStoreId),
                    like(inventory.itemName, existing.itemName)
                )
            });

            if (matchedItem) {
                // Increment quantity
                const newQty = matchedItem.quantity + existing.quantity;
                await db.update(inventory)
                    .set({ quantity: newQty })
                    .where(eq(inventory.id, matchedItem.id));
            } else {
                // Insert new inventory item
                const unitCost = Number((existing.estimatedCost / existing.quantity).toFixed(2)) || 0;
                await db.insert(inventory).values({
                    id: crypto.randomUUID(),
                    storeId: actualStoreId,
                    itemName: existing.itemName,
                    category: "Sparepart", // default category for requisitioned parts
                    quantity: existing.quantity,
                    costPrice: unitCost,
                    sellingPrice: Math.round(unitCost * 1.25), // 25% markup default
                    minStock: 2,
                    createdAt: new Date()
                });
            }
        } else {
            updateData.status = status;
        }

        if (notes !== undefined) {
            updateData.notes = notes;
        }

        const result = await db.update(purchaseRequisitions)
            .set(updateData)
            .where(eq(purchaseRequisitions.id, id))
            .returning();

        return NextResponse.json(result[0]);
    } catch (error: any) {
        console.error("Failed to update purchase requisition:", error);
        return NextResponse.json({ error: error.message || "Gagal memperbarui permintaan pembelian." }, { status: 500 });
    }
}
