import { NextResponse } from "next/server";
import { db } from "@/db";
import { crmReminders } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        let conditions = [];
        if (authResult.storeId !== "all") {
            conditions.push(eq(crmReminders.storeId, authResult.storeId));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const data = await db.query.crmReminders.findMany({
            where: whereClause,
            orderBy: [desc(crmReminders.scheduledDate)],
            with: {
                customer: true,
                store: true
            }
        });

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Failed to fetch CRM reminders:", error);
        return NextResponse.json({ error: error.message || "Gagal memuat pengingat CRM." }, { status: 500 });
    }
}
