import { NextResponse } from "next/server";
import { db } from "@/db";
import { transactions, transactionItems, journalEntries, inventory, activityLogs, customers, stores, storeSettings, cashierShifts, consignmentPayables } from "@/db/schema";
import { desc, eq, count, gte, lte, and, like, inArray, sql } from "drizzle-orm";
import { withActiveTransactions } from "@/db/query-helpers";
import crypto from "crypto";
import { requireAuth, requireWriteAccess, requirePermission } from "@/lib/auth-guard";
import { Permissions } from "@/lib/permissions";
import { transactionSchema } from "@/lib/validators";
import { awardPoints } from "@/lib/crm-helper";
import { TransactionService } from "@/services/TransactionService";

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
            where: withActiveTransactions(conditions.length > 0 ? and(...conditions) : undefined),
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

        const isKasir = authResult.storeRole === "kasir" || authResult.user.role === "kasir";
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

        const newTx = await TransactionService.createTransaction({
            storeId: authResult.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            activeShiftId: activeShift?.id || null,
            data: parsed.data
        });

        return NextResponse.json({ success: true, transaction: newTx }, { status: 201 });
    } catch (error: any) {
        console.error("Failed to process transaction:", error);
        return NextResponse.json({ error: error.message || "Failed to process transaction" }, { status: 500 });
    }
}
