import { NextResponse } from "next/server";
import { db } from "@/db";
import { stores, activityLogs, userStoreAccess, transactions, journalEntries, inventory } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireOwner } from "@/lib/auth-guard";
import { updateStoreSchema } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeInput } from "@/lib/sanitize";

export const dynamic = 'force-dynamic';

// PATCH /api/stores/[id] - Update a store
export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
    const rateLimitResponse = await checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const params = await props.params;
    const authResult = await requireOwner();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const rawBody = await request.json();
        const body = sanitizeInput(rawBody);
        const parsed = updateStoreSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }

        const { name, address, phone } = parsed.data;

        const [updatedStore] = await db.update(stores)
            .set({ 
                name, 
                address, 
                phone,
                updatedAt: new Date()
            })
            .where(eq(stores.id, params.id))
            .returning();

        if (!updatedStore) {
            return NextResponse.json({ error: "Cabang tidak ditemukan" }, { status: 404 });
        }

        // Log activity
        await db.insert(activityLogs).values({
            storeId: params.id,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "UPDATE_STORE",
            entityType: "stores",
            entityId: params.id,
            details: JSON.stringify({ name, address, phone })
        });

        return NextResponse.json(updatedStore);
    } catch (error: any) {
        console.error("Failed to update store:", error);
        return NextResponse.json({ error: "Gagal mengupdate cabang: " + error.message }, { status: 500 });
    }
}

// DELETE /api/stores/[id] - Delete a store
export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    const rateLimitResponse = await checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const params = await props.params;
    const authResult = await requireOwner();
    if (authResult instanceof NextResponse) return authResult;

    try {
        // Validation: Ensure store doesn't have transactions or journal entries before deleting
        const txCount = await db.select({ count: sql`count(*)` }).from(transactions).where(eq(transactions.storeId, params.id));
        const journalCount = await db.select({ count: sql`count(*)` }).from(journalEntries).where(eq(journalEntries.storeId, params.id));

        const numTx = Number(txCount[0]?.count || 0);
        const numJournals = Number(journalCount[0]?.count || 0);

        if (numTx > 0 || numJournals > 0) {
            return NextResponse.json({ 
                error: `Tidak dapat menghapus cabang ini karena sudah memiliki ${numTx} transaksi dan ${numJournals} catatan jurnal. Harap kosongkan atau pindahkan datanya terlebih dahulu jika memungkinkan.`
            }, { status: 400 });
        }

        // If safe to delete, first remove user access rules
        await db.delete(userStoreAccess).where(eq(userStoreAccess.storeId, params.id));
        
        // Remove empty inventory if any
        await db.delete(inventory).where(eq(inventory.storeId, params.id));

        // Finally delete the store
        await db.delete(stores).where(eq(stores.id, params.id));

        // Log activity
        await db.insert(activityLogs).values({
            storeId: params.id,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "DELETE_STORE",
            entityType: "stores",
            entityId: params.id,
            details: "{}"
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Failed to delete store:", error);
        return NextResponse.json({ error: "Gagal menghapus cabang: " + error.message }, { status: 500 });
    }
}
