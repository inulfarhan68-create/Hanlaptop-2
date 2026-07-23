import { NextResponse } from "next/server";
import { db } from "@/db";
import { stores, userStoreAccess } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        let userStores;
        if ((authResult.user.role === 'owner' || authResult.user.role === 'platform_admin')) {
            // Owner gets all stores automatically
            userStores = await db.select({
                id: stores.id,
                name: stores.name,
                address: stores.address,
                role: sql<string>`'owner'`
            })
            .from(stores);
        } else {
            userStores = await db.select({
                id: stores.id,
                name: stores.name,
                address: stores.address,
                role: userStoreAccess.role
            })
            .from(userStoreAccess)
            .innerJoin(stores, eq(userStoreAccess.storeId, stores.id))
            .where(eq(userStoreAccess.userId, authResult.user.id))
            .groupBy(stores.id);
        }

        return NextResponse.json(userStores);
    } catch (error) {
        console.error("Failed to fetch user stores:", error);
        return NextResponse.json({ error: "Failed to fetch stores" }, { status: 500 });
    }
}
