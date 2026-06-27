import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventory, activityLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireOwnerOrManager } from "@/lib/auth-guard";
import { inventorySchema } from "@/lib/validators";
import { del } from "@vercel/blob";

// ── Helper: hapus blob dari Vercel Storage jika URL adalah Vercel Blob ──
async function deleteBlobIfExists(url: string | null | undefined) {
    if (!url) return;
    try {
        const isVercelBlob =
            url.includes("blob.vercel-storage.com") ||
            url.includes("public.blob.vercel-storage.com");
        if (!isVercelBlob) return;

        const token =
            process.env.BLOB_READ_WRITE_TOKEN ||
            process.env.blob_READ_WRITE_TOKEN;
        const options: any = {};
        if (token) options.token = token;

        await del(url, options);
        console.log("[Blob Cleanup] Berhasil hapus blob:", url);
    } catch (err) {
        // Non-fatal — jangan gagalkan operasi utama
        console.warn("[Blob Cleanup] Gagal hapus blob:", url, err);
    }
}

// ══════════════════════════════════════════
//  PUT — Update item inventory
// ══════════════════════════════════════════
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    const authResult = await requireOwnerOrManager();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const { id } = await context.params;
        const body = await request.json();
        console.log("[PUT API] received body:", body);

        const parsed = inventorySchema.partial().safeParse(body);
        console.log("[PUT API] parsed success:", parsed.success);
        if (!parsed.success) {
            console.log("[PUT API] validation error details:", parsed.error.format());
            return NextResponse.json(
                { error: "Validation failed", details: parsed.error.format() },
                { status: 400 }
            );
        }

        // Ambil data item saat ini (untuk perbandingan imageUrl & quantity)
        const [current] = await db
            .select()
            .from(inventory)
            .where(eq(inventory.id, id))
            .limit(1);

        // Susun hanya field yang dikirim dalam request body
        const updateData: any = {};
        const allowedFields = [
            "itemName",
            "category",
            "sellingPrice",
            "costPrice",
            "quantity",
            "specs",
            "barcode",
            "minStock",
            "isPublished",
            "isConsignment",
            "supplierId",
            "condition",
            "imageUrl",
        ];
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updateData[field] = parsed.data[field as keyof typeof parsed.data];
            }
        }
        console.log("[PUT API] updateData constructed:", updateData);

        const [updated] = await db
            .update(inventory)
            .set(updateData)
            .where(eq(inventory.id, id))
            .returning();

        // ── Blob cleanup: foto lama dihapus jika diganti foto baru ──
        if (
            current?.imageUrl &&
            updateData.imageUrl !== undefined &&
            updateData.imageUrl !== current.imageUrl
        ) {
            await deleteBlobIfExists(current.imageUrl);
        }

        // ── Blob cleanup: foto dihapus jika quantity menjadi 0 (item habis terjual) ──
        if (updateData.quantity === 0 && current?.imageUrl) {
            await deleteBlobIfExists(current.imageUrl);
        }

        // Log aktivitas
        await db.insert(activityLogs).values({
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "UPDATE_INVENTORY",
            entityType: "inventory",
            entityId: id,
            details: JSON.stringify({
                itemName: updated?.itemName,
                sellingPrice: updated?.sellingPrice,
                quantity: updated?.quantity,
            }),
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Failed to update item:", error);
        return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
    }
}

// ══════════════════════════════════════════
//  DELETE — Hapus item inventory
// ══════════════════════════════════════════
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    const authResult = await requireOwnerOrManager();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const { id } = await context.params;

        // Ambil data item sebelum dihapus untuk mendapatkan imageUrl
        const [current] = await db
            .select()
            .from(inventory)
            .where(eq(inventory.id, id))
            .limit(1);

        // Log aktivitas
        await db.insert(activityLogs).values({
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "DELETE_INVENTORY",
            entityType: "inventory",
            entityId: id,
            details: JSON.stringify({ itemName: current?.itemName ?? "unknown" }),
        });

        // Hapus item dari database
        await db.delete(inventory).where(eq(inventory.id, id));

        // ── Blob cleanup: hapus foto dari Vercel Blob Storage ──
        await deleteBlobIfExists(current?.imageUrl);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete item:", error);
        return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
    }
}
