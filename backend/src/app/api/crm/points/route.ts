import { NextResponse } from "next/server";
import { db } from "@/db";
import { membershipPoints } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const data = await db.query.membershipPoints.findMany({
            orderBy: [desc(membershipPoints.updatedAt)],
            with: {
                customer: true
            }
        });

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Failed to fetch membership points:", error);
        return NextResponse.json({ error: error.message || "Gagal memuat poin loyalitas." }, { status: 500 });
    }
}
