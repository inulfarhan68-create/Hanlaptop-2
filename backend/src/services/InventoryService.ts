import { db } from "@/db";
import { inventory, activityLogs, journalEntries, transactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

interface ApplyMarkdownParams {
    id: string;
    storeId: string;
    userId: string;
    userName: string;
    newPrice: number;
}

export class InventoryService {
    
    /**
     * Applies markdown to an inventory item.
     * If the price is decreased, it creates a journal entry for "Beban Penurunan Nilai Persediaan".
     */
    static async applyMarkdown(params: ApplyMarkdownParams) {
        const { id, storeId, userId, userName, newPrice } = params;

        return await db.transaction(async (tx) => {
            // Note: Store access is already validated by the calling route via storeScope.
            // The service layer trusts the validated storeId from the caller.
            // When storeId is "all" (owner/platform_admin), we still need to find the item by ID
            // and verify it belongs to any of the user's accessible stores (done at route level).
            const itemConditions = [eq(inventory.id, id)];
            if (storeId !== "all") {
                itemConditions.push(eq(inventory.storeId, storeId));
            }
            const [item] = await tx.select().from(inventory).where(
                and(...itemConditions)
            );

            if (!item) {
                throw new Error("Inventory item not found");
            }

            const oldPrice = item.sellingPrice;
            const priceDifference = oldPrice - newPrice;

            // Only proceed if there's actually a markdown (price decrease)
            if (priceDifference <= 0) {
                // Price increase or no change - just update price, no journal needed
                await tx.update(inventory)
                    .set({ sellingPrice: newPrice })
                    .where(eq(inventory.id, id));

                return { success: true, newPrice, journalCreated: false };
            }

            // Update inventory price
            await tx.update(inventory)
                .set({ sellingPrice: newPrice })
                .where(eq(inventory.id, id));

            // PRD: Create journal entry for markdown loss (Beban Penurunan Nilai Persediaan)
            // Create a dummy transaction to attach the journal to
            const [markdownTx] = await tx.insert(transactions).values({
                storeId,
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
                    storeId,
                    transactionId: markdownTx.id,
                    accountName: 'Beban Penurunan Nilai Persediaan',
                    debit: priceDifference,
                    credit: 0,
                },
                {
                    storeId,
                    transactionId: markdownTx.id,
                    accountName: 'Persediaan', // Should align with standard account names
                    debit: 0,
                    credit: priceDifference,
                }
            ]);

            // Log activity
            await tx.insert(activityLogs).values({
                storeId, // Ensure storeId is included for activityLogs if needed, actually schema might require it, wait!
                userId,
                userName: userName || 'Unknown',
                action: 'APPLY_MARKDOWN',
                entityType: 'INVENTORY',
                entityId: item.id,
                details: `Applied Markdown to ${item.itemName}. Price changed from ${oldPrice} to ${newPrice}. Loss journal: ${priceDifference}`,
            });

            return { success: true, newPrice, priceDifference, journalCreated: true };
        });
    }
}
