import { NextResponse } from 'next/server';
import { db } from '@/db';
import { user, userStoreAccess } from '@/db/schema';
import { requireOwnerOrManager } from '@/lib/auth-guard';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
    const authResult = await requireOwnerOrManager();
    if (authResult instanceof NextResponse) return authResult;

    try {
        let results = [];
        if (authResult.storeId === "all") {
            results = await db.select({
                id: user.id,
                name: user.name,
                email: user.email
            }).from(user);
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
