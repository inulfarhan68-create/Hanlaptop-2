import { NextResponse } from "next/server";
import { db } from "@/db";
import { cashierShifts } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireReportAccess } from "@/lib/auth-guard";

export const dynamic = 'force-dynamic';

export async function GET() {
    const authResult = await requireReportAccess();
    if (authResult instanceof NextResponse) return authResult;

    if (authResult.storeId === "all") {
        return NextResponse.json({ error: "Please select a specific branch to view shift history" }, { status: 400 });
    }

    try {
        let shifts;
        
        // If owner, manager, investor, or globally owner, see all shifts in this store. Otherwise only see self's.
        if (
            authResult.storeRole === "owner" || 
            authResult.storeRole === "manager" || 
            authResult.storeRole === "investor" || 
            (authResult.user as any).role === "owner"
        ) {
            shifts = await db.query.cashierShifts.findMany({
                where: eq(cashierShifts.storeId, authResult.storeId),
                orderBy: [desc(cashierShifts.openedAt)]
            });
        } else {
            shifts = await db.query.cashierShifts.findMany({
                where: and(
                    eq(cashierShifts.storeId, authResult.storeId),
                    eq(cashierShifts.userId, authResult.user.id)
                ),
                orderBy: [desc(cashierShifts.openedAt)]
            });
        }

        return NextResponse.json(shifts);
    } catch (error: any) {
        console.error("Failed to fetch shift history:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch shift history" }, { status: 500 });
    }
}
