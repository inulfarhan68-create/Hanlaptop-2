import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventory, activityLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireOwner, requireOwnerOrManager } from "@/lib/auth-guard";
import { inventorySchema } from "@/lib/validators";

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
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }

        // Only update fields that were actually passed in the request body (ignoring schema defaults for omitted keys)
        const updateData: any = {};
        const allowedFields = [
            'itemName', 
            'category', 
            'sellingPrice', 
            'costPrice', 
            'quantity', 
            'specs', 
            'barcode', 
            'minStock',
            'isPublished',
            'isConsignment',
            'supplierId',
            'condition',
            'imageUrl'
        ];
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updateData[field] = parsed.data[field as keyof typeof parsed.data];
            }
        }
        console.log("[PUT API] updateData constructed:", updateData);

        const [updated] = await db.update(inventory)
            .set(updateData)
            .where(eq(inventory.id, id))
            .returning();

        // Log activity
        await db.insert(activityLogs).values({
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "UPDATE_INVENTORY",
            entityType: "inventory",
            entityId: id,
            details: JSON.stringify({ 
                itemName: updated?.itemName, 
                sellingPrice: updated?.sellingPrice, 
                quantity: updated?.quantity 
            })
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Failed to update item:", error);
        return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
    }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    const authResult = await requireOwnerOrManager();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const { id } = await context.params;
        
        // Log activity before deleting to potentially fetch item name? We just log ID for now to save a query
        await db.insert(activityLogs).values({
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "DELETE_INVENTORY",
            entityType: "inventory",
            entityId: id,
            details: "{}"
        });

        await db.delete(inventory).where(eq(inventory.id, id));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete item:", error);
        return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
    }
}
