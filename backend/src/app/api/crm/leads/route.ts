import { NextResponse } from "next/server";
import { db } from "@/db";
import { buybackLeads } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        let data;
        if (authResult.storeId === 'all') {
            data = await db.query.buybackLeads.findMany({
                orderBy: [desc(buybackLeads.createdAt)],
                with: {
                    store: true
                }
            });
        } else {
            data = await db.query.buybackLeads.findMany({
                where: eq(buybackLeads.storeId, authResult.storeId),
                orderBy: [desc(buybackLeads.createdAt)],
                with: {
                    store: true
                }
            });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Failed to fetch buyback leads:", error);
        return NextResponse.json({ error: error.message || "Gagal memuat lead buyback." }, { status: 500 });
    }
}
