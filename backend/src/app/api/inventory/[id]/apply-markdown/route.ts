import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventory, activityLogs, journalEntries, transactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireWriteAccess, storeScope } from "@/lib/auth-guard";
import { InventoryService } from "@/services/InventoryService";

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    
    const writeAccess = await requireWriteAccess(authResult);
    if (writeAccess instanceof NextResponse) return writeAccess;

    try {
        const body = await request.json();
        const { newPrice } = body;

        if (typeof newPrice !== 'number' || newPrice < 0) {
            return NextResponse.json({ error: "Invalid new price" }, { status: 400 });
        }

        // 🔒 Tenant isolation: confirm the item is within the caller's accessible stores
        // BEFORE mutating, and pass its concrete storeId to the service (never "all"),
        // so an owner cannot mark down another org's inventory.
        const [scopedItem] = await db.select({ storeId: inventory.storeId })
            .from(inventory)
            .where(and(eq(inventory.id, id), storeScope(authResult, inventory.storeId)));

        if (!scopedItem) {
            return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
        }

        const result = await InventoryService.applyMarkdown({
            id,
            storeId: scopedItem.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            newPrice
        });
        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Apply Markdown API error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
