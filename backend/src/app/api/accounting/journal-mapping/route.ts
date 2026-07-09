import { NextResponse } from "next/server";
import { requireReportAccess } from "@/lib/auth-guard";
import { mapUnmappedJournalEntries, getMappingStats, validateMappings } from "@/services/JournalMappingService";

export const dynamic = 'force-dynamic';

/**
 * POST /api/accounting/journal-mapping
 * Map unmapped journal entries to account codes
 */
export async function POST(request: Request) {
    const authResult = await requireReportAccess();
    if (authResult instanceof NextResponse) return authResult;

    try {
        // Map all unmapped entries
        const updatedCount = await mapUnmappedJournalEntries(authResult.storeId);

        // Get stats
        const stats = await getMappingStats(authResult.storeId);

        return NextResponse.json({
            success: true,
            message: `Mapped ${updatedCount} journal entries`,
            updatedCount,
            stats
        });
    } catch (error: any) {
        console.error("Failed to map journal entries:", error);
        return NextResponse.json(
            { error: error.message || "Failed to map journal entries" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/accounting/journal-mapping
 * Get mapping statistics and validate mappings
 */
export async function GET(request: Request) {
    const authResult = await requireReportAccess();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const { searchParams } = new URL(request.url);
        const validate = searchParams.get("validate") === "true";

        const stats = await getMappingStats(authResult.storeId);

        let validationResult = null;
        if (validate) {
            validationResult = await validateMappings();
        }

        return NextResponse.json({
            stats,
            validation: validationResult,
            hasInvalidMappings: validationResult ? validationResult.length > 0 : false
        });
    } catch (error: any) {
        console.error("Failed to get mapping stats:", error);
        return NextResponse.json(
            { error: error.message || "Failed to get mapping stats" },
            { status: 500 }
        );
    }
}
