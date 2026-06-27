import { NextResponse } from "next/server";
import { db } from "@/db";
import { stockOpnames, stockOpnameItems, inventory } from "@/db/schema";
import { requireAuth, requireOwnerOrManager } from "@/lib/auth-guard";
import { createOpnameSchema } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeInput } from "@/lib/sanitize";
import { and, eq, desc } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const storeId = authResult.storeId;
        
        let conditions = [];
        if (storeId !== "all") {
            conditions.push(eq(stockOpnames.storeId, storeId));
        }

        const opnames = await db.query.stockOpnames.findMany({
            where: conditions.length > 0 ? and(...conditions) : undefined,
            orderBy: [desc(stockOpnames.createdAt)],
        });

        return NextResponse.json(opnames);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const rateLimitResponse = await checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const authResult = await requireOwnerOrManager();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const rawBody = await request.json();
        const body = sanitizeInput(rawBody);
        const parsed = createOpnameSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }

        const { notes } = parsed.data;
        const storeId = authResult.storeId;
        
        if (storeId === "all") {
            return NextResponse.json({ error: "Silakan pilih cabang spesifik untuk membuat Stok Opname." }, { status: 400 });
        }

        const newOpname = await db.insert(stockOpnames).values({
            storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            status: "DRAFT",
            notes,
        }).returning();

        const opnameId = newOpname[0].id;

        // Auto-populate all active inventory for this store
        const storeInventory = await db.select().from(inventory).where(eq(inventory.storeId, storeId));

        if (storeInventory.length > 0) {
            const itemsToInsert = storeInventory.map(item => ({
                opnameId,
                inventoryId: item.id,
                systemQty: item.quantity,
                physicalQty: item.quantity, // Default to system qty
                difference: 0,
            }));

            // Batch insert in chunks if many items (using 500 chunk size for safety)
            const chunkSize = 500;
            for (let i = 0; i < itemsToInsert.length; i += chunkSize) {
                const chunk = itemsToInsert.slice(i, i + chunkSize);
                await db.insert(stockOpnameItems).values(chunk);
            }
        }

        return NextResponse.json(newOpname[0], { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
