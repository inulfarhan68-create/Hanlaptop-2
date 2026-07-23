import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventory, activityLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireOwnerOrManager, requirePermission, storeScope } from "@/lib/auth-guard";
import { Permissions } from "@/lib/permissions";
import { AuditService } from "@/services/AuditService";
import { inventorySchema } from "@/lib/validators";
import { del } from "@vercel/blob";

/**
 * Helper: Verify inventory item belongs to user's store (SaaS Tenant Isolation)
 */
async function verifyInventoryAccess(authResult: any, inventoryId: string) {
    // 🔒 Tenant-safe: storeScope handles platform_admin (no filter) vs tenant (inArray).
    // Always returns 404 to prevent enumeration attacks.
    const item = await db.query.inventory.findFirst({
        where: and(
            eq(inventory.id, inventoryId),
            storeScope(authResult, inventory.storeId)
        )
    });

    if (!item) {
        return {
            item: null,
            authorized: false,
            response: NextResponse.json({ error: "Inventory item not found" }, { status: 404 })
        };
    }

    return { item, authorized: true };
}

// ══════════════════════════════════════════
//  PUT — Update item inventory
// ══════════════════════════════════════════
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    const authResult = await requirePermission(Permissions.INVENTORY_EDIT);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await context.params;

    // 🔒 SaaS Tenant Isolation: Verify inventory belongs to user's store
    const { item: existingItem, authorized, response } = await verifyInventoryAccess(authResult, id);
    if (!authorized) return response;

    try {
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
            "tracksSerialNumber",
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
            .where(and(
                eq(inventory.id, id),
                storeScope(authResult, inventory.storeId)
            ))
            .returning();

        // ── Blob cleanup: foto lama dihapus jika diganti foto baru ──
        if (
            existingItem!.imageUrl &&
            updateData.imageUrl !== undefined &&
            updateData.imageUrl !== existingItem!.imageUrl
        ) {
            await deleteBlobIfExists(existingItem!.imageUrl);
        }

        // ── Blob cleanup: foto dihapus jika quantity menjadi 0 (item habis terjual) ──
        if (updateData.quantity === 0 && existingItem!.imageUrl) {
            await deleteBlobIfExists(existingItem!.imageUrl);
        }

        // Log aktivitas
        await db.insert(activityLogs).values({
            storeId: existingItem!.storeId,
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

        // ── SaaS Audit Trail ──
        AuditService.log({
            storeId: existingItem!.storeId,
            userId: authResult.user.id,
            action: 'UPDATE',
            entity: 'INVENTORY',
            entityId: id,
            oldValue: existingItem!,
            newValue: updated,
            req: request as any
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
    const authResult = await requirePermission(Permissions.INVENTORY_DELETE);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await context.params;

    // 🔒 SaaS Tenant Isolation: Verify inventory belongs to user's store
    const { item: existingItem, authorized, response } = await verifyInventoryAccess(authResult, id);
    if (!authorized) return response;

    try {
        // Log aktivitas
        await db.insert(activityLogs).values({
            storeId: existingItem!.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "DELETE_INVENTORY",
            entityType: "inventory",
            entityId: id,
            details: JSON.stringify({ itemName: existingItem!.itemName ?? "unknown" }),
        });

        // Soft delete item dari database
        await db.update(inventory)
            .set({ deletedAt: new Date() })
            .where(and(
                eq(inventory.id, id),
                storeScope(authResult, inventory.storeId)
            ));

        // ── Blob cleanup dihilangkan untuk soft delete (foto tetap disimpan) ──

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete item:", error);
        return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
    }
}

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
