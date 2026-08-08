import { NextResponse } from "next/server";
import { db } from "@/db";
import { activityLogs } from "@/db/schema";
import { requireOwnerOrManager, requireFeature, storeScope } from "@/lib/auth-guard";
import { desc, and, or, ilike, inArray, count, type SQL } from "drizzle-orm";
import { actionCodesMatching, entityTypesMatching, ACTION_GROUPS } from "@/lib/audit-labels";

export const dynamic = 'force-dynamic';

/**
 * GET /api/logs — activity log, newest first.
 *
 * This used to return a hard-capped last-100 and let the browser filter them,
 * which quietly broke the search: anything older than the hundredth entry could
 * not be found at all, and nothing on the page hinted that it was looking at a
 * slice. Filtering and paging now happen in the query, over the whole log.
 *
 * Query: page, limit, search, action (all | create | edit | delete | shift)
 */
export async function GET(request: Request) {
    const authResult = await requireOwnerOrManager();
    if (authResult instanceof NextResponse) return authResult;

    // The page is gated, but a bookmarked fetch is not — enforce the plan where
    // the data actually leaves. preAuth so the whole auth chain is not re-run.
    const gate = await requireFeature("auditTrail", authResult);
    if (gate instanceof NextResponse) return gate;

    try {
        const { searchParams } = new URL(request.url);
        const page = Math.max(1, Number(searchParams.get("page")) || 1);
        const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit")) || 50));
        const search = (searchParams.get("search") || "").trim();
        const action = searchParams.get("action") || "all";

        const conditions: SQL[] = [];
        const scope = storeScope(authResult, activityLogs.storeId);
        if (scope) conditions.push(scope);

        if (search) {
            // The user types the Indonesian label ("Pelunasan Piutang") while the
            // column holds the raw code (LUNASI_TRANSACTION), so resolve the term
            // through the shared label map before matching.
            const codes = actionCodesMatching(search);
            const entities = entityTypesMatching(search);
            const parts: SQL[] = [ilike(activityLogs.userName, `%${search}%`)];
            if (codes.length) parts.push(inArray(activityLogs.action, codes));
            if (entities.length) parts.push(inArray(activityLogs.entityType, entities));
            // Also match the raw column, for codes that have no label entry.
            parts.push(ilike(activityLogs.action, `%${search}%`));

            const textMatch = or(...parts);
            if (textMatch) conditions.push(textMatch);
        }

        const group = ACTION_GROUPS[action];
        if (group) {
            const groupMatch = or(...group.map((kw) => ilike(activityLogs.action, `%${kw}%`)));
            if (groupMatch) conditions.push(groupMatch);
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const [items, [totalRow]] = await Promise.all([
            db.query.activityLogs.findMany({
                where: whereClause,
                orderBy: [desc(activityLogs.createdAt)],
                limit,
                offset: (page - 1) * limit,
            }),
            db.select({ value: count() }).from(activityLogs).where(whereClause),
        ]);

        const totalItems = Number(totalRow?.value) || 0;

        return NextResponse.json({
            items,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages: Math.max(1, Math.ceil(totalItems / limit)),
            },
        }, { status: 200 });
    } catch (error: any) {
        console.error("Failed to fetch logs:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch logs" }, { status: 500 });
    }
}
