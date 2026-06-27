import { NextResponse } from "next/server";
import { db } from "@/db";
import { crmReminders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const existing = await db.query.crmReminders.findFirst({
            where: eq(crmReminders.id, id)
        });

        if (!existing) {
            return NextResponse.json({ error: "Pengingat tidak ditemukan." }, { status: 404 });
        }

        const result = await db.update(crmReminders)
            .set({
                status: "SENT",
                sentAt: new Date()
            })
            .where(eq(crmReminders.id, id))
            .returning();

        return NextResponse.json(result[0]);
    } catch (error: any) {
        console.error("Failed to update CRM reminder status:", error);
        return NextResponse.json({ error: error.message || "Gagal memperbarui status pengingat." }, { status: 500 });
    }
}
