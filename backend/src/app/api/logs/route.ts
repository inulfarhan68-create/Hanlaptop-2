import { NextResponse } from "next/server";
import { db } from "@/db";
import { activityLogs } from "@/db/schema";
import { requireOwnerOrManager, storeScope } from "@/lib/auth-guard";
import { desc, eq } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export async function GET() {
    const authResult = await requireOwnerOrManager();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const storeCond = storeScope(authResult, activityLogs.storeId);
        const logs = await db.query.activityLogs.findMany({
            where: storeCond,
            orderBy: [desc(activityLogs.createdAt)],
            limit: 100 // fetch last 100 logs
        });
        return NextResponse.json(logs, { status: 200 });
    } catch (error: any) {
        console.error("Failed to fetch logs:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch logs" }, { status: 500 });
    }
}
