import { NextResponse } from "next/server";
import { requireReportAccess } from "@/lib/auth-guard";
import { getEquityChanges } from "@/services/AccountingService";

export const dynamic = 'force-dynamic';

// GET /api/accounting/equity-changes
// Query params: year, month
export async function GET(request: Request) {
    const authResult = await requireReportAccess();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const { searchParams } = new URL(request.url);
        const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
        const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));

        const equityChanges = await getEquityChanges(authResult.storeId, year, month);

        return NextResponse.json(equityChanges);
    } catch (error: any) {
        console.error("Failed to fetch equity changes:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch equity changes" },
            { status: 500 }
        );
    }
}
