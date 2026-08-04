import { NextResponse } from "next/server";
import { db } from "@/db";
import { auditLogs, user } from "@/db/schema";
import { requireOwnerOrManager, storeScope } from "@/lib/auth-guard";
import { eq, desc, and, sql } from "drizzle-orm";

export async function GET(request: Request) {
    const authResult = await requireOwnerOrManager();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get("limit") || "50");
        const page = parseInt(searchParams.get("page") || "1");
        const offset = (page - 1) * limit;

        // An owner's store selector defaults to "all", and `eq(storeId, "all")`
        // matches no row — the audit trail simply looked empty. storeScope bounds
        // "all" to the caller's own stores instead.
        const scope = storeScope(authResult, auditLogs.storeId);

        // Fetch logs with user joined
        const logs = await db
            .select({
                id: auditLogs.id,
                action: auditLogs.action,
                entity: auditLogs.entity,
                entityId: auditLogs.entityId,
                oldValue: auditLogs.oldValue,
                newValue: auditLogs.newValue,
                ipAddress: auditLogs.ipAddress,
                userAgent: auditLogs.userAgent,
                createdAt: auditLogs.createdAt,
                user: {
                    id: user.id,
                    name: user.name,
                    role: user.role
                }
            })
            .from(auditLogs)
            .leftJoin(user, eq(auditLogs.userId, user.id))
            .where(scope)
            .orderBy(desc(auditLogs.createdAt))
            .limit(limit)
            .offset(offset);

        // Fetch total count for pagination
        const [{ count }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(auditLogs)
            .where(scope);

        return NextResponse.json({
            data: logs,
            metadata: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error("Failed to fetch audit logs:", error);
        return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
    }
}
