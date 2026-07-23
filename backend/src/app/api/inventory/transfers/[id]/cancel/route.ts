import { NextResponse } from "next/server";
import { db } from "@/db";
import { stockTransfers, activityLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, storeScope } from "@/lib/auth-guard";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const rateLimitResponse = await checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const { id: transferId } = await params;
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        // Fetch Transfer Data
        const transfer = await db.query.stockTransfers.findFirst({
            where: and(eq(stockTransfers.id, transferId), storeScope(authResult, stockTransfers.sourceStoreId))
        });

        if (!transfer) {
            return NextResponse.json({ error: "Transfer stok tidak ditemukan" }, { status: 404 });
        }

        if (transfer.status !== "PENDING") {
            return NextResponse.json({ error: `Transfer ini tidak bisa dibatalkan karena berstatus: ${transfer.status}` }, { status: 400 });
        }

        // Auth Check: Only Owner or Manager from the source store can cancel
        const isAuthorized = 
            (authResult.user.role === "owner" || authResult.user.role === "platform_admin") || 
            authResult.storeRole === "owner" ||
            (authResult.storeId === transfer.sourceStoreId && authResult.storeRole === "manager");

        if (!isAuthorized) {
            return NextResponse.json({ error: "Anda tidak memiliki wewenang untuk membatalkan transfer ini" }, { status: 403 });
        }

        // Update transfer status to CANCELLED
        const [updatedTransfer] = await db.update(stockTransfers)
            .set({
                status: "CANCELLED",
                updatedAt: new Date()
            })
            .where(eq(stockTransfers.id, transferId))
            .returning();

        // Write Activity Log
        await db.insert(activityLogs).values({
            storeId: transfer.sourceStoreId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "CANCEL_TRANSFER",
            entityType: "stock_transfer",
            entityId: transfer.id,
            details: JSON.stringify({ transferNumber: transfer.transferNumber })
        });

        return NextResponse.json({ success: true, transfer: updatedTransfer });
    } catch (error: any) {
        console.error("Failed to cancel stock transfer:", error);
        return NextResponse.json({ error: error.message || "Gagal membatalkan transfer stok" }, { status: 500 });
    }
}
