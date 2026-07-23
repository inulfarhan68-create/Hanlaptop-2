import { NextResponse } from 'next/server';
import { db } from '@/db';
import { user, userStoreAccess } from '@/db/schema';
import { requireOwnerOrManager, storeScope } from "@/lib/auth-guard";
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
    const authResult = await requireOwnerOrManager();
    if (authResult instanceof NextResponse) return authResult;

    try {
        let results: { id: string; name: string; email: string }[] = [];
        if (authResult.storeId === "all") {
            // When viewing "all", still scoped to accessible stores via org membership
            if (authResult.accessibleStoreIds && authResult.accessibleStoreIds.length > 0) {
                const { inArray } = await import("drizzle-orm");
                results = await db.select({
                    id: user.id,
                    name: user.name,
                    email: user.email
                })
                .from(userStoreAccess)
                .innerJoin(user, eq(userStoreAccess.userId, user.id))
                .where(inArray(userStoreAccess.storeId, authResult.accessibleStoreIds));
                // Deduplicate users who have access to multiple stores
                const seen = new Set<string>();
                results = results.filter(r => {
                    if (seen.has(r.id)) return false;
                    seen.add(r.id);
                    return true;
                });
            } else {
                results = [];
            }
        } else {
            results = await db.select({
                id: user.id,
                name: user.name,
                email: user.email
            })
            .from(userStoreAccess)
            .innerJoin(user, eq(userStoreAccess.userId, user.id))
            .where(eq(userStoreAccess.storeId, authResult.storeId));
        }

        return NextResponse.json(results);
    } catch (error) {
        console.error("Failed to fetch store users:", error);
        return NextResponse.json({ error: "Failed to fetch store users" }, { status: 500 });
    }
}
