import { NextResponse } from "next/server";
import { db } from "@/db";
import { cashierShifts, transactions, journalEntries } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = 'force-dynamic';

export async function GET() {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    if (authResult.storeId === "all") {
        return NextResponse.json({ activeShift: null });
    }

    try {
        const active = await db.query.cashierShifts.findFirst({
            where: and(
                eq(cashierShifts.storeId, authResult.storeId),
                eq(cashierShifts.userId, authResult.user.id),
                eq(cashierShifts.status, "OPEN")
            )
        });

        if (!active) {
            return NextResponse.json({ activeShift: null });
        }

        // Calculate current expected balance in real-time
        const cashEntries = await db
            .select({
                debit: journalEntries.debit,
                credit: journalEntries.credit,
            })
            .from(journalEntries)
            .innerJoin(transactions, eq(journalEntries.transactionId, transactions.id))
            .where(
                and(
                    eq(transactions.shiftId, active.id),
                    eq(journalEntries.accountName, "Kas")
                )
            );

        let netCash = 0;
        cashEntries.forEach(entry => {
            netCash += (entry.debit || 0) - (entry.credit || 0);
        });

        const expectedBalance = active.openingBalance + netCash;

        return NextResponse.json({
            activeShift: {
                ...active,
                expectedBalance
            }
        });
    } catch (error: any) {
        console.error("Failed to fetch active shift:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch active shift" }, { status: 500 });
    }
}
