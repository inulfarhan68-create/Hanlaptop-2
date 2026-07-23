import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { organizations, stores } from "@/db/schema/store";
import { subscriptions, plans } from "@/db/schema/saas";
import { userStoreAccess } from "@/db/schema/store";
import { user } from "@/db/schema/users";
import { seedStoreCoa } from "@/db/seed-coa";
import { auth } from "@/lib/auth";
import crypto from "crypto";
import { eq } from "drizzle-orm";

const registerSchema = z.object({
    name: z.string().min(2, "Nama terlalu pendek"),
    email: z.string().email("Email tidak valid"),
    password: z.string().min(8, "Password minimal 8 karakter"),
    storeName: z.string().min(3, "Nama toko minimal 3 karakter"),
    phone: z.string().optional(),
    planKey: z.string().min(1, "Paket harus dipilih"),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const parsed = registerSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { message: "Validasi gagal", errors: parsed.error.format() },
                { status: 400 }
            );
        }

        const { name, email, password, storeName, phone, planKey } = parsed.data;

        // 1. Check if email exists to fail fast
        const existingUsers = await db.query.user.findMany({
            where: (u, { eq }) => eq(u.email, email.toLowerCase())
        });

        if (existingUsers.length > 0) {
            return NextResponse.json(
                { message: "Email sudah terdaftar" },
                { status: 409 }
            );
        }

        // Validate planKey is a real, public, SELF-SERVE plan — never `internal`
        // (unlimited) or `enterprise` (custom/contact), which would otherwise grant
        // a free unlimited trial to anyone who registers.
        const [selectedPlan] = await db.select().from(plans).where(eq(plans.key, planKey)).limit(1);
        if (!selectedPlan || !selectedPlan.isActive || !selectedPlan.isPublic || selectedPlan.priceMonthly === null) {
            return NextResponse.json({ message: "Paket tidak valid" }, { status: 400 });
        }

        const orgId = crypto.randomUUID();
        const storeId = crypto.randomUUID();

        // 2. Transactionally create the tenant infrastructure
        try {
            await db.transaction(async (tx) => {
                // A. Organization
                await tx.insert(organizations).values({
                    id: orgId,
                    name: storeName, // By default org name = first store name
                });

                // B. Store
                await tx.insert(stores).values({
                    id: storeId,
                    organizationId: orgId,
                    name: storeName,
                    phone: phone || null,
                });

                // C. Subscription (14-day trial)
                const now = new Date();
                const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
                await tx.insert(subscriptions).values({
                    organizationId: orgId,
                    planKey: planKey,
                    status: "trialing",
                    currentPeriodStart: now,
                    currentPeriodEnd: trialEnd,
                });

                // D. Seed COA
                await seedStoreCoa(storeId, { tx });
            });
        } catch (error: any) {
            console.error("Tenant DB Setup failed:", error);
            return NextResponse.json(
                { message: "Gagal menyiapkan database toko", error: error.message },
                { status: 500 }
            );
        }

        // 3. Create the user using BetterAuth API
        // This will hash the password, create the user, create the session, and give us cookies.
        let authRes;
        try {
            // role/organizationId are input:false — set server-side below, NOT here.
            authRes = await auth.api.signUpEmail({
                body: {
                    email,
                    password,
                    name,
                },
                headers: req.headers,
            });
        } catch (error: any) {
            console.error("BetterAuth signUp failed:", error);
            // Compensating transaction: delete the org (cascades to store, sub)
            await db.delete(organizations).where(eq(organizations.id, orgId));
            
            return NextResponse.json(
                { message: "Gagal mendaftarkan pengguna", error: error.message },
                { status: 500 }
            );
        }

        // Promote the new user to tenant owner SERVER-SIDE (role/organizationId are
        // input:false at sign-up) and grant explicit store access. If this fails the
        // account can't function, so roll the whole tenant back.
        try {
            if (!authRes?.user?.id) throw new Error("No user id from sign-up");
            await db.update(user)
                .set({ role: "owner", organizationId: orgId })
                .where(eq(user.id, authRes.user.id));
            await db.insert(userStoreAccess).values({
                userId: authRes.user.id,
                storeId: storeId,
                role: "owner",
            });
        } catch (accessError: any) {
            console.error("Failed to set owner role/access:", accessError);
            // Compensate: remove the org (cascades store/sub) and the half-created user.
            await db.delete(organizations).where(eq(organizations.id, orgId));
            if (authRes?.user?.id) await db.delete(user).where(eq(user.id, authRes.user.id));
            return NextResponse.json({ message: "Gagal menyiapkan akun pemilik" }, { status: 500 });
        }

        // Return success. The frontend will call signIn.email immediately after to set cookies correctly.
        return NextResponse.json({
            message: "Pendaftaran berhasil",
            organizationId: orgId,
            storeId: storeId,
        }, { status: 201 });

    } catch (error: any) {
        console.error("Registration error:", error);
        return NextResponse.json(
            { message: "Terjadi kesalahan internal", error: error.message },
            { status: 500 }
        );
    }
}
