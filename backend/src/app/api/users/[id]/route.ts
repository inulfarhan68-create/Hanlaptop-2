import { NextResponse } from 'next/server';
import { db } from '@/db';
import { user, session as userSession, account, userStoreAccess } from '@/db/schema';
import { requireOwnerOnly } from '@/lib/auth-guard';
import { updateUserSchema } from '@/lib/validators';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizeInput } from '@/lib/sanitize';
import { eq } from 'drizzle-orm';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const rateLimitResponse = await checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    try {
        const session = await requireOwnerOnly();
        if (session instanceof NextResponse) return session;

        const { id } = await params;
        const rawBody = await request.json();
        const body = sanitizeInput(rawBody);
        const parsed = updateUserSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }

        await db.update(user)
            .set({ name: parsed.data.name, role: parsed.data.role, updatedAt: new Date() })
            .where(eq(user.id, id));

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const rateLimitResponse = await checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    try {
        const session = await requireOwnerOnly();
        if (session instanceof NextResponse) return session;

        const { id } = await params;
        
        // Cannot delete oneself
        if (session.user.id === id) {
             return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
        }

        // Hapus data dependen terlebih dahulu di dalam transaksi untuk menghindari error foreign key constraint SQLite
        await db.transaction(async (tx) => {
            await tx.delete(userSession).where(eq(userSession.userId, id));
            await tx.delete(account).where(eq(account.userId, id));
            await tx.delete(userStoreAccess).where(eq(userStoreAccess.userId, id));
            await tx.delete(user).where(eq(user.id, id));
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Failed to delete user:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
