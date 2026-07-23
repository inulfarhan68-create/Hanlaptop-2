import { NextResponse } from "next/server";
import { db } from "@/db";
import { stockTransfers, stockTransferItems, inventory, activityLogs, stores } from "@/db/schema";
import { eq, or, and, gte, lte, count, desc } from "drizzle-orm";
import { requireAuth, requireOwnerOrManager, storeScope } from "@/lib/auth-guard";
import { stockTransferSchema } from "@/lib/validators";

export const dynamic = 'force-dynamic';

// GET /api/inventory/transfers - List transfers for current store context
export async function GET(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        let transfersList;
        // For transfers, scope by both source and target store membership.
        // storeScope returns undefined for platform_admin (show all), or inArray for tenant.
        const scope = storeScope(authResult, stockTransfers.sourceStoreId);
        if (!scope) {
            // platform_admin: no filter
            transfersList = await db.query.stockTransfers.findMany({
                with: {
                    sourceStore: true,
                    targetStore: true,
                    items: true,
                },
                orderBy: [desc(stockTransfers.createdAt)]
            });
        } else {
            // Tenant: show transfers where source OR target is in their accessible stores
            transfersList = await db.query.stockTransfers.findMany({
                where: or(
                    storeScope(authResult, stockTransfers.sourceStoreId),
                    storeScope(authResult, stockTransfers.targetStoreId)
                ),
                with: {
                    sourceStore: true,
                    targetStore: true,
                    items: true,
                },
                orderBy: [desc(stockTransfers.createdAt)]
            });
        }

        return NextResponse.json(transfersList);
    } catch (error) {
        console.error("Failed to fetch transfers:", error);
        return NextResponse.json({ error: "Failed to fetch transfers" }, { status: 500 });
    }
}

// POST /api/inventory/transfers - Create a new stock transfer
export async function POST(request: Request) {
    const authResult = await requireOwnerOrManager();
    if (authResult instanceof NextResponse) return authResult;

    if (authResult.storeId === "all") {
        return NextResponse.json({ error: "Silakan pilih cabang asal yang spesifik" }, { status: 400 });
    }

    try {
        const body = await request.json();
        const parsed = stockTransferSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validasi gagal", details: parsed.error.format() }, { status: 400 });
        }

        const { targetStoreId, notes, items } = parsed.data;

        if (authResult.storeId === targetStoreId) {
            return NextResponse.json({ error: "Cabang asal dan cabang tujuan tidak boleh sama" }, { status: 400 });
        }

        // Validate that target store exists
        const targetStoreExists = await db.query.stores.findFirst({
            where: eq(stores.id, targetStoreId)
        });
        if (!targetStoreExists) {
            return NextResponse.json({ error: "Cabang tujuan tidak valid atau tidak ditemukan" }, { status: 404 });
        }

        // Validate stock availability in source store
        for (const item of items) {
            const invItem = await db.query.inventory.findFirst({
                where: and(
                    eq(inventory.id, item.inventoryId),
                    eq(inventory.storeId, authResult.storeId)
                )
            });

            if (!invItem) {
                return NextResponse.json({ error: `Barang "${item.itemName}" tidak ditemukan di inventori asal` }, { status: 404 });
            }

            if (invItem.quantity < item.quantity) {
                return NextResponse.json({ 
                    error: `Stok tidak mencukupi untuk "${item.itemName}". Stok tersedia: ${invItem.quantity}, diminta: ${item.quantity}` 
                }, { status: 400 });
            }
        }

        // Generate unique transfer number TRF/YYYYMMDD/XXXX
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const todayCount = await db
            .select({ count: count() })
            .from(stockTransfers)
            .where(and(
                gte(stockTransfers.createdAt, todayStart),
                lte(stockTransfers.createdAt, todayEnd)
            ));
        
        const seqNum = (todayCount[0]?.count || 0) + 1;
        const padSeqNum = String(seqNum).padStart(4, "0");
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const transferNumber = `TRF/${dateStr}/${padSeqNum}`;

        // DB Transaction to create transfer header and items
        const newTransfer = await db.transaction(async (tx) => {
            const [insertedTransfer] = await tx.insert(stockTransfers).values({
                transferNumber,
                sourceStoreId: authResult.storeId,
                targetStoreId,
                status: "PENDING",
                notes: notes || null,
                createdByUserId: authResult.user.id,
                createdByUserName: authResult.user.name,
                createdAt: new Date(),
                updatedAt: new Date()
            }).returning();

            for (const item of items) {
                await tx.insert(stockTransferItems).values({
                    transferId: insertedTransfer.id,
                    inventoryId: item.inventoryId,
                    itemName: item.itemName,
                    quantity: item.quantity
                });
            }

            return insertedTransfer;
        });

        // Log Activity
        await db.insert(activityLogs).values({
            storeId: authResult.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "CREATE_TRANSFER",
            entityType: "stock_transfer",
            entityId: newTransfer.id,
            details: JSON.stringify({ 
                transferNumber, 
                targetStoreId, 
                itemCount: items.length 
            })
        });

        return NextResponse.json(newTransfer, { status: 201 });
    } catch (error: any) {
        console.error("Failed to create stock transfer:", error);
        return NextResponse.json({ error: "Gagal membuat transfer stok: " + error.message }, { status: 500 });
    }
}
