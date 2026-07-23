import { NextResponse } from "next/server";
import { db } from "@/db";
import { buybackLeads } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, storeScope } from "@/lib/auth-guard";

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

        // 🔒 Tenant isolation: storeScope confines the lookup to the caller's stores
        // (org-scoped for owner, single store otherwise). Prevents cross-org IDOR.
        const existing = await db.query.buybackLeads.findFirst({
            where: and(eq(buybackLeads.id, id), storeScope(authResult, buybackLeads.storeId))
        });

        if (!existing) {
            return NextResponse.json({ error: "Lead tidak ditemukan." }, { status: 404 });
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
        // 🔒 Tenant isolation: storeScope confines the lookup to the caller's stores.
        const existing = await db.query.buybackLeads.findFirst({
            where: and(eq(buybackLeads.id, id), storeScope(authResult, buybackLeads.storeId))
        });

        if (!existing) {
            return NextResponse.json({ error: "Lead tidak ditemukan." }, { status: 404 });
        }

        await db.delete(buybackLeads).where(eq(buybackLeads.id, id));

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Failed to delete lead:", error);
        return NextResponse.json({ error: error.message || "Gagal menghapus lead." }, { status: 500 });
    }
}
