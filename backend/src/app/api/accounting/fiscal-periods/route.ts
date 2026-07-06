import { NextResponse } from "next/server";
import { db } from "@/db";
import { fiscalPeriods, closingEntries, journalEntries, chartOfAccounts } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireReportAccess, requireOwner } from "@/lib/auth-guard";
import { getIncomeStatement } from "@/services/AccountingService";

export const dynamic = 'force-dynamic';

// GET /api/accounting/fiscal-periods - List all periods
export async function GET(request: Request) {
    const authResult = await requireReportAccess();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const periods = await db.query.fiscalPeriods.findMany({
            where: eq(fiscalPeriods.storeId, authResult.storeId),
            orderBy: [desc(fiscalPeriods.year), desc(fiscalPeriods.month)],
        });

        return NextResponse.json(periods);
    } catch (error: any) {
        console.error("Failed to fetch fiscal periods:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch fiscal periods" },
            { status: 500 }
        );
    }
}

// POST /api/accounting/fiscal-periods - Create new period
export async function POST(request: Request) {
    const authResult = await requireOwner();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const body = await request.json();
        const { year, month } = body;

        if (!year) {
            return NextResponse.json(
                { error: "Year is required" },
                { status: 400 }
            );
        }

        // Check if period already exists
        const existing = await db.query.fiscalPeriods.findFirst({
            where: and(
                eq(fiscalPeriods.storeId, authResult.storeId),
                eq(fiscalPeriods.year, year),
                month !== undefined ? eq(fiscalPeriods.month, month) : sql`${fiscalPeriods.month} IS NULL`
            )
        });

        if (existing) {
            return NextResponse.json(
                { error: "Period already exists" },
                { status: 400 }
            );
        }

        const now = new Date();
        const [newPeriod] = await db.insert(fiscalPeriods).values({
            storeId: authResult.storeId,
            year,
            month: month || null,
            status: 'OPEN',
            createdAt: now,
            updatedAt: now,
        }).returning();

        return NextResponse.json(newPeriod, { status: 201 });
    } catch (error: any) {
        console.error("Failed to create fiscal period:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create fiscal period" },
            { status: 500 }
        );
    }
}

// PATCH /api/accounting/fiscal-periods - Close or reopen period
export async function PATCH(request: Request) {
    const authResult = await requireOwner();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const body = await request.json();
        const { periodId, action, notes } = body;

        if (!periodId || !action) {
            return NextResponse.json(
                { error: "periodId and action are required" },
                { status: 400 }
            );
        }

        const period = await db.query.fiscalPeriods.findFirst({
            where: and(
                eq(fiscalPeriods.id, periodId),
                eq(fiscalPeriods.storeId, authResult.storeId)
            )
        });

        if (!period) {
            return NextResponse.json(
                { error: "Period not found" },
                { status: 404 }
            );
        }

        if (action === 'close') {
            if (period.status === 'CLOSED') {
                return NextResponse.json(
                    { error: "Period is already closed" },
                    { status: 400 }
                );
            }

            // Perform closing entries
            // 1. Close revenue accounts to income summary (3300)
            // 2. Close expense accounts to income summary
            // 3. Close income summary to retained earnings (3200)

            // For now, just mark the period as closed
            const [closedPeriod] = await db.update(fiscalPeriods)
                .set({
                    status: 'CLOSED',
                    closedBy: authResult.user.id,
                    closedAt: new Date(),
                    notes: notes || null,
                    updatedAt: new Date(),
                })
                .where(eq(fiscalPeriods.id, periodId))
                .returning();

            // Create closing entry record
            await db.insert(closingEntries).values({
                storeId: authResult.storeId,
                fiscalPeriodId: periodId,
                closingType: period.month ? 'monthly' : 'yearly',
                closedBy: authResult.user.id,
                netIncome: 0, // Would calculate from income statement
                incomeSummaryAccount: '3300',
                retainedEarningsAccount: '3200',
                closedAt: new Date(),
            });

            return NextResponse.json(closedPeriod);
        } else if (action === 'reopen') {
            if (period.status !== 'CLOSED') {
                return NextResponse.json(
                    { error: "Only closed periods can be reopened" },
                    { status: 400 }
                );
            }

            // Check if there's a later closed period
            const laterClosed = await db.query.fiscalPeriods.findFirst({
                where: and(
                    eq(fiscalPeriods.storeId, authResult.storeId),
                    period.month
                        ? sql`(${fiscalPeriods.year} > ${period.year} OR (${fiscalPeriods.year} = ${period.year} AND ${fiscalPeriods.month} > ${period.month}))`
                        : sql`${fiscalPeriods.year} > ${period.year}`,
                    eq(fiscalPeriods.status, 'CLOSED')
                )
            });

            if (laterClosed) {
                return NextResponse.json(
                    { error: "Cannot reopen a period that has closed periods after it" },
                    { status: 400 }
                );
            }

            // Reopen the period
            const [reopenedPeriod] = await db.update(fiscalPeriods)
                .set({
                    status: 'OPEN',
                    closedBy: null,
                    closedAt: null,
                    updatedAt: new Date(),
                })
                .where(eq(fiscalPeriods.id, periodId))
                .returning();

            // Remove closing entry
            await db.delete(closingEntries)
                .where(eq(closingEntries.fiscalPeriodId, periodId));

            return NextResponse.json(reopenedPeriod);
        } else {
            return NextResponse.json(
                { error: "Invalid action. Use 'close' or 'reopen'" },
                { status: 400 }
            );
        }
    } catch (error: any) {
        console.error("Failed to update fiscal period:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update fiscal period" },
            { status: 500 }
        );
    }
}
