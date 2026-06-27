import { NextResponse } from "next/server";
import { db } from "@/db";
import { stockOpnames, stockOpnameItems, inventory } from "@/db/schema";
import { requireAuth, requireOwnerOrManager } from "@/lib/auth-guard";
import { updateOpnameSchema } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limit";
import { and, eq } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const { id } = await params;
        const opname = await db.query.stockOpnames.findFirst({
            where: eq(stockOpnames.id, id),
            with: {
                items: {
                    with: {
                        inventoryItem: true
                    }
                }
            }
        });

        if (!opname) {
            return NextResponse.json({ error: "Opname tidak ditemukan" }, { status: 404 });
        }

        // Verify store access
        if (authResult.storeId !== "all" && opname.storeId !== authResult.storeId) {
            return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
        }

        return NextResponse.json(opname);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const rateLimitResponse = await checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const authResult = await requireOwnerOrManager();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const { id } = await params;
        const rawBody = await request.json();
        const parsed = updateOpnameSchema.safeParse(rawBody);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }

        const { items, notes } = parsed.data;
        
        const opname = await db.query.stockOpnames.findFirst({
            where: eq(stockOpnames.id, id)
        });

        if (!opname) return NextResponse.json({ error: "Opname tidak ditemukan" }, { status: 404 });
        if (authResult.storeId !== "all" && opname.storeId !== authResult.storeId) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
        if (opname.status !== "DRAFT") return NextResponse.json({ error: "Opname sudah selesai, tidak bisa diubah" }, { status: 400 });

        // Update items
        for (const item of items) {
            // First get the item to know systemQty
            const opItem = await db.query.stockOpnameItems.findFirst({ where: eq(stockOpnameItems.id, item.id) });
            if (opItem) {
                await db.update(stockOpnameItems)
                    .set({ 
                        physicalQty: item.physicalQty,
                        difference: item.physicalQty - opItem.systemQty,
                        note: item.note
                    })
                    .where(eq(stockOpnameItems.id, item.id));
            }
        }

        if (notes !== undefined) {
            await db.update(stockOpnames)
                .set({ notes })
                .where(eq(stockOpnames.id, id));
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
