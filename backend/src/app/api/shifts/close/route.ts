import { NextResponse } from "next/server";
import { db } from "@/db";
import { cashierShifts, transactions, journalEntries, activityLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";
import { closeShiftSchema } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeInput } from "@/lib/sanitize";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const rateLimitResponse = await checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    if (authResult.storeId === "all") {
        return NextResponse.json({ error: "Please select a specific branch to close a shift" }, { status: 400 });
    }

    try {
        const rawBody = await request.json();
        const body = sanitizeInput(rawBody);
        const parsed = closeShiftSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }

        const { closingBalance, notes } = parsed.data;

        // Get active shift
        const active = await db.query.cashierShifts.findFirst({
            where: and(
                eq(cashierShifts.storeId, authResult.storeId),
                eq(cashierShifts.userId, authResult.user.id),
                eq(cashierShifts.status, "OPEN")
            )
        });

        if (!active) {
            return NextResponse.json({ error: "Anda tidak memiliki shift aktif yang sedang berjalan di cabang ini" }, { status: 400 });
        }

        // Calculate expected balance using double-entry bookkeeping journal entries
        // Select all journal entries with accountName = 'Kas' for transactions belonging to this shift
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
        const closingBalNum = closingBalance;
        const difference = closingBalNum - expectedBalance;

        // Close shift
        const [closedShift] = await db
            .update(cashierShifts)
            .set({
                status: "CLOSED",
                closedAt: new Date(),
                closingBalance: closingBalNum,
                expectedBalance,
                difference,
                notes: notes || active.notes,
            })
            .where(eq(cashierShifts.id, active.id))
            .returning();

        // Log activity
        await db.insert(activityLogs).values({
            storeId: authResult.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "CLOSE_SHIFT",
            entityType: "settings",
            entityId: active.id,
            details: JSON.stringify({
                openedAt: active.openedAt,
                openingBalance: active.openingBalance,
                closingBalance: closingBalNum,
                expectedBalance,
                difference,
            })
        });

        return NextResponse.json(closedShift);
    } catch (error: any) {
        console.error("Failed to close shift:", error);
        return NextResponse.json({ error: error.message || "Failed to close shift" }, { status: 500 });
    }
}
