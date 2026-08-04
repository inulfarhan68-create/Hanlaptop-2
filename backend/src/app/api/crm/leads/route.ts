import { NextResponse } from "next/server";
import { db } from "@/db";
import { buybackLeads } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireAuth, storeScope } from "@/lib/auth-guard";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        // 🔒 The "all stores" branch used to run with no WHERE at all, so an owner —
        // whose store selector defaults to "all" — was served every tenant's buyback
        // leads, customer contact details included. storeScope bounds "all" to the
        // caller's own organisation and still handles a specific store.
        const data = await db.query.buybackLeads.findMany({
            where: storeScope(authResult, buybackLeads.storeId),
            orderBy: [desc(buybackLeads.createdAt)],
            with: {
                store: true
            }
        });

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Failed to fetch buyback leads:", error);
        return NextResponse.json({ error: error.message || "Gagal memuat lead buyback." }, { status: 500 });
    }
}
