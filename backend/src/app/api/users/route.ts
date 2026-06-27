import { NextResponse } from 'next/server';
import { db } from '@/db';
import { user, userStoreAccess, stores } from '@/db/schema';
import { requireOwnerOnly } from '@/lib/auth-guard';
import { createUserSchema } from '@/lib/validators';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizeInput } from '@/lib/sanitize';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await requireOwnerOnly();
        if (session instanceof NextResponse) return session;

        const usersList = await db.select({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
        }).from(user);

        const allAccess = await db.select({
            userId: userStoreAccess.userId,
            storeId: userStoreAccess.storeId,
            role: userStoreAccess.role,
            storeName: stores.name,
        })
        .from(userStoreAccess)
        .leftJoin(stores, eq(userStoreAccess.storeId, stores.id));

        const usersWithAccess = usersList.map(u => {
            const accesses = allAccess.filter(a => a.userId === u.id);
            return {
                ...u,
                stores: accesses.map(a => ({
                    storeId: a.storeId,
                    storeName: a.storeName,
                    role: a.role
                }))
            };
        });

        return NextResponse.json(usersWithAccess);
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const rateLimitResponse = await checkRateLimit(request, 20, 60_000); // 20 user registrations per minute
    if (rateLimitResponse) return rateLimitResponse;

    try {
        const session = await requireOwnerOnly();
        if (session instanceof NextResponse) return session;

        const rawBody = await request.json();
        const body = sanitizeInput(rawBody);
        const parsed = createUserSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }

        const { name, email, password, role, storeId, storeIds } = parsed.data;

        const targetStoreIds = storeIds || (storeId ? [storeId] : []);
        if (targetStoreIds.length === 0) {
            return NextResponse.json(
                { error: 'Cabang wajib diisi' },
                { status: 400 }
            );
        }

        // Jalankan pendaftaran di server. Tidak akan mengganggu/mengeluarkan sesi Owner yang memanggil API ini.
        const signUpResult = await auth.api.signUpEmail({
            body: {
                name,
                email,
                password,
                role,
            }
        });

        if (!signUpResult || !signUpResult.user) {
            return NextResponse.json({ error: 'Gagal mendaftarkan user' }, { status: 500 });
        }

        const newUser = signUpResult.user;

        // Bersihkan jika ada akses lama (safety check)
        await db.delete(userStoreAccess).where(eq(userStoreAccess.userId, newUser.id));

        // Buat record akses cabang untuk user baru
        for (const sId of targetStoreIds) {
            await db.insert(userStoreAccess).values({
                userId: newUser.id,
                storeId: sId,
                role: role || 'kasir',
                createdAt: new Date(),
            });
        }

        return NextResponse.json({ success: true, user: newUser });
    } catch (error: any) {
        console.error("Failed to register user from API:", error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: error.status || 500 }
        );
    }
}
