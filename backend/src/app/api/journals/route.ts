import { NextResponse } from "next/server";
import { db } from "@/db";
import { journalEntries, transactions } from "@/db/schema";
import { eq, desc, gte, lte, and } from "drizzle-orm";
import { requireReportAccess, storeScope } from "@/lib/auth-guard";
import { withActiveJournalEntries } from "@/db/query-helpers";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authResult = await requireReportAccess();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get("from") || searchParams.get("startDate");
        const endDate = searchParams.get("to") || searchParams.get("endDate");
        const accountName = searchParams.get("accountName");
        const showVoided = searchParams.get("showVoided") === "true";

        let conditions = [];
        
        const scope = storeScope(authResult, journalEntries.storeId);
        if (scope) conditions.push(scope);
        if (startDate) {
            conditions.push(gte(journalEntries.createdAt, new Date(startDate)));
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            conditions.push(lte(journalEntries.createdAt, end));
        }
        if (accountName && accountName !== 'all') {
            conditions.push(eq(journalEntries.accountName, accountName));
        }

        const baseWhere = conditions.length > 0 ? and(...conditions) : undefined;
        const whereClause = showVoided ? baseWhere : withActiveJournalEntries(baseWhere);

        const results = await db.select({
            id: journalEntries.id,
            transactionId: journalEntries.transactionId,
            accountName: journalEntries.accountName,
            debit: journalEntries.debit,
            credit: journalEntries.credit,
            createdAt: journalEntries.createdAt,
            transaction: {
                transactionType: transactions.transactionType,
                invoiceNumber: transactions.invoiceNumber,
                description: transactions.description,
            }
        })
        .from(journalEntries)
        .leftJoin(transactions, eq(journalEntries.transactionId, transactions.id))
        .where(whereClause)
        .orderBy(desc(journalEntries.createdAt));

        return NextResponse.json(results, { status: 200 });
    } catch (error: any) {
        console.error("Failed to fetch journal entries:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch journal entries" }, { status: 500 });
    }
}
