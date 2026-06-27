import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventory, activityLogs, journalEntries, transactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireWriteAccess } from "@/lib/auth-guard";

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    
    const writeAccess = await requireWriteAccess(authResult);
    if (writeAccess instanceof NextResponse) return writeAccess;

    try {
        const body = await request.json();
        const { newPrice } = body;

        if (typeof newPrice !== 'number' || newPrice < 0) {
            return NextResponse.json({ error: "Invalid new price" }, { status: 400 });
        }

        return await db.transaction(async (tx) => {
            const [item] = await tx.select().from(inventory).where(
                authResult.storeId === "all" 
                ? eq(inventory.id, id)
                : and(eq(inventory.id, id), eq(inventory.storeId, authResult.storeId))
            );

            if (!item) {
                return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
            }

            const oldPrice = item.sellingPrice;
            const priceDifference = oldPrice - newPrice;

            // Only proceed if there's actually a markdown (price decrease)
            if (priceDifference <= 0) {
                // Price increase or no change - just update price, no journal needed
                await tx.update(inventory)
                    .set({ sellingPrice: newPrice })
                    .where(eq(inventory.id, id));

                return NextResponse.json({ success: true, newPrice, journalCreated: false });
            }

            // Update inventory price
            await tx.update(inventory)
                .set({ sellingPrice: newPrice })
                .where(eq(inventory.id, id));

            // PRD: Create journal entry for markdown loss (Beban Penurunan Nilai Persediaan)
            // Create a dummy transaction to attach the journal to
            const [markdownTx] = await tx.insert(transactions).values({
                storeId: authResult.storeId,
                invoiceNumber: `MKD-${Date.now()}`,
                transactionType: 'Operasional',
                amount: priceDifference,
                paymentMethod: 'Internal',
                paymentStatus: 'Lunas',
                transactionDate: new Date(),
                description: `Markdown stok: ${item.itemName}. Harga ${oldPrice.toLocaleString('id-ID')} → ${newPrice.toLocaleString('id-ID')}`,
            }).returning();

            await tx.insert(journalEntries).values([
                {
                    storeId: authResult.storeId,
                    transactionId: markdownTx.id,
                    accountName: 'Beban Penurunan Nilai Persediaan',
                    debit: priceDifference,
                    credit: 0,
                },
                {
                    storeId: authResult.storeId,
                    transactionId: markdownTx.id,
                    accountName: 'Persediaan Barang Dagang',
                    debit: 0,
                    credit: priceDifference,
                }
            ]);

            // Log activity
            await tx.insert(activityLogs).values({
                userId: authResult.user.id,
                userName: authResult.user.name || 'Unknown',
                action: 'APPLY_MARKDOWN',
                entityType: 'INVENTORY',
                entityId: item.id,
                details: `Applied Markdown to ${item.itemName}. Price changed from ${oldPrice} to ${newPrice}. Loss journal: ${priceDifference}`,
            });

            return NextResponse.json({ success: true, newPrice, priceDifference, journalCreated: true });
        });
    } catch (error: any) {
        console.error("Apply Markdown API error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
