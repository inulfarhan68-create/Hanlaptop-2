import { NextResponse } from "next/server";
import { db } from "@/db";
import { 
    stockTransfers, 
    stockTransferItems, 
    inventory, 
    transactions, 
    transactionItems, 
    journalEntries, 
    activityLogs, 
    stores 
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";
import { checkRateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const rateLimitResponse = await checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const { id: transferId } = await params;
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        // 1. Fetch Transfer Data
        const transfer = await db.query.stockTransfers.findFirst({
            where: eq(stockTransfers.id, transferId),
            with: {
                items: true
            }
        });

        if (!transfer) {
            return NextResponse.json({ error: "Transfer stok tidak ditemukan" }, { status: 404 });
        }

        if (transfer.status !== "PENDING") {
            return NextResponse.json({ error: `Transfer ini tidak bisa disetujui karena berstatus: ${transfer.status}` }, { status: 400 });
        }

        // 2. Auth Check: Only Owner or Manager from the target store can approve
        const isAuthorized = 
            (authResult.user as any).role === "owner" || 
            authResult.storeRole === "owner" ||
            (authResult.storeId === transfer.targetStoreId && authResult.storeRole === "manager");

        if (!isAuthorized) {
            return NextResponse.json({ error: "Anda tidak memiliki wewenang untuk menyetujui transfer ini" }, { status: 403 });
        }

        // Get Store Names for descriptions
        const sourceStore = await db.query.stores.findFirst({ where: eq(stores.id, transfer.sourceStoreId) });
        const targetStore = await db.query.stores.findFirst({ where: eq(stores.id, transfer.targetStoreId) });
        const sourceStoreName = sourceStore?.name || "Cabang Asal";
        const targetStoreName = targetStore?.name || "Cabang Tujuan";

        // 3. Database Transaction
        const result = await db.transaction(async (tx) => {
            let totalHpp = 0;
            const itemsToTransfer: Array<{
                sourceInvId: string;
                targetInvId: string;
                quantity: number;
                costPrice: number;
                sellingPrice: number;
            }> = [];

            // A. Update inventory levels
            for (const item of transfer.items) {
                const sourceItem = await tx.query.inventory.findFirst({
                    where: and(
                        eq(inventory.id, item.inventoryId),
                        eq(inventory.storeId, transfer.sourceStoreId)
                    )
                });

                if (!sourceItem) {
                    throw new Error(`Barang "${item.itemName}" tidak ditemukan di cabang pengirim.`);
                }

                if (sourceItem.quantity < item.quantity) {
                    throw new Error(`Stok tidak mencukupi untuk "${item.itemName}" di cabang pengirim.`);
                }

                // Deduct source stock
                await tx.update(inventory)
                    .set({ quantity: sourceItem.quantity - item.quantity })
                    .where(eq(inventory.id, sourceItem.id));

                // Find or create item in target store
                let targetItem;
                if (sourceItem.barcode) {
                    targetItem = await tx.query.inventory.findFirst({
                        where: and(
                            eq(inventory.storeId, transfer.targetStoreId),
                            eq(inventory.barcode, sourceItem.barcode)
                        )
                    });
                } else {
                    targetItem = await tx.query.inventory.findFirst({
                        where: and(
                            eq(inventory.storeId, transfer.targetStoreId),
                            eq(inventory.itemName, sourceItem.itemName)
                        )
                    });
                }

                let targetInvId = "";
                if (targetItem) {
                    await tx.update(inventory)
                        .set({ quantity: targetItem.quantity + item.quantity })
                        .where(eq(inventory.id, targetItem.id));
                    targetInvId = targetItem.id;
                } else {
                    // Create new inventory row
                    const [inserted] = await tx.insert(inventory).values({
                        storeId: transfer.targetStoreId,
                        itemName: sourceItem.itemName,
                        category: sourceItem.category,
                        specs: sourceItem.specs,
                        barcode: sourceItem.barcode,
                        quantity: item.quantity,
                        costPrice: sourceItem.costPrice,
                        sellingPrice: sourceItem.sellingPrice,
                        createdAt: new Date()
                    }).returning();
                    targetInvId = inserted.id;
                }

                totalHpp += item.quantity * sourceItem.costPrice;

                itemsToTransfer.push({
                    sourceInvId: sourceItem.id,
                    targetInvId,
                    quantity: item.quantity,
                    costPrice: sourceItem.costPrice,
                    sellingPrice: sourceItem.sellingPrice
                });
            }

            // B. Create Transaction - Source Store ("Transfer Keluar")
            const txSourceId = crypto.randomUUID();
            const invoiceSource = `TRF-OUT/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, "0")}/${transfer.transferNumber.split("/").pop()}`;
            
            await tx.insert(transactions).values({
                id: txSourceId,
                storeId: transfer.sourceStoreId,
                transactionType: "Transfer Keluar",
                amount: totalHpp,
                description: `Transfer stok keluar #${transfer.transferNumber} ke ${targetStoreName}`,
                transactionDate: new Date(),
                invoiceNumber: invoiceSource,
                paymentMethod: "Cash",
                paymentStatus: "Lunas",
                createdAt: new Date()
            });

            // Insert Transaction Items for Source Store
            for (const item of itemsToTransfer) {
                await tx.insert(transactionItems).values({
                    transactionId: txSourceId,
                    inventoryId: item.sourceInvId,
                    quantity: item.quantity,
                    unitPrice: item.costPrice
                });
            }

            // Write journals for Source Store
            // Debit: Kliring Antar Cabang
            await tx.insert(journalEntries).values({
                storeId: transfer.sourceStoreId,
                transactionId: txSourceId,
                accountName: "Kliring Antar Cabang",
                debit: totalHpp,
                credit: 0,
                createdAt: new Date()
            });
            // Credit: Persediaan
            await tx.insert(journalEntries).values({
                storeId: transfer.sourceStoreId,
                transactionId: txSourceId,
                accountName: "Persediaan",
                debit: 0,
                credit: totalHpp,
                createdAt: new Date()
            });

            // C. Create Transaction - Target Store ("Transfer Masuk")
            const txTargetId = crypto.randomUUID();
            const invoiceTarget = `TRF-IN/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, "0")}/${transfer.transferNumber.split("/").pop()}`;

            await tx.insert(transactions).values({
                id: txTargetId,
                storeId: transfer.targetStoreId,
                transactionType: "Transfer Masuk",
                amount: totalHpp,
                description: `Transfer stok masuk #${transfer.transferNumber} dari ${sourceStoreName}`,
                transactionDate: new Date(),
                invoiceNumber: invoiceTarget,
                paymentMethod: "Cash",
                paymentStatus: "Lunas",
                createdAt: new Date()
            });

            // Insert Transaction Items for Target Store
            for (const item of itemsToTransfer) {
                await tx.insert(transactionItems).values({
                    transactionId: txTargetId,
                    inventoryId: item.targetInvId,
                    quantity: item.quantity,
                    unitPrice: item.costPrice
                });
            }

            // Write journals for Target Store
            // Debit: Persediaan
            await tx.insert(journalEntries).values({
                storeId: transfer.targetStoreId,
                transactionId: txTargetId,
                accountName: "Persediaan",
                debit: totalHpp,
                credit: 0,
                createdAt: new Date()
            });
            // Credit: Kliring Antar Cabang
            await tx.insert(journalEntries).values({
                storeId: transfer.targetStoreId,
                transactionId: txTargetId,
                accountName: "Kliring Antar Cabang",
                debit: 0,
                credit: totalHpp,
                createdAt: new Date()
            });

            // D. Update Transfer Header Status
            const [updatedTransfer] = await tx.update(stockTransfers)
                .set({
                    status: "APPROVED",
                    approvedByUserId: authResult.user.id,
                    approvedByUserName: authResult.user.name,
                    updatedAt: new Date()
                })
                .where(eq(stockTransfers.id, transferId))
                .returning();

            return updatedTransfer;
        });

        // 4. Activity Logs for both stores
        await db.insert(activityLogs).values({
            storeId: transfer.sourceStoreId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "APPROVE_TRANSFER_OUT",
            entityType: "stock_transfer",
            entityId: transfer.id,
            details: JSON.stringify({ transferNumber: transfer.transferNumber, destination: targetStoreName })
        });

        await db.insert(activityLogs).values({
            storeId: transfer.targetStoreId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "APPROVE_TRANSFER_IN",
            entityType: "stock_transfer",
            entityId: transfer.id,
            details: JSON.stringify({ transferNumber: transfer.transferNumber, origin: sourceStoreName })
        });

        return NextResponse.json({ success: true, transfer: result });
    } catch (error: any) {
        console.error("Failed to approve stock transfer:", error);
        return NextResponse.json({ error: error.message || "Gagal menyetujui transfer stok" }, { status: 500 });
    }
}
