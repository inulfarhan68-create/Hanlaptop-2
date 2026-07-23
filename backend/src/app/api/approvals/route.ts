import { db } from "@/db";
import { approvalRequests } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { Permissions, hasPermission } from "@/lib/permissions";

export const dynamic = 'force-dynamic';

// GET: List all approval requests for a manager
export async function GET(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    // Only managers or owners can view approvals
    if (authResult.storeRole !== "owner" && authResult.storeRole !== "manager" && authResult.user.role !== "owner" && authResult.user.role !== "platform_admin") {
        return NextResponse.json({ error: "Akses ditolak. Anda bukan Manager/Owner." }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status") || "PENDING";
        const storeId = searchParams.get("storeId"); // from header or query
        const activeStoreId = storeId || authResult.storeId || "default";

        let requests = await db.query.approvalRequests.findMany({
            where: (approvals, { eq, and }) => and(
                eq(approvals.storeId, activeStoreId),
                eq(approvals.status, status)
            ),
            orderBy: [desc(approvalRequests.createdAt)],
            with: {
                requester: {
                    columns: {
                        name: true,
                        email: true
                    }
                },
                approver: {
                    columns: {
                        name: true,
                        email: true
                    }
                }
            }
        });

        return NextResponse.json(requests);
    } catch (error: any) {
        return NextResponse.json({ error: "Failed to fetch approvals", details: error.message }, { status: 500 });
    }
}
