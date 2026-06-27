import { NextResponse } from 'next/server';
import { db } from '@/db';
import { userStoreAccess } from '@/db/schema';
import { requireOwnerOnly } from '@/lib/auth-guard';
import { assignStoreSchema } from '@/lib/validators';
import { checkRateLimit } from '@/lib/rate-limit';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
    const rateLimitResponse = await checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    try {
        const session = await requireOwnerOnly();
        if (session instanceof NextResponse) return session;

        const { id } = await props.params;
        const body = await request.json();
        const parsed = assignStoreSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }

        const storeIds = parsed.data.storeIds || (parsed.data.storeId ? [parsed.data.storeId] : []);
        if (storeIds.length === 0) {
            return NextResponse.json({ error: 'At least one storeId is required' }, { status: 400 });
        }

        // Delete existing access for this user
        await db.delete(userStoreAccess).where(eq(userStoreAccess.userId, id));

        // Insert new store accesses
        for (const storeId of storeIds) {
            await db.insert(userStoreAccess).values({
                userId: id,
                storeId,
                role: parsed.data.role || 'kasir',
                createdAt: new Date(),
            });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Failed to assign store:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
