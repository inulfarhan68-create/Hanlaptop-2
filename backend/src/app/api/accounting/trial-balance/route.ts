import { NextResponse } from "next/server";
import { requireReportAccess, requireFeature } from "@/lib/auth-guard";
import { getTrialBalance } from "@/services/AccountingService";

export const dynamic = 'force-dynamic';

// GET /api/accounting/trial-balance
// Query params: year, month
export async function GET(request: Request) {
    const authResult = await requireReportAccess();
    if (authResult instanceof NextResponse) return authResult;

    const featureCheck = await requireFeature("accounting");
    if (featureCheck instanceof NextResponse) return featureCheck;

    try {
        const { searchParams } = new URL(request.url);
        const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
        const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));

        const trialBalance = await getTrialBalance(authResult.storeId, year, month);

        return NextResponse.json(trialBalance);
    } catch (error: any) {
        console.error("Failed to fetch trial balance:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch trial balance" },
            { status: 500 }
        );
    }
}
