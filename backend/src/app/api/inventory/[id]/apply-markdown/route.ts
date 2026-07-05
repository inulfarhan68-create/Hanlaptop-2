import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventory, activityLogs, journalEntries, transactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireWriteAccess } from "@/lib/auth-guard";
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

        const result = await InventoryService.applyMarkdown({
            id,
            storeId: authResult.storeId,
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
