import { NextResponse } from "next/server";
import { db } from "@/db";
import { buybackLeads } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const body = await request.json();
        const { status } = body;

        if (!status) {
            return NextResponse.json({ error: "Status required" }, { status: 400 });
        }

        const existing = await db.query.buybackLeads.findFirst({
            where: eq(buybackLeads.id, id)
        });

        if (!existing) {
            return NextResponse.json({ error: "Lead tidak ditemukan." }, { status: 404 });
        }

        // Check if user has access to this store
        if (authResult.storeId !== 'all' && existing.storeId !== authResult.storeId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const result = await db.update(buybackLeads)
            .set({ status })
            .where(eq(buybackLeads.id, id))
            .returning();

        return NextResponse.json(result[0]);
    } catch (error: any) {
        console.error("Failed to update lead status:", error);
        return NextResponse.json({ error: error.message || "Gagal memperbarui status lead." }, { status: 500 });
    }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const existing = await db.query.buybackLeads.findFirst({
            where: eq(buybackLeads.id, id)
        });

        if (!existing) {
            return NextResponse.json({ error: "Lead tidak ditemukan." }, { status: 404 });
        }

        // Check if user has access to this store
        if (authResult.storeId !== 'all' && existing.storeId !== authResult.storeId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await db.delete(buybackLeads).where(eq(buybackLeads.id, id));

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Failed to delete lead:", error);
        return NextResponse.json({ error: error.message || "Gagal menghapus lead." }, { status: 500 });
    }
}
