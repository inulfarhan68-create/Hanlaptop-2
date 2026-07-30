import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth-guard";
import { Permissions } from "@/lib/permissions";
import { getAgingReport, AGING_BUCKET_KEYS, type AgingBucket } from "@/services/ReceivablesService";

export const dynamic = 'force-dynamic';

/**
 * GET /api/receivables — unsettled sales/service invoices with a server-computed
 * aging summary. Replaces the piutang page's habit of fetching every transaction
 * and reducing over it in the browser.
 *
 * Query: page, limit, search, bucket (current | d1_30 | d31_60 | d60plus)
 */
export async function GET(request: Request) {
    const authResult = await requirePermission(Permissions.TRANSACTION_READ);
    if (authResult instanceof NextResponse) return authResult;

    try {
        const { searchParams } = new URL(request.url);
        const bucketParam = searchParams.get("bucket");
        const bucket = AGING_BUCKET_KEYS.includes(bucketParam as AgingBucket)
            ? (bucketParam as AgingBucket)
            : undefined;

        const report = await getAgingReport(authResult, {
            kind: "receivable",
            page: Number(searchParams.get("page")) || 1,
            limit: Number(searchParams.get("limit")) || 25,
            search: searchParams.get("search") || undefined,
            bucket,
        });

        return NextResponse.json(report);
    } catch (error: any) {
        console.error("Failed to fetch receivables:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch receivables" },
            { status: 500 }
        );
    }
}
