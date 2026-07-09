import { db } from "@/db";
import { transactions, transactionItems, journalEntries, inventory, activityLogs, customers, consignmentPayables } from "@/db/schema";
import { desc, eq, and, gte, like, sql, isNull } from "drizzle-orm";
import { getAccountCodeFromName } from "./JournalMappingService";

interface CreateTransactionParams {
    storeId: string;
    userId: string;
    userName: string;
    activeShiftId: string | null;
    data: any; // Ideally typed with transactionSchema
}

/**
 * Helper to create journal entry with account_code auto-mapped
 */
function createJournalEntry(storeId: string, transactionId: string, accountName: string, debit: number, credit: number) {
    return {
        storeId,
        transactionId,
        accountName,
        accountCode: getAccountCodeFromName(accountName), // Auto-map account_code
        debit,
        credit
    };
}

export class TransactionService {
    
    /**
     * Creates a new transaction with all related business logic:
     * - Stock deductions
     * - Digital passport transition
     * - Journal entries
     * - CRM Points
     */
    static async createTransaction(params: CreateTransactionParams) {
        const { storeId, userId, userName, activeShiftId, data } = params;
        const { 
            transactionType, amount, description, items, 
            customerName, customerPhone, customerAddress, 
            paymentMethod, paymentStatus, dpAmount, discountAmount, 
            dueDate, customerId, supplierId
        } = data;

        return await db.transaction(async (tx) => {
            // Generate invoice number: INV/YYYY/MM/XXX
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, "0");
            
            const startOfMonth = new Date(year, now.getMonth(), 1);
            
            let invConditions = [gte(transactions.transactionDate, startOfMonth)];
            if (storeId !== "all") {
                invConditions.push(eq(transactions.storeId, storeId));
            }

            const prefix = `INV/${year}/${month}/`;
            invConditions.push(like(transactions.invoiceNumber, `${prefix}%`));

            const latestTx = await tx.select({ invoiceNumber: transactions.invoiceNumber })
                .from(transactions)
                .where(and(...invConditions))
                .orderBy(desc(transactions.invoiceNumber))
                .limit(1);
                
            let seq = 1;
            if (latestTx.length > 0 && latestTx[0].invoiceNumber) {
                const parts = latestTx[0].invoiceNumber.split('/');
                const lastNum = parseInt(parts[parts.length - 1], 10);
                if (!isNaN(lastNum)) seq = lastNum + 1;
            }
            
            const sequence = String(seq).padStart(3, "0");
            const invoiceNumber = `INV/${year}/${month}/${sequence}`;

            const paymentAccountMap: Record<string, string> = {
                'Cash': 'Kas',
                'Transfer Bank': 'Bank',
                'Qris': 'QRIS',
                'Tempo': 'Kas'
            };
            const liquidAccount = paymentMethod ? (paymentAccountMap[paymentMethod as string] || "Kas") : "Kas";

            let finalCustomerId = customerId || null;
            if (!finalCustomerId && customerName) {
                const existingCust = await tx.query.customers.findFirst({
                    where: and(eq(customers.name, customerName), eq(customers.storeId, storeId))
                });
                if (existingCust) {
                    finalCustomerId = existingCust.id;
                    const updates: any = {};
                    if (customerPhone && !existingCust.phone) updates.phone = customerPhone;
                    if (customerAddress && !existingCust.address) updates.address = customerAddress;
                    if (Object.keys(updates).length > 0) {
                        await tx.update(customers).set(updates).where(eq(customers.id, existingCust.id));
                    }
                } else {
                    const [newCust] = await tx.insert(customers).values({
                        storeId,
                        name: customerName,
                        phone: customerPhone || null,
                        address: customerAddress || null,
                    }).returning();
                    finalCustomerId = newCust.id;
                }
            }

            const [newTx] = await tx.insert(transactions).values({
                storeId,
                transactionType,
                amount,
                description,
                invoiceNumber,
                customerName,
                customerId: finalCustomerId,
                supplierId: supplierId || null,
                paymentMethod,
                paymentStatus: paymentStatus || "Lunas",
                dpAmount: dpAmount || 0,
                discountAmount: discountAmount || 0,
                dueDate: dueDate || null,
                userId,
                shiftId: activeShiftId,
                transactionDate: new Date(),
                createdAt: new Date()
            }).returning();

            if (transactionType === "Penjualan") {
                let totalCogs = 0;
                let totalUtangKonsinyasi = 0;
                let totalKomisiKonsinyasi = 0;
                let totalRegularSales = 0;
                
                for (const item of items) {
                    if (!item.inventoryId) throw new Error("Inventory ID is required for sales items");
                    const invItem = await tx.query.inventory.findFirst({
                        where: eq(inventory.id, item.inventoryId as string)
                    });
                    
                    if (!invItem || invItem.quantity < item.quantity) {
                        throw new Error(`Insufficient stock for item ID: ${item.inventoryId}`);
                    }
                    if (invItem.condition === 'IN_INSPECTION') {
                        throw new Error(`Unit "${invItem.itemName}" masih dalam proses inspeksi QC. Tidak bisa dijual sebelum melewati proses QC.`);
                    }

                    const updatedInv = await tx.update(inventory)
                        .set({ quantity: sql`${inventory.quantity} - ${item.quantity}` })
                        .where(and(
                            eq(inventory.id, item.inventoryId as string),
                            gte(inventory.quantity, item.quantity)
                        ))
                        .returning();
                        
                    if (updatedInv.length === 0) {
                        throw new Error(`Insufficient stock for item ID: ${item.inventoryId} due to concurrent checkout. Please try again.`);
                    }

                    let validSNs: string[] = [];
                    if (invItem.tracksSerialNumber) {
                        if (item.serialNumbers && Array.isArray(item.serialNumbers)) {
                            validSNs = item.serialNumbers.filter((sn: any) => typeof sn === 'string' && sn.trim() !== '');
                        }
                        
                        if (validSNs.length !== item.quantity) {
                            throw new Error(`Barang "${invItem.itemName}" melacak nomor seri, tetapi jumlah nomor seri yang diisi (${validSNs.length}) tidak sesuai dengan kuantitas penjualan (${item.quantity}).`);
                        }
                    }

                    // Process serial numbers - ensure it's always a proper JSON string or null
                    let serialNumbersToStore: string | null = null;
                    if (validSNs.length > 0) {
                        // validSNs is already filtered array of strings
                        serialNumbersToStore = JSON.stringify(validSNs);
                    }

                    await tx.insert(transactionItems).values({
                        transactionId: newTx.id,
                        inventoryId: item.inventoryId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        serialNumbers: serialNumbersToStore
                    });

                    if (validSNs.length > 0) {
                        const { transitionDeviceStatus } = await import('@/lib/digital-passport');
                        for (const sn of validSNs) {
                            try {
                                await transitionDeviceStatus(
                                    storeId,
                                    sn,
                                    'SOLD',
                                    userId,
                                    newTx.id,
                                    `Sold via Invoice ${invoiceNumber}`,
                                    tx as any
                                );
                            } catch (e: any) {
                                if (e.message && e.message.includes('not found')) {
                                    console.warn(`Device Passport not found for SN ${sn}. Skipping transition.`);
                                } else {
                                    throw new Error(`Failed to process Device Passport for SN ${sn}: ${e.message}`);
                                }
                            }
                        }
                    }

                    if (invItem.isConsignment && invItem.supplierId) {
                        const utang = invItem.costPrice * item.quantity;
                        const komisi = (item.unitPrice - invItem.costPrice) * item.quantity;
                        totalUtangKonsinyasi += utang;
                        totalKomisiKonsinyasi += komisi > 0 ? komisi : 0;
                        
                        await tx.insert(consignmentPayables).values({
                            storeId,
                            supplierId: invItem.supplierId,
                            inventoryId: invItem.id,
                            transactionId: newTx.id,
                            amountDue: utang,
                            status: 'UNPAID',
                        });
                    } else {
                        totalCogs += invItem.costPrice * item.quantity;
                        totalRegularSales += item.unitPrice * item.quantity;
                    }
                }

                const dp = paymentStatus === "Belum Lunas" ? (dpAmount || 0) : amount;
                const piutang = amount - dp;
                const entries = [];

                if (totalRegularSales > 0) entries.push(createJournalEntry(storeId, newTx.id, "Penjualan Laptop", 0, totalRegularSales));
                if (totalKomisiKonsinyasi > 0) entries.push(createJournalEntry(storeId, newTx.id, "Pendapatan Komisi", 0, totalKomisiKonsinyasi));
                if (totalUtangKonsinyasi > 0) entries.push(createJournalEntry(storeId, newTx.id, "Utang Konsinyasi", 0, totalUtangKonsinyasi));
                if (totalCogs > 0) {
                    entries.push(
                        createJournalEntry(storeId, newTx.id, "HPP Laptop", totalCogs, 0),
                        createJournalEntry(storeId, newTx.id, "Persediaan", 0, totalCogs)
                    );
                }

                if (dp > 0) entries.push(createJournalEntry(storeId, newTx.id, liquidAccount, dp, 0));
                if (piutang > 0) entries.push(createJournalEntry(storeId, newTx.id, "Piutang Usaha", piutang, 0));

                if (entries.length > 0) await tx.insert(journalEntries).values(entries);

            } else if (transactionType === "Jasa Servis") {
                const dp = paymentStatus === "Belum Lunas" ? (dpAmount || 0) : amount;
                const piutang = amount - dp;

                const entries = [
                    createJournalEntry(storeId, newTx.id, "Pendapatan Servis", 0, amount)
                ];
                if (dp > 0) entries.push(createJournalEntry(storeId, newTx.id, liquidAccount, dp, 0));
                if (piutang > 0) entries.push(createJournalEntry(storeId, newTx.id, "Piutang Usaha", piutang, 0));

                await tx.insert(journalEntries).values(entries);
                
            } else if (transactionType === "Pembelian Stok") {
                for (const item of items) {
                    if (item.inventoryId) {
                        const invItem = await tx.query.inventory.findFirst({
                            where: and(
                                eq(inventory.id, item.inventoryId as string),
                                isNull(inventory.deletedAt) // Exclude soft-deleted items
                            )
                        });
                        if (!invItem) {
                            throw new Error(`Barang inventori dengan ID "${item.inventoryId}" tidak ditemukan atau sudah dihapus. Harap segarkan halaman browser Anda.`);
                        }
                        if (invItem) {
                            const newTotalCost = (invItem.quantity * invItem.costPrice) + (item.quantity * item.unitPrice);
                            const newQty = invItem.quantity + item.quantity;
                            const newCostPrice = newTotalCost / newQty;

                            await tx.update(inventory)
                                .set({ 
                                    quantity: newQty, 
                                    costPrice: newCostPrice,
                                    sellingPrice: item.sellingPrice || invItem.sellingPrice
                                })
                                .where(eq(inventory.id, item.inventoryId as string));
                            
                            let validSNs: string[] = [];
                            if (invItem.tracksSerialNumber) {
                                if (item.serialNumbers && Array.isArray(item.serialNumbers)) {
                                    validSNs = item.serialNumbers.filter((sn: any) => typeof sn === 'string' && sn.trim() !== '');
                                }
                                // Auto-register device passports
                                const { registerDevicePassport } = await import('@/lib/digital-passport');
                                for (const sn of validSNs) {
                                    try {
                                        await registerDevicePassport(
                                            storeId,
                                            invItem.id,
                                            sn,
                                            'READY_FOR_SALE',
                                            item.unitPrice, // cost price
                                            userId,
                                            tx
                                        );
                                    } catch (e: any) {
                                        console.warn(`Failed to auto-register Device Passport for SN ${sn}: ${e.message}`);
                                    }
                                }
                            }

                            // Process serial numbers - ensure it's always a proper JSON string or null
                            let serialNumbersToStore: string | null = null;
                            if (validSNs.length > 0) {
                                serialNumbersToStore = JSON.stringify(validSNs);
                            }

                            await tx.insert(transactionItems).values({
                                transactionId: newTx.id,
                                inventoryId: item.inventoryId,
                                quantity: item.quantity,
                                unitPrice: item.unitPrice,
                                serialNumbers: serialNumbersToStore
                            });
                        }
                    } else {
                        const tracksSN = item.tracksSerialNumber || false;
                        const [newInv] = await tx.insert(inventory).values({
                            storeId,
                            itemName: item.itemName as string,
                            category: item.category as string,
                            quantity: item.quantity,
                            costPrice: item.unitPrice,
                            sellingPrice: item.sellingPrice || 0,
                            specs: item.specs || null,
                            tracksSerialNumber: tracksSN
                        }).returning();

                        let validSNs: string[] = [];
                        if (tracksSN) {
                            if (item.serialNumbers && Array.isArray(item.serialNumbers)) {
                                validSNs = item.serialNumbers.filter((sn: any) => typeof sn === 'string' && sn.trim() !== '');
                            }
                            const { registerDevicePassport } = await import('@/lib/digital-passport');
                            for (const sn of validSNs) {
                                try {
                                    await registerDevicePassport(
                                        storeId,
                                        newInv.id,
                                        sn,
                                        'READY_FOR_SALE',
                                        item.unitPrice,
                                        userId,
                                        tx
                                    );
                                } catch (e: any) {
                                    console.warn(`Failed to auto-register Device Passport for SN ${sn}: ${e.message}`);
                                }
                            }
                        }

                        // Process serial numbers - ensure it's always a proper JSON string or null
                        let serialNumbersToStore: string | null = null;
                        if (validSNs.length > 0) {
                            serialNumbersToStore = JSON.stringify(validSNs);
                        }

                        await tx.insert(transactionItems).values({
                            transactionId: newTx.id,
                            inventoryId: newInv.id,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            serialNumbers: serialNumbersToStore
                        });
                    }
                }

                const { discount = 0, tax = 0, shipping = 0, subTotal = amount } = data.metadata || {};

                const dp = paymentMethod === "Tempo" ? (dpAmount || 0) : amount;
                const hutang = amount - dp;
                const entries = [];

                // Debit: Persediaan (Nilai pokok barang / subtotal)
                // Jika tidak ada metadata, subtotal = amount
                entries.push(createJournalEntry(storeId, newTx.id, "Persediaan", subTotal, 0));

                // Debit: PPN Masukan
                if (tax > 0) entries.push(createJournalEntry(storeId, newTx.id, "PPN Masukan", tax, 0));

                // Debit: Beban Pengiriman (Ongkir)
                if (shipping > 0) entries.push(createJournalEntry(storeId, newTx.id, "Beban Transportasi", shipping, 0));

                // Credit: Diskon (Potongan harga pembelian barang)
                // (Dalam akuntansi, Diskon Pembelian berada di sisi Kredit untuk mengurangi HPP/Aset)
                if (discount > 0) entries.push(createJournalEntry(storeId, newTx.id, "Diskon Pembelian", 0, discount));

                // Credit: Kas / Utang (Aliran uang keluar)
                if (dp > 0) entries.push(createJournalEntry(storeId, newTx.id, liquidAccount, 0, dp));
                if (hutang > 0) entries.push(createJournalEntry(storeId, newTx.id, "Utang Usaha", 0, hutang));
                
                await tx.insert(journalEntries).values(entries);

            } else if (transactionType === "Pengeluaran Operasional" || transactionType === "Operasional") {
                let accountName = "Beban Lain-lain";
                const descStr = description || "";
                const categories = [
                    "Beban Gaji Karyawan",
                    "Beban Listrik & Internet",
                    "Beban Sewa Tempat",
                    "Beban ATK & Perlengkapan",
                    "Beban Pemasaran / Iklan",
                    "Beban Transportasi",
                    "Beban Perbaikan & Perawatan",
                    "Beban Lain-lain"
                ];

                let found = false;
                for (const cat of categories) {
                    if (descStr.startsWith(cat)) {
                        accountName = cat;
                        found = true;
                        break;
                    }
                }

                if (!found) {
                    accountName = `Beban ${descStr || 'Operasional'}`;
                }

                const entries = [
                    createJournalEntry(storeId, newTx.id, accountName, amount, 0),
                    createJournalEntry(storeId, newTx.id, liquidAccount, 0, amount)
                ];
                await tx.insert(journalEntries).values(entries);
            } else if (transactionType === "Modal Baru") {
                await tx.insert(journalEntries).values([
                    createJournalEntry(storeId, newTx.id, liquidAccount, amount, 0),
                    createJournalEntry(storeId, newTx.id, "Modal Pemilik", 0, amount)
                ]);
            } else if (transactionType === "Prive") {
                await tx.insert(journalEntries).values([
                    createJournalEntry(storeId, newTx.id, "Prive", amount, 0),
                    createJournalEntry(storeId, newTx.id, liquidAccount, 0, amount)
                ]);
            } else if (transactionType === "Pinjaman Bank") {
                await tx.insert(journalEntries).values([
                    createJournalEntry(storeId, newTx.id, liquidAccount, amount, 0),
                    createJournalEntry(storeId, newTx.id, "Hutang Bank", 0, amount)
                ]);
            } else if (transactionType === "Pelunasan Hutang") {
                await tx.insert(journalEntries).values([
                    createJournalEntry(storeId, newTx.id, "Hutang Bank", amount, 0),
                    createJournalEntry(storeId, newTx.id, liquidAccount, 0, amount)
                ]);
            } else if (transactionType === "Pembelian Aset Tetap") {
                await tx.insert(journalEntries).values([
                    createJournalEntry(storeId, newTx.id, "Kendaraan", amount, 0),
                    createJournalEntry(storeId, newTx.id, liquidAccount, 0, amount)
                ]);
            } else if (transactionType === "Penjualan Aset Tetap") {
                await tx.insert(journalEntries).values([
                    createJournalEntry(storeId, newTx.id, liquidAccount, amount, 0),
                    createJournalEntry(storeId, newTx.id, "Kendaraan", 0, amount)
                ]);
            }

            // Loyalty Points
            if (finalCustomerId && transactionType === "Penjualan") {
                const { awardPoints } = await import('@/lib/crm-helper');
                try {
                    await awardPoints(tx, finalCustomerId, amount, `Sales: ${invoiceNumber}`);
                } catch (err: any) {
                    console.error("Failed to award points:", err);
                }
            }

            await tx.insert(activityLogs).values({
                storeId,
                userId,
                userName,
                action: "CREATE_TRANSACTION",
                entityType: "transaction",
                entityId: newTx.id,
                details: JSON.stringify({ transactionType, amount, description, invoiceNumber })
            });

            return newTx;
        });
    }
}
