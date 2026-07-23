import { NextResponse } from 'next/server';
import { db } from '@/db';
import { user, userStoreAccess, stores } from '@/db/schema';
import { requireOwnerOnly, checkQuota, storeScope } from '@/lib/auth-guard';
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

        // Tenant isolation: only list users in the caller's org (platform_admin = all).
        const usersList = await db.select({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
        }).from(user)
        .where(session.isPlatformAdmin ? undefined : eq(user.organizationId, session.organizationId ?? ""));

        const allAccess = await db.select({
            userId: userStoreAccess.userId,
            storeId: userStoreAccess.storeId,
            role: userStoreAccess.role,
            storeName: stores.name,
        })
        .from(userStoreAccess)
        .leftJoin(stores, eq(userStoreAccess.storeId, stores.id))
        .where(storeScope(session, userStoreAccess.storeId));

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

        const quotaCheck = await checkQuota(session, "users");
        if (quotaCheck instanceof NextResponse) return quotaCheck;

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

        // Security: staff may only be assigned to stores within the owner's own
        // tenant. (createUserSchema already restricts role to non-platform tenant roles.)
        if (!session.isPlatformAdmin) {
            const allowed = new Set(session.accessibleStoreIds ?? []);
            if (!targetStoreIds.every((s: string) => allowed.has(s))) {
                return NextResponse.json({ error: "Cabang di luar tenant Anda" }, { status: 403 });
            }
        }

        // Jalankan pendaftaran di server. Tidak akan mengganggu/mengeluarkan sesi Owner yang memanggil API ini.
        // role is input:false — set server-side after creation (below), never here.
        const signUpResult = await auth.api.signUpEmail({
            body: {
                name,
                email,
                password,
            }
        });

        if (!signUpResult || !signUpResult.user) {
            return NextResponse.json({ error: 'Gagal mendaftarkan user' }, { status: 500 });
        }

        const newUser = signUpResult.user;

        // Set the staff role + tenant server-side (input:false at sign-up). Staff
        // belong to the owner's organization.
        await db.update(user)
            .set({ role: role || "kasir", organizationId: session.organizationId })
            .where(eq(user.id, newUser.id));

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
