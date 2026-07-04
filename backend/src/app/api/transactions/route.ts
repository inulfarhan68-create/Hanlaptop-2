import { NextResponse } from "next/server";
import { db } from "@/db";
import { transactions, transactionItems, journalEntries, inventory, activityLogs, customers, stores, storeSettings, cashierShifts } from "@/db/schema";
import { desc, eq, count, gte, lte, and, like, inArray, sql } from "drizzle-orm";
import crypto from "crypto";
import { requireAuth, requireWriteAccess, requirePermission } from "@/lib/auth-guard";
import { Permissions } from "@/lib/permissions";
import { transactionSchema } from "@/lib/validators";
import { awardPoints } from "@/lib/crm-helper";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authResult = await requirePermission(Permissions.TRANSACTION_READ);
    if (authResult instanceof NextResponse) return authResult;

    try {
        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const limitParam = searchParams.get('limit');
        
        let conditions = [];
        if (authResult.storeId !== "all") {
            conditions.push(eq(transactions.storeId, authResult.storeId));
        }
        if (from) conditions.push(gte(transactions.transactionDate, new Date(from)));
        if (to) conditions.push(lte(transactions.transactionDate, new Date(to)));

        const data = await db.query.transactions.findMany({
            where: conditions.length > 0 ? and(...conditions) : undefined,
            orderBy: [desc(transactions.transactionDate)],
            limit: limitParam ? parseInt(limitParam) : undefined,
            with: {
                items: {
                    with: {
                        inventoryItem: true
                    }
                },
                journals: true,
                customer: true,
                supplier: true
            }
        });

        // Pull creator (cashier) name from activity logs
        const txIds = data.map(t => t.id);
        const creatorMap = new Map<string, string>();
        if (txIds.length > 0) {
            const logs = await db.select({
                entityId: activityLogs.entityId,
                userName: activityLogs.userName
            })
            .from(activityLogs)
            .where(and(
                eq(activityLogs.action, "CREATE_TRANSACTION"),
                inArray(activityLogs.entityId, txIds)
            ));
            logs.forEach(l => {
                if (l.entityId) creatorMap.set(l.entityId, l.userName);
            });
        }

        // Fetch all stores and store settings to attach store info to each transaction
        const allStores = await db.select().from(stores);
        const storesMap = new Map(allStores.map(s => [s.id, s]));

        const allSettings = await db.select().from(storeSettings);
        const settingsMap = new Map(allSettings.map(s => [s.storeId, s]));

        const dataWithCreatorAndStore = data.map(tx => {
            const txStore = storesMap.get(tx.storeId);
            const txSettings = settingsMap.get(tx.storeId);
            
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

            return {
                ...tx,
                items: sanitizedItems,
                creatorName: creatorMap.get(tx.id) || "Kasir",
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
            };
        });

        return NextResponse.json(dataWithCreatorAndStore);
    } catch (error) {
        console.error("Failed to fetch transactions:", error);
        return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const authResult = await requirePermission(Permissions.TRANSACTION_CREATE);
    if (authResult instanceof NextResponse) return authResult;

    if (authResult.storeId === "all") {
        return NextResponse.json({ error: "Please select a specific branch to create a transaction" }, { status: 400 });
    }

    try {
        // Check if cashier shift is enabled in store settings
        const settings = await db.query.storeSettings.findFirst({
            where: eq(storeSettings.storeId, authResult.storeId)
        });
        const isShiftEnabled = settings ? settings.enableCashierShift !== false : true;

        const activeShift = await db.query.cashierShifts.findFirst({
            where: and(
                eq(cashierShifts.storeId, authResult.storeId),
                eq(cashierShifts.userId, authResult.user.id),
                eq(cashierShifts.status, "OPEN")
            )
        });

        const isKasir = authResult.storeRole === "kasir" || (authResult.user as any).role === "kasir";
        if (isShiftEnabled && isKasir && !activeShift) {
            return NextResponse.json({ error: "Anda harus membuka shift kasir terlebih dahulu sebelum melakukan transaksi" }, { status: 400 });
        }

        const body = await request.json();
        const parsed = transactionSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }
        const { 
            transactionType, 
            amount, 
            description, 
            items, 
            customerName, 
            customerPhone, 
            customerAddress, 
            paymentMethod, 
            paymentStatus, 
            dpAmount, 
            discountAmount, 
            dueDate, 
            customerId,
            supplierId
        } = parsed.data;

        const result = await db.transaction(async (tx) => {

        // Generate custom invoice number: INV/YYYY/MM/XXX
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        
        const startOfMonth = new Date(year, now.getMonth(), 1);
        
        let invConditions = [gte(transactions.transactionDate, startOfMonth)];
        if (authResult.storeId !== "all") {
            invConditions.push(eq(transactions.storeId, authResult.storeId));
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

        // Map payment method to the correct liquid account
        const paymentAccountMap: Record<string, string> = {
            'Cash': 'Kas',
            'Transfer Bank': 'Bank',
            'Qris': 'QRIS',
            'Tempo': 'Kas'
        };
        const liquidAccount = paymentMethod ? (paymentAccountMap[paymentMethod as string] || "Kas") : "Kas";

        // Handle Customer Linking or Creation
        let finalCustomerId = customerId || null;
        if (!finalCustomerId && customerName) {
            // Check if customer with this name already exists
            const existingCust = await tx.query.customers.findFirst({
                where: and(eq(customers.name, customerName), eq(customers.storeId, authResult.storeId))
            });
            if (existingCust) {
                finalCustomerId = existingCust.id;
                // Update phone/address if newly provided and currently empty
                const updates: any = {};
                if (customerPhone && !existingCust.phone) updates.phone = customerPhone;
                if (customerAddress && !existingCust.address) updates.address = customerAddress;
                if (Object.keys(updates).length > 0) {
                    await tx.update(customers).set(updates).where(eq(customers.id, existingCust.id));
                }
            } else {
                // Create new customer
                const [newCust] = await tx.insert(customers).values({
                    storeId: authResult.storeId,
                    name: customerName,
                    phone: customerPhone || null,
                    address: customerAddress || null,
                }).returning();
                finalCustomerId = newCust.id;
            }
        }

        // 1. Create Transaction
        const [newTx] = await tx.insert(transactions).values({
            storeId: authResult.storeId,
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
            userId: authResult.user.id,
            shiftId: activeShift?.id || null,
            transactionDate: new Date(),
            createdAt: new Date()
        }).returning();

        // 2. Handle specific transaction types
        if (transactionType === "Penjualan") {
            let totalCogs = 0;
            let totalUtangKonsinyasi = 0;
            let totalKomisiKonsinyasi = 0;
            let totalRegularSales = 0;
            
            // Process Items
            for (const item of items) {
                if (!item.inventoryId) {
                    throw new Error("Inventory ID is required for sales items");
                }
                const invItem = await tx.query.inventory.findFirst({
                    where: eq(inventory.id, item.inventoryId as string)
                });
                
                if (!invItem || invItem.quantity < item.quantity) {
                    throw new Error(`Insufficient stock for item ID: ${item.inventoryId}`);
                }

                // PRD: Block sale of units still in inspection (must complete QC first)
                if (invItem.condition === 'IN_INSPECTION') {
                    throw new Error(`Unit "${invItem.itemName}" masih dalam proses inspeksi QC. Tidak bisa dijual sebelum melewati proses QC.`);
                }

                // Reduce Stock Atomically
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

                // Add Transaction Item
                await tx.insert(transactionItems).values({
                    transactionId: newTx.id,
                    inventoryId: item.inventoryId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    serialNumbers: item.serialNumbers ? JSON.stringify(item.serialNumbers) : null
                });

                if (invItem.isConsignment && invItem.supplierId) {
                    const utang = invItem.costPrice * item.quantity;
                    const komisi = (item.unitPrice - invItem.costPrice) * item.quantity;
                    
                    totalUtangKonsinyasi += utang;
                    totalKomisiKonsinyasi += komisi > 0 ? komisi : 0;
                    
                    // Create Payable Record
                    await tx.insert(require('@/db/schema').consignmentPayables).values({
                        storeId: authResult.storeId,
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

            // Journal Entries for Sales
            const dp = paymentStatus === "Belum Lunas" ? (dpAmount || 0) : amount;
            const piutang = amount - dp;

            const entries = [];
            
            if (totalRegularSales > 0) {
                entries.push({ storeId: authResult.storeId, transactionId: newTx.id, accountName: "Pendapatan", debit: 0, credit: totalRegularSales });
            }
            if (totalKomisiKonsinyasi > 0) {
                entries.push({ storeId: authResult.storeId, transactionId: newTx.id, accountName: "Pendapatan Komisi Konsinyasi", debit: 0, credit: totalKomisiKonsinyasi });
            }
            if (totalUtangKonsinyasi > 0) {
                entries.push({ storeId: authResult.storeId, transactionId: newTx.id, accountName: "Utang Konsinyasi", debit: 0, credit: totalUtangKonsinyasi });
            }
            if (totalCogs > 0) {
                entries.push(
                    { storeId: authResult.storeId, transactionId: newTx.id, accountName: "HPP", debit: totalCogs, credit: 0 },
                    { storeId: authResult.storeId, transactionId: newTx.id, accountName: "Persediaan", debit: 0, credit: totalCogs }
                );
            }

            if (dp > 0) entries.push({ storeId: authResult.storeId, transactionId: newTx.id, accountName: liquidAccount, debit: dp, credit: 0 });
            if (piutang > 0) entries.push({ storeId: authResult.storeId, transactionId: newTx.id, accountName: "Piutang Usaha", debit: piutang, credit: 0 });

            if (entries.length > 0) {
                await tx.insert(journalEntries).values(entries);
            }

        } else if (transactionType === "Jasa Servis") {
            // Journal Entries for Services
            const dp = paymentStatus === "Belum Lunas" ? (dpAmount || 0) : amount;
            const piutang = amount - dp;

            const entries = [
                { storeId: authResult.storeId, transactionId: newTx.id, accountName: "Pendapatan Servis", debit: 0, credit: amount }
            ];
            if (dp > 0) entries.push({ storeId: authResult.storeId, transactionId: newTx.id, accountName: liquidAccount, debit: dp, credit: 0 });
            if (piutang > 0) entries.push({ storeId: authResult.storeId, transactionId: newTx.id, accountName: "Piutang Usaha", debit: piutang, credit: 0 });

            await tx.insert(journalEntries).values(entries);
        } else if (transactionType === "Pembelian Stok") {
            // Handle Items
            for (const item of items) {
                // Update stock or insert new if it's new
                if (item.inventoryId) {
                    const invItem = await tx.query.inventory.findFirst({
                        where: eq(inventory.id, item.inventoryId as string)
                    });
                    
                    if (invItem) {
                        // Calculate new average cost price
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
                        
                        // Add Transaction Item
                        await tx.insert(transactionItems).values({
                            transactionId: newTx.id,
                            inventoryId: item.inventoryId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice
                        });
                    }
                } else {
                    // Create new inventory item
                    const [newInv] = await tx.insert(inventory).values({
                        storeId: authResult.storeId,
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

            // Journal Entries for Restock
            const dp = paymentMethod === "Tempo" ? (dpAmount || 0) : amount;
            const hutang = amount - dp;

            const entries = [
                { storeId: authResult.storeId, transactionId: newTx.id, accountName: "Persediaan", debit: amount, credit: 0 }
            ];
            if (dp > 0) entries.push({ storeId: authResult.storeId, transactionId: newTx.id, accountName: liquidAccount, debit: 0, credit: dp });
            if (hutang > 0) entries.push({ storeId: authResult.storeId, transactionId: newTx.id, accountName: "Hutang Usaha", debit: 0, credit: hutang });

            await tx.insert(journalEntries).values(entries);

        } else if (transactionType === "Operasional") {
            // Journal Entries for Expenses
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

            await tx.insert(journalEntries).values([
                { storeId: authResult.storeId, transactionId: newTx.id, accountName, debit: amount, credit: 0 },
                { storeId: authResult.storeId, transactionId: newTx.id, accountName: liquidAccount, debit: 0, credit: amount }
            ]);
        } else if (transactionType === "Modal Baru") {
            // Journal Entries for Capital Injection
            await tx.insert(journalEntries).values([
                { storeId: authResult.storeId, transactionId: newTx.id, accountName: liquidAccount, debit: amount, credit: 0 },
                { storeId: authResult.storeId, transactionId: newTx.id, accountName: "Modal Pemilik", debit: 0, credit: amount }
            ]);
        } else if (transactionType === "Prive") {
            // Journal Entries for Drawings (Prive)
            await tx.insert(journalEntries).values([
                { storeId: authResult.storeId, transactionId: newTx.id, accountName: "Prive", debit: amount, credit: 0 },
                { storeId: authResult.storeId, transactionId: newTx.id, accountName: liquidAccount, debit: 0, credit: amount }
            ]);
        } else if (transactionType === "Pinjaman Bank") {
            // Journal Entries for Bank Loan
            await tx.insert(journalEntries).values([
                { storeId: authResult.storeId, transactionId: newTx.id, accountName: liquidAccount, debit: amount, credit: 0 },
                { storeId: authResult.storeId, transactionId: newTx.id, accountName: "Hutang Bank", debit: 0, credit: amount }
            ]);
        } else if (transactionType === "Pelunasan Hutang") {
            // Journal Entries for Debt Repayment
            await tx.insert(journalEntries).values([
                { storeId: authResult.storeId, transactionId: newTx.id, accountName: "Hutang Bank", debit: amount, credit: 0 },
                { storeId: authResult.storeId, transactionId: newTx.id, accountName: liquidAccount, debit: 0, credit: amount }
            ]);
        } else if (transactionType === "Pembelian Aset Tetap") {
            // Journal Entries for Purchasing Fixed Assets
            await tx.insert(journalEntries).values([
                { storeId: authResult.storeId, transactionId: newTx.id, accountName: "Aset Tetap", debit: amount, credit: 0 },
                { storeId: authResult.storeId, transactionId: newTx.id, accountName: liquidAccount, debit: 0, credit: amount }
            ]);
        } else if (transactionType === "Penjualan Aset Tetap") {
            // Journal Entries for Selling Fixed Assets
            await tx.insert(journalEntries).values([
                { storeId: authResult.storeId, transactionId: newTx.id, accountName: liquidAccount, debit: amount, credit: 0 },
                { storeId: authResult.storeId, transactionId: newTx.id, accountName: "Aset Tetap", debit: 0, credit: amount }
            ]);
        }

        // Award CRM Membership Points
        if (finalCustomerId && (transactionType === "Penjualan" || transactionType === "Jasa Servis")) {
            try {
                await awardPoints(tx, finalCustomerId, amount, invoiceNumber);
            } catch (crmErr) {
                console.error("Failed to award CRM points:", crmErr);
            }
        }

        return newTx;
        });

        // Log activity
        await db.insert(activityLogs).values({
            storeId: authResult.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "CREATE_TRANSACTION",
            entityType: "transaction",
            entityId: result.id,
            details: JSON.stringify({ transactionType, amount, description, invoiceNumber: result.invoiceNumber })
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error: any) {
        console.error("Failed to process transaction:", error);
        return NextResponse.json({ error: error.message || "Failed to process transaction" }, { status: 500 });
    }
}
