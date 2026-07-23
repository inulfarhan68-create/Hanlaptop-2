import { NextResponse } from "next/server";
import { db } from "@/db";
import { chartOfAccounts, journalEntries, transactions } from "@/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { requireReportAccess, requireFeature } from "@/lib/auth-guard";
import { getGeneralLedger, calculateAccountBalance } from "@/services/AccountingService";

export const dynamic = 'force-dynamic';

// GET /api/accounting/general-ledger
// Query params: accountCode (required), year, month
export async function GET(request: Request) {
    const authResult = await requireReportAccess();
    if (authResult instanceof NextResponse) return authResult;

    const featureCheck = await requireFeature("accounting");
    if (featureCheck instanceof NextResponse) return featureCheck;

    try {
        const { searchParams } = new URL(request.url);
        const accountCode = searchParams.get("accountCode");
        const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
        const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));

        if (!accountCode) {
            return NextResponse.json(
                { error: "accountCode is required" },
                { status: 400 }
            );
        }

        // Get ledger data from service
        const ledger = await getGeneralLedger(authResult.storeId, accountCode, year, month);

        return NextResponse.json(ledger);
    } catch (error: any) {
        console.error("Failed to fetch general ledger:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch general ledger" },
            { status: 500 }
        );
    }
}
