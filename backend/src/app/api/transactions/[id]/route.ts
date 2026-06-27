import { NextResponse } from "next/server";
import { db } from "@/db";
import { transactions, transactionItems, journalEntries, inventory, activityLogs, stores, storeSettings } from "@/db/schema";
import { eq, inArray, desc, and } from "drizzle-orm";
import { requireAuth, requireOwner, requireOwnerOrManager, requireWriteAccess } from "@/lib/auth-guard";
import { transactionSchema } from "@/lib/validators";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await context.params;
    try {
        const tx = await db.query.transactions.findFirst({
            where: eq(transactions.id, id),
            with: {
                items: {
                    with: {
                        inventoryItem: true
                    }
                },
                journals: true
            }
        });
        
        if (!tx) {
            return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
        }

        const log = await db.query.activityLogs.findFirst({
            where: and(
                eq(activityLogs.action, "CREATE_TRANSACTION"),
                eq(activityLogs.entityId, tx.id)
            )
        });

        const txStore = await db.query.stores.findFirst({
            where: eq(stores.id, tx.storeId)
        });

        const txSettings = await db.query.storeSettings.findFirst({
            where: eq(storeSettings.storeId, tx.storeId)
        });

        let parsedBanks = [];
        if (txSettings?.storeBanks) {
            try {
                parsedBanks = JSON.parse(txSettings.storeBanks);
            } catch (e) {
                console.error("Failed to parse storeBanks", e);
            }
        }

        const sanitizedItems = (tx.items || []).map(item => {
            if (authResult.storeRole === "kasir" && item.inventoryItem) {
                return {
                    ...item,
                    inventoryItem: {
                        ...item.inventoryItem,
                        costPrice: 0
                    }
                };
            }
            return item;
        });

        return NextResponse.json({
            ...tx,
            items: sanitizedItems,
            creatorName: log?.userName || "Kasir",
            store: {
                name: txSettings?.storeName || txStore?.name || "HanLaptop",
                address: txSettings?.storeAddress || txStore?.address || "Jl. Cibiru Tonggoh, Kp. Babakan Biru 002/008, Cibiru Wetan, Cileunyi, Kab. Bandung",
                phone: txSettings?.storePhone || txStore?.phone || "085161870922",
                logo: txSettings?.storeLogo || null,
                signature: txSettings?.storeSignature || null,
                footer: txSettings?.storeFooter || "Terima kasih atas kunjungan Anda.\nBarang yang sudah dibeli\ntidak dapat ditukar/dikembalikan.",
                waTemplateNota: txSettings?.waTemplateNota || null,
                banks: parsedBanks
            }
        });
    } catch (error) {
        console.error("Failed to fetch transaction:", error);
        return NextResponse.json({ error: "Failed to fetch transaction" }, { status: 500 });
    }
}

// EDIT Transaksi Penuh (Rollback + Reapply)
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const writeAccessError = requireWriteAccess(authResult);
    if (writeAccessError) return writeAccessError;

    try {
        const { id } = await context.params;
        const body = await request.json();
        const parsed = transactionSchema.partial().safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }

        // Fallback for simple edits if items is not provided
        if (!parsed.data.items && !parsed.data.transactionType) {
            const { customerName, description, paymentMethod, paymentStatus, dueDate } = parsed.data;
            const [updated] = await db.update(transactions)
                .set({ customerName, description, paymentMethod, paymentStatus, dueDate: dueDate !== undefined ? dueDate : undefined })
                .where(eq(transactions.id, id))
                .returning();
            return NextResponse.json(updated);
        }

        const { transactionType, amount, description, items, customerName, paymentMethod, paymentStatus, dpAmount } = parsed.data;

        const tx = db;
        
        // --- 1. ROLLBACK OLD DATA ---
        const trx = await tx.query.transactions.findFirst({
            where: eq(transactions.id, id),
            with: { items: true }
        });

        if (!trx) throw new Error("Transaction not found");

        const finalAmount = amount !== undefined ? amount : trx.amount;
        const finalTransactionType = transactionType || trx.transactionType;
        const finalPaymentStatus = paymentStatus || trx.paymentStatus;
        const finalPaymentMethod = paymentMethod || trx.paymentMethod;
        const finalDpAmount = dpAmount !== undefined ? dpAmount : (trx.dpAmount || 0);

        // Rollback Stok (Similar to DELETE)
        if (trx.transactionType === "Penjualan") {
            for (const item of trx.items) {
                if (item.inventoryId) {
                    const inv = await tx.query.inventory.findFirst({ where: eq(inventory.id, item.inventoryId) });
                    if (inv) {
                        await tx.update(inventory)
                            .set({ quantity: inv.quantity + item.quantity }) // kembalikan stok
                            .where(eq(inventory.id, item.inventoryId));
                    }
                }
            }
        } else if (trx.transactionType === "Pembelian Stok") {
            for (const item of trx.items) {
                if (item.inventoryId) {
                    const inv = await tx.query.inventory.findFirst({ where: eq(inventory.id, item.inventoryId) });
                    if (inv) {
                        const newStock = Math.max(0, inv.quantity - item.quantity);
                        if (newStock === 0) {
                            const { and, not } = require("drizzle-orm");
                            const otherTxItems = await tx.query.transactionItems.findFirst({
                                where: and(
                                    eq(transactionItems.inventoryId, item.inventoryId),
                                    not(eq(transactionItems.transactionId, id))
                                )
                            });
                            
                            if (!otherTxItems) {
                                  await tx.delete(inventory).where(eq(inventory.id, item.inventoryId));
                            } else {
                                  await tx.update(inventory)
                                      .set({ quantity: newStock })
                                      .where(eq(inventory.id, item.inventoryId));
                            }
                        } else {
                            await tx.update(inventory)
                                .set({ quantity: newStock })
                                .where(eq(inventory.id, item.inventoryId));
                        }
                    }
                }
            }
        }

        // Hapus Jurnal dan Items lama
        await tx.delete(journalEntries).where(eq(journalEntries.transactionId, id));
        await tx.delete(transactionItems).where(eq(transactionItems.transactionId, id));

        // --- 2. UPDATE MAIN TRANSACTION ---
        const [newTx] = await tx.update(transactions).set({
            transactionType: finalTransactionType,
            amount: finalAmount,
            description,
            customerName,
            paymentMethod: finalPaymentMethod,
            paymentStatus: finalPaymentStatus,
            dpAmount: finalDpAmount,
            dueDate: parsed.data.dueDate !== undefined ? parsed.data.dueDate : trx.dueDate
        }).where(eq(transactions.id, id)).returning();

        // --- 3. REAPPLY NEW DATA (Similar to POST) ---
        const paymentAccountMap: Record<string, string> = {
            'Cash': 'Kas',
            'Transfer Bank': 'Bank',
            'Qris': 'QRIS',
            'Tempo': 'Kas'
        };
        const liquidAccount = paymentMethod ? (paymentAccountMap[paymentMethod as string] || "Kas") : "Kas";

        if (transactionType === "Penjualan") {
            let totalCogs = 0;
            
            for (const item of (items || [])) {
                if (!item.inventoryId) {
                    throw new Error("Inventory ID is required for sales items");
                }
                const invItem = await tx.query.inventory.findFirst({
                    where: eq(inventory.id, item.inventoryId as string)
                });
                
                if (!invItem || invItem.quantity < item.quantity) {
                    throw new Error(`Insufficient stock for item ID: ${item.inventoryId}`);
                }

                await tx.update(inventory)
                    .set({ quantity: invItem.quantity - item.quantity })
                    .where(eq(inventory.id, item.inventoryId as string));

                await tx.insert(transactionItems).values({
                    transactionId: newTx.id,
                    inventoryId: item.inventoryId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice
                });

                totalCogs += invItem.costPrice * item.quantity;
            }

            const dp = finalPaymentStatus === "Belum Lunas" ? (finalDpAmount || 0) : finalAmount;
            const piutang = finalAmount - dp;

            const entries = [
                { storeId: newTx.storeId, transactionId: newTx.id, accountName: "Pendapatan", debit: 0, credit: finalAmount },
                { storeId: newTx.storeId, transactionId: newTx.id, accountName: "HPP", debit: totalCogs, credit: 0 },
                { storeId: newTx.storeId, transactionId: newTx.id, accountName: "Persediaan", debit: 0, credit: totalCogs }
            ];
            if (dp > 0) entries.push({ storeId: newTx.storeId, transactionId: newTx.id, accountName: liquidAccount, debit: dp, credit: 0 });
            if (piutang > 0) entries.push({ storeId: newTx.storeId, transactionId: newTx.id, accountName: "Piutang Usaha", debit: piutang, credit: 0 });

            await tx.insert(journalEntries).values(entries);

        } else if (finalTransactionType === "Jasa Servis") {
            const dp = finalPaymentStatus === "Belum Lunas" ? (finalDpAmount || 0) : finalAmount;
            const piutang = finalAmount - dp;

            const entries = [
                { storeId: newTx.storeId, transactionId: newTx.id, accountName: "Pendapatan Servis", debit: 0, credit: finalAmount }
            ];
            if (dp > 0) entries.push({ storeId: newTx.storeId, transactionId: newTx.id, accountName: liquidAccount, debit: dp, credit: 0 });
            if (piutang > 0) entries.push({ storeId: newTx.storeId, transactionId: newTx.id, accountName: "Piutang Usaha", debit: piutang, credit: 0 });

            await tx.insert(journalEntries).values(entries);

        } else if (finalTransactionType === "Pembelian Stok") {
            for (const item of (items || [])) {
                if (item.inventoryId) {
                    const invItem = await tx.query.inventory.findFirst({
                        where: eq(inventory.id, item.inventoryId as string)
                    });
                    
                    if (invItem) {
                        const newTotalCost = (invItem.quantity * invItem.costPrice) + (item.quantity * item.unitPrice);
                        const newQty = invItem.quantity + item.quantity;
                        const newCostPrice = newQty > 0 ? newTotalCost / newQty : invItem.costPrice;

                        await tx.update(inventory)
                            .set({ 
                                quantity: newQty, 
                                costPrice: newCostPrice,
                                sellingPrice: item.sellingPrice || invItem.sellingPrice
                            })
                            .where(eq(inventory.id, item.inventoryId as string));
                        
                        await tx.insert(transactionItems).values({
                            transactionId: newTx.id,
                            inventoryId: item.inventoryId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice
                        });
                    }
                } else {
                    const [newInv] = await tx.insert(inventory).values({
                        storeId: newTx.storeId,
                        itemName: item.itemName as string,
                        category: item.category as string,
                        quantity: item.quantity,
                        costPrice: item.unitPrice,
                        sellingPrice: item.sellingPrice || 0,
                        specs: item.specs || null
                    }).returning();

                    await tx.insert(transactionItems).values({
                        transactionId: newTx.id,
                        inventoryId: newInv.id,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice
                    });
                }
            }

            const dp = finalPaymentMethod === "Tempo" ? (finalDpAmount || 0) : finalAmount;
            const hutang = finalAmount - dp;

            const entries = [
                { storeId: newTx.storeId, transactionId: newTx.id, accountName: "Persediaan", debit: finalAmount, credit: 0 }
            ];
            if (dp > 0) entries.push({ storeId: newTx.storeId, transactionId: newTx.id, accountName: liquidAccount, debit: 0, credit: dp });
            if (hutang > 0) entries.push({ storeId: newTx.storeId, transactionId: newTx.id, accountName: "Hutang Usaha", debit: 0, credit: hutang });

            await tx.insert(journalEntries).values(entries);

        } else if (finalTransactionType === "Operasional") {
            await tx.insert(journalEntries).values([
                { storeId: newTx.storeId, transactionId: newTx.id, accountName: `Beban ${description?.split(' - ')[0] || 'Operasional'}`, debit: finalAmount, credit: 0 },
                { storeId: newTx.storeId, transactionId: newTx.id, accountName: liquidAccount, debit: 0, credit: finalAmount }
            ]);
        } else if (finalTransactionType === "Modal Baru") {
            await tx.insert(journalEntries).values([
                { storeId: newTx.storeId, transactionId: newTx.id, accountName: liquidAccount, debit: finalAmount, credit: 0 },
                { storeId: newTx.storeId, transactionId: newTx.id, accountName: "Modal Pemilik", debit: 0, credit: finalAmount }
            ]);
        } else if (finalTransactionType === "Prive") {
            await tx.insert(journalEntries).values([
                { storeId: newTx.storeId, transactionId: newTx.id, accountName: "Prive", debit: finalAmount, credit: 0 },
                { storeId: newTx.storeId, transactionId: newTx.id, accountName: liquidAccount, debit: 0, credit: finalAmount }
            ]);
        } else if (finalTransactionType === "Pinjaman Bank") {
            await tx.insert(journalEntries).values([
                { storeId: newTx.storeId, transactionId: newTx.id, accountName: liquidAccount, debit: finalAmount, credit: 0 },
                { storeId: newTx.storeId, transactionId: newTx.id, accountName: "Hutang Bank", debit: 0, credit: finalAmount }
            ]);
        } else if (finalTransactionType === "Pelunasan Hutang") {
            await tx.insert(journalEntries).values([
                { storeId: newTx.storeId, transactionId: newTx.id, accountName: "Hutang Bank", debit: finalAmount, credit: 0 },
                { storeId: newTx.storeId, transactionId: newTx.id, accountName: liquidAccount, debit: 0, credit: finalAmount }
            ]);
        } else if (finalTransactionType === "Pembelian Aset Tetap") {
            await tx.insert(journalEntries).values([
                { storeId: newTx.storeId, transactionId: newTx.id, accountName: "Aset Tetap", debit: finalAmount, credit: 0 },
                { storeId: newTx.storeId, transactionId: newTx.id, accountName: liquidAccount, debit: 0, credit: finalAmount }
            ]);
        } else if (finalTransactionType === "Penjualan Aset Tetap") {
            await tx.insert(journalEntries).values([
                { storeId: newTx.storeId, transactionId: newTx.id, accountName: liquidAccount, debit: finalAmount, credit: 0 },
                { storeId: newTx.storeId, transactionId: newTx.id, accountName: "Aset Tetap", debit: 0, credit: finalAmount }
            ]);
        }

        // Log activity
        await tx.insert(activityLogs).values({
            storeId: newTx.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "UPDATE_TRANSACTION",
            entityType: "transaction",
            entityId: newTx.id,
            details: JSON.stringify({ transactionType: finalTransactionType, amount: finalAmount, description })
        });

        return NextResponse.json(newTx);
    } catch (error: any) {
        console.error("Failed to update transaction:", error);
        return NextResponse.json({ error: error.message || "Failed to update transaction" }, { status: 500 });
    }
}

// HAPUS Transaksi + Rollback Stok & Jurnal
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    const authResult = await requireOwnerOrManager();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const { id } = await context.params;
        
        const tx = db;
        const trx = await tx.query.transactions.findFirst({
            where: eq(transactions.id, id),
            with: { items: true }
        });

        if (!trx) throw new Error("Transaction not found");

        // Rollback Stok
        if (trx.transactionType === "Penjualan") {
            for (const item of trx.items) {
                if (item.inventoryId) {
                    const inv = await tx.query.inventory.findFirst({ where: eq(inventory.id, item.inventoryId) });
                    if (inv) {
                        await tx.update(inventory)
                            .set({ quantity: inv.quantity + item.quantity }) // kembalikan stok
                            .where(eq(inventory.id, item.inventoryId));
                    }
                }
            }
        } else if (trx.transactionType === "Pembelian Stok") {
            for (const item of trx.items) {
                if (item.inventoryId) {
                    const inv = await tx.query.inventory.findFirst({ where: eq(inventory.id, item.inventoryId) });
                    if (inv) {
                        const newStock = Math.max(0, inv.quantity - item.quantity);
                        if (newStock === 0) {
                            const { and, not } = require("drizzle-orm");
                            const otherTxItems = await tx.query.transactionItems.findFirst({
                                where: and(
                                    eq(transactionItems.inventoryId, item.inventoryId),
                                    not(eq(transactionItems.transactionId, id))
                                )
                            });
                            
                            if (!otherTxItems) {
                                await tx.delete(inventory).where(eq(inventory.id, item.inventoryId));
                            } else {
                                await tx.update(inventory)
                                    .set({ quantity: newStock })
                                    .where(eq(inventory.id, item.inventoryId));
                            }
                        } else {
                            await tx.update(inventory)
                                .set({ quantity: newStock })
                                .where(eq(inventory.id, item.inventoryId));
                        }
                    }
                }
            }
        }

        // Hapus Jurnal dan Transaksi
        await tx.delete(journalEntries).where(eq(journalEntries.transactionId, id));
        await tx.delete(transactionItems).where(eq(transactionItems.transactionId, id));
        await tx.delete(transactions).where(eq(transactions.id, id));

        // Log activity
        await tx.insert(activityLogs).values({
            storeId: trx.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "DELETE_TRANSACTION",
            entityType: "transaction",
            entityId: id,
            details: "{}"
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Failed to delete transaction:", error);
        return NextResponse.json({ error: error.message || "Failed to delete transaction" }, { status: 500 });
    }
}

// LUNASI Piutang / Hutang
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const writeAccessError = requireWriteAccess(authResult);
    if (writeAccessError) return writeAccessError;

    try {
        const { id } = await context.params;
        
        const tx = db;
        const trx = await tx.query.transactions.findFirst({
            where: eq(transactions.id, id)
        });

        if (!trx) throw new Error("Transaction not found");
        if (trx.paymentStatus === "Lunas") throw new Error("Transaction is already paid off");

        // Calculate remaining amount
        const sisaTagihan = trx.amount - (trx.dpAmount || 0);
        
        if (sisaTagihan <= 0) throw new Error("No remaining amount to be paid");

        // Update Transaction
        const [updated] = await tx.update(transactions)
            .set({ 
                paymentStatus: "Lunas"
            })
            .where(eq(transactions.id, id))
            .returning();

        // Tambah Jurnal Pelunasan
        if (trx.transactionType === "Penjualan" || trx.transactionType === "Jasa Servis") {
            // Pelunasan Piutang: Kas bertambah (debit), Piutang berkurang (credit)
            await tx.insert(journalEntries).values([
                { transactionId: id, storeId: trx.storeId, accountName: "Kas", debit: sisaTagihan, credit: 0 },
                { transactionId: id, storeId: trx.storeId, accountName: "Piutang Usaha", debit: 0, credit: sisaTagihan }
            ]);
        } else if (trx.transactionType === "Pembelian Stok") {
            // Pelunasan Hutang: Hutang berkurang (debit), Kas berkurang (credit)
            await tx.insert(journalEntries).values([
                { transactionId: id, storeId: trx.storeId, accountName: "Hutang Usaha", debit: sisaTagihan, credit: 0 },
                { transactionId: id, storeId: trx.storeId, accountName: "Kas", debit: 0, credit: sisaTagihan }
            ]);
        }

        const result = updated;

        // Log activity
        await tx.insert(activityLogs).values({
            storeId: trx.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "PAYOFF_TRANSACTION",
            entityType: "transaction",
            entityId: id,
            details: JSON.stringify({ paidAmount: sisaTagihan })
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Failed to patch transaction:", error);
        return NextResponse.json({ error: error.message || "Failed to process payment" }, { status: 500 });
    }
}
