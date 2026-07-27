import { NextResponse } from "next/server";
import { db } from "@/db";
import { journalEntries, transactions } from "@/db/schema";
import { and, eq, gte, lte, asc } from "drizzle-orm";
import { requireReportAccess, requireFeature, storeScope } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * Drill-down source for the financial statements: the individual journal lines that
 * make up one account's figure in a period. Unlike /general-ledger (single store,
 * with opening/closing balances), this is storeScope-aware — so it works for both a
 * specific branch and the consolidated "all" view the reports render.
 *
 * GET /api/accounting/account-detail?accountCode=1110&year=2026&month=7
 */
export async function GET(request: Request) {
    const authResult = await requireReportAccess();
    if (authResult instanceof NextResponse) return authResult;

    const featureCheck = await requireFeature("accounting");
    if (featureCheck instanceof NextResponse) return featureCheck;

    try {
        const { searchParams } = new URL(request.url);
        const accountCode = searchParams.get("accountCode");
        if (!accountCode) {
            return NextResponse.json({ error: "accountCode is required" }, { status: 400 });
        }
        const now = new Date();
        const year = parseInt(searchParams.get("year") || String(now.getFullYear()));
        const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1));
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59, 999);

        const rows = await db
            .select({
                id: journalEntries.id,
                transactionId: journalEntries.transactionId,
                accountName: journalEntries.accountName,
                debit: journalEntries.debit,
                credit: journalEntries.credit,
                createdAt: journalEntries.createdAt,
                txDate: transactions.transactionDate,
                txType: transactions.transactionType,
                invoiceNumber: transactions.invoiceNumber,
                description: transactions.description,
            })
            .from(journalEntries)
            .leftJoin(transactions, eq(journalEntries.transactionId, transactions.id))
            .where(
                and(
                    eq(journalEntries.accountCode, accountCode),
                    eq(journalEntries.isVoided, false),
                    gte(journalEntries.createdAt, start),
                    lte(journalEntries.createdAt, end),
                    storeScope(authResult, journalEntries.storeId),
                )
            )
            .orderBy(asc(journalEntries.createdAt))
            .limit(500);

        let totalDebit = 0;
        let totalCredit = 0;
        let running = 0;
        const entries = rows.map((r) => {
            const debit = Number(r.debit) || 0;
            const credit = Number(r.credit) || 0;
            totalDebit += debit;
            totalCredit += credit;
            running += debit - credit;
            return {
                id: r.id,
                transactionId: r.transactionId,
                date: r.txDate ?? r.createdAt,
                transactionType: r.txType,
                invoiceNumber: r.invoiceNumber,
                description: r.description,
                debit,
                credit,
                running, // cumulative (debit - credit) movement within this view
            };
        });

        return NextResponse.json({
            accountCode,
            accountName: rows[0]?.accountName ?? null,
            period: { year, month },
            entries,
            totalDebit,
            totalCredit,
            net: totalDebit - totalCredit,
        });
    } catch (error: any) {
        console.error("Failed to fetch account detail:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch account detail" },
            { status: 500 }
        );
    }
}
