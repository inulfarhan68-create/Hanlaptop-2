import { NextResponse } from "next/server";
import { db } from "@/db";
import { stores, userStoreAccess } from "@/db/schema";
import { eq, sql, inArray } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        let userStores;
        if ((authResult.user.role === 'owner' || authResult.user.role === 'platform_admin')) {
            // A tenant owner addresses every store in THEIR organization; only
            // platform_admin is global (accessibleStoreIds === null). Without this
            // bound the store switcher listed every tenant's stores.
            const scope = authResult.accessibleStoreIds;
            if (scope !== null && scope.length === 0) return NextResponse.json([]);

            userStores = await db.select({
                id: stores.id,
                name: stores.name,
                address: stores.address,
                role: sql<string>`'owner'`
            })
            .from(stores)
            .where(scope === null ? undefined : inArray(stores.id, scope));
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
            // Every selected column must be grouped: grouping by stores.id alone made
            // Postgres reject user_store_access.role (42803), so this endpoint 500'd for
            // every non-owner role. Grouping the full projection keeps the dedupe intent.
            .groupBy(stores.id, stores.name, stores.address, userStoreAccess.role);
        }

        return NextResponse.json(userStores);
    } catch (error) {
        console.error("Failed to fetch user stores:", error);
        return NextResponse.json({ error: "Failed to fetch stores" }, { status: 500 });
    }
}
