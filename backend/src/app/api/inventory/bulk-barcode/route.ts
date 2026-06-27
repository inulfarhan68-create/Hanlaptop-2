import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventory, activityLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireOwnerOrManager } from "@/lib/auth-guard";

export async function POST(request: Request) {
    const authResult = await requireOwnerOrManager();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const body = await request.json(); // Expected: Array of { id: string, barcode: string }
        if (!Array.isArray(body)) {
            return NextResponse.json({ error: "Body must be an array" }, { status: 400 });
        }

        if (body.length === 0) {
            return NextResponse.json({ success: true, count: 0 });
        }

        // Perform updates inside a transaction for performance & consistency
        await db.transaction(async (tx) => {
            for (const item of body) {
                if (item.id && item.barcode) {
                    await tx.update(inventory)
                        .set({ barcode: item.barcode })
                        .where(eq(inventory.id, item.id));
                }
            }
        });

        // Log bulk activity
        await db.insert(activityLogs).values({
            storeId: authResult.storeId === "all" ? "default" : authResult.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "UPDATE_INVENTORY_BULK_BARCODE",
            entityType: "inventory",
            entityId: "bulk",
            details: JSON.stringify({ count: body.length })
        });

        return NextResponse.json({ success: true, count: body.length });
    } catch (error) {
        console.error("Failed bulk updating barcodes:", error);
        return NextResponse.json({ error: "Failed bulk updating barcodes" }, { status: 500 });
    }
}
