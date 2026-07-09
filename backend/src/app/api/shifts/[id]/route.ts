import { NextResponse } from "next/server";
import { db } from "@/db";
import { cashierShifts, transactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";
import { withActiveTransactions } from "@/db/query-helpers";

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const { id } = await context.params;

        const shift = await db.query.cashierShifts.findFirst({
            where: and(
                eq(cashierShifts.id, id),
                eq(cashierShifts.storeId, authResult.storeId)
            )
        });

        if (!shift) {
            return NextResponse.json({ error: "Shift not found" }, { status: 404 });
        }

        // Check permission: non-owners/non-managers/non-investors can only view their own shifts
        if (
            shift.userId !== authResult.user.id && 
            authResult.storeRole !== "owner" && 
            authResult.storeRole !== "manager" && 
            authResult.storeRole !== "investor" && 
            (authResult.user as any).role !== "owner"
        ) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Fetch transactions for this shift
        const shiftTransactions = await db.query.transactions.findMany({
            where: withActiveTransactions(eq(transactions.shiftId, shift.id)),
            orderBy: (transactions, { desc }) => [desc(transactions.createdAt)]
        });

        return NextResponse.json({
            shift,
            transactions: shiftTransactions
        });
    } catch (error: any) {
        console.error("Failed to fetch shift details:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch shift details" }, { status: 500 });
    }
}
