import { NextResponse } from "next/server";
import { db } from "@/db";
import { cashierShifts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";
import { openShiftSchema } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeInput } from "@/lib/sanitize";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const rateLimitResponse = await checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    if (authResult.storeId === "all") {
        return NextResponse.json({ error: "Please select a specific branch to open a shift" }, { status: 400 });
    }

    try {
        const rawBody = await request.json();
        const body = sanitizeInput(rawBody);
        const parsed = openShiftSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }

        const { openingBalance, notes } = parsed.data;

        // Check if user already has an active shift in this store
        const active = await db.query.cashierShifts.findFirst({
            where: and(
                eq(cashierShifts.storeId, authResult.storeId),
                eq(cashierShifts.userId, authResult.user.id),
                eq(cashierShifts.status, "OPEN")
            )
        });

        if (active) {
            return NextResponse.json({ error: "Anda sudah memiliki shift aktif yang sedang berjalan di cabang ini" }, { status: 400 });
        }

        const [newShift] = await db.insert(cashierShifts).values({
            storeId: authResult.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            openingBalance: openingBalance,
            notes: notes || null,
            status: "OPEN",
            openedAt: new Date()
        }).returning();

        return NextResponse.json(newShift, { status: 201 });
    } catch (error: any) {
        console.error("Failed to open shift:", error);
        return NextResponse.json({ error: error.message || "Failed to open shift" }, { status: 500 });
    }
}
