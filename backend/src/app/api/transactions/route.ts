import { NextResponse } from "next/server";
import { db } from "@/db";
import { transactions, transactionItems, journalEntries, inventory, activityLogs, customers, stores, storeSettings, cashierShifts, consignmentPayables } from "@/db/schema";
import { desc, eq, count, gte, lte, and, or, like, ilike, inArray, sql } from "drizzle-orm";
import { withActiveTransactions } from "@/db/query-helpers";
import crypto from "crypto";
import { requireAuth, requireWriteAccess, requirePermission, storeScope } from "@/lib/auth-guard";
import { Permissions } from "@/lib/permissions";
import { transactionSchema } from "@/lib/validators";
import { awardPoints } from "@/lib/crm-helper";
import { TransactionService } from "@/services/TransactionService";
import { incrementUsage } from "@/lib/usage-limits";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authResult = await requirePermission(Permissions.TRANSACTION_READ);
    if (authResult instanceof NextResponse) return authResult;

    try {
        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const limitParam = searchParams.get('limit');
        const search = searchParams.get('search');
        const type = searchParams.get('type');
        const pageParam = searchParams.get('page');

        // Paged mode is opt-in: with `page` the response becomes
        // { items, summary, pagination }; without it the plain array other callers
        // (and the e2e isolation tests) already rely on is unchanged.
        const paged = pageParam !== null;
        const page = Math.max(1, Number(pageParam) || 1);
        const pageSize = Math.min(200, Math.max(1, Number(limitParam) || 25));

        let conditions = [];
        const scope = storeScope(authResult, transactions.storeId);
        if (scope) conditions.push(scope);
        if (from) conditions.push(gte(transactions.transactionDate, new Date(from)));
        if (to) conditions.push(lte(transactions.transactionDate, new Date(to)));
        if (type) conditions.push(eq(transactions.transactionType, type));
        if (search) {
            const q = `%${search}%`;
            const textMatch = or(
                ilike(transactions.customerName, q),
                ilike(transactions.description, q),
                ilike(transactions.transactionType, q),
                ilike(transactions.paymentStatus, q),
                ilike(transactions.paymentMethod, q),
                ilike(transactions.invoiceNumber, q)
            );
            if (textMatch) conditions.push(textMatch);
        }

        const whereClause = withActiveTransactions(conditions.length > 0 ? and(...conditions) : undefined);

        const data = await db.query.transactions.findMany({
            where: whereClause,
            orderBy: [desc(transactions.transactionDate)],
            limit: paged ? pageSize : (limitParam ? parseInt(limitParam) : undefined),
            offset: paged ? (page - 1) * pageSize : undefined,
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

        // Everything below decorates the rows already fetched: the creator names and
        // the store info depend only on `data`, not on each other, so they go out
        // together. They used to run one after the other — three sequential
        // round-trips where one suffices.
        //
        // Store info covers just the transactions in this response: reading the whole
        // stores/store_settings tables meant two unbounded scans per request (and
        // crossed the tenant boundary); `data` is already store-scoped, so its own
        // store ids are the exact set needed.
        const txIds = data.map(t => t.id);
        const txStoreIds = Array.from(new Set(data.map(tx => tx.storeId).filter(Boolean)));

        const [logs, allStores, allSettings] = await Promise.all([
            txIds.length === 0
                ? Promise.resolve([])
                : db.select({
                    entityId: activityLogs.entityId,
                    userName: activityLogs.userName
                })
                .from(activityLogs)
                .where(and(
                    eq(activityLogs.action, "CREATE_TRANSACTION"),
                    inArray(activityLogs.entityId, txIds)
                )),

            txStoreIds.length === 0
                ? Promise.resolve([])
                : db.select().from(stores).where(inArray(stores.id, txStoreIds)),

            txStoreIds.length === 0
                ? Promise.resolve([])
                : db.select().from(storeSettings).where(inArray(storeSettings.storeId, txStoreIds)),
        ]);

        const creatorMap = new Map<string, string>();
        logs.forEach(l => {
            if (l.entityId) creatorMap.set(l.entityId, l.userName);
        });

        const storesMap = new Map(allStores.map(s => [s.id, s]));
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
                    // No invented fallbacks: this is printed on customer-facing notas.
                    // These used to fall back to the flagship tenant's real address and
                    // phone number, so any other shop that hadn't filled in its details
                    // handed its customers Han Laptop's contact details.
                    name: txSettings?.storeName || txStore?.name || "",
                    address: txSettings?.storeAddress || txStore?.address || "",
                    phone: txSettings?.storePhone || txStore?.phone || "",
                    logo: txSettings?.storeLogo || null,
                    signature: txSettings?.storeSignature || null,
                    footer: txSettings?.storeFooter || "Terima kasih atas kunjungan Anda.\nBarang yang sudah dibeli\ntidak dapat ditukar/dikembalikan.",
                    waTemplateNota: txSettings?.waTemplateNota || null,
                    banks: parsedBanks
                }
            };
        });

        if (!paged) {
            return NextResponse.json(dataWithCreatorAndStore);
        }

        // The history page's income/expense/capital figures used to be reduced in the
        // browser over every matching transaction, which is what made paging unsafe —
        // a capped page would have quietly shrunk the totals. They're aggregated here
        // over the whole filtered set instead, so the summary is independent of which
        // page is being shown.
        const INCOME_TYPES = ["Penjualan", "Jasa Servis"];
        const OUTFLOW_TYPES = ["Operasional", "Pembelian Stok", "Retur Penjualan"];
        const sumOf = (types: string[]) =>
            sql<number>`COALESCE(SUM(${transactions.amount}) FILTER (WHERE ${inArray(transactions.transactionType, types)}), 0)`;

        const [[totals], [totalRow]] = await Promise.all([
            db.select({
                totalIncome: sumOf(INCOME_TYPES),
                totalOut: sumOf(OUTFLOW_TYPES),
                modalIn: sumOf(["Modal Baru"]),
                modalOut: sumOf(["Prive"]),
            }).from(transactions).where(whereClause),

            db.select({ value: count() }).from(transactions).where(whereClause),
        ]);

        const n = (v: unknown) => Number(v) || 0;
        const totalItems = n(totalRow?.value);

        return NextResponse.json({
            items: dataWithCreatorAndStore,
            summary: {
                totalIncome: n(totals?.totalIncome),
                totalOut: n(totals?.totalOut),
                modalIn: n(totals?.modalIn),
                modalOut: n(totals?.modalOut),
                mutasiModal: n(totals?.modalIn) - n(totals?.modalOut),
            },
            pagination: {
                page,
                limit: pageSize,
                totalItems,
                totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
            },
        });
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

        if (authResult.organizationId) {
            // Background track usage (fire and forget is fine here)
            incrementUsage(authResult.organizationId, "transactions").catch(e => console.error("Usage tracking failed", e));
        }

        return NextResponse.json({ success: true, transaction: newTx }, { status: 201 });
    } catch (error: any) {
        console.error("Failed to process transaction:", error);
        return NextResponse.json({ error: error.message || "Failed to process transaction" }, { status: 500 });
    }
}
