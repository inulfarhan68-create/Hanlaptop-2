import { NextResponse } from "next/server";
import { db } from "@/db";
import { storeSettings, customers, inventory, transactions, transactionItems, journalEntries, serviceOrders, activityLogs } from "@/db/schema";
import { requireOwnerOrManager, storeScope } from "@/lib/auth-guard";
import { restoreBackupSchema } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limit";
import { eq, inArray } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const authResult = await requireOwnerOrManager();
        if (authResult instanceof NextResponse) return authResult;

        const storeId = authResult.storeId;
        if (storeId === "all") {
            return NextResponse.json({ error: "Pilih cabang tertentu terlebih dahulu untuk melakukan cadangan data." }, { status: 400 });
        }

        // Fetch all tables scoped to storeId
        const settingsData = await db.query.storeSettings.findFirst({
            where: eq(storeSettings.storeId, storeId)
        });
        
        const customersData = await db.select().from(customers).where(eq(customers.storeId, storeId));
        const inventoryData = await db.select().from(inventory).where(eq(inventory.storeId, storeId));
        const transactionsData = await db.select().from(transactions).where(eq(transactions.storeId, storeId));
        
        // Fetch transaction items for those transactions
        const txIds = transactionsData.map(tx => tx.id);
        let itemsData: any[] = [];
        if (txIds.length > 0) {
            const chunkSize = 500;
            for (let i = 0; i < txIds.length; i += chunkSize) {
                const chunk = txIds.slice(i, i + chunkSize);
                const chunkItems = await db.select().from(transactionItems).where(inArray(transactionItems.transactionId, chunk));
                itemsData.push(...chunkItems);
            }
        }
        
        const journalsData = await db.select().from(journalEntries).where(eq(journalEntries.storeId, storeId));
        const serviceOrdersData = await db.select().from(serviceOrders).where(eq(serviceOrders.storeId, storeId));
        const logsData = await db.select().from(activityLogs).where(eq(activityLogs.storeId, storeId));

        const backupData = {
            version: "1.0",
            storeId: storeId,
            backupDate: new Date().toISOString(),
            data: {
                storeSettings: settingsData || null,
                customers: customersData,
                inventory: inventoryData,
                transactions: transactionsData,
                transactionItems: itemsData,
                journalEntries: journalsData,
                serviceOrders: serviceOrdersData,
                activityLogs: logsData
            }
        };

        return NextResponse.json(backupData, { status: 200 });
    } catch (error: any) {
        console.error("Backup failed:", error);
        return NextResponse.json({ error: error.message || "Failed to backup data" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const rateLimitResponse = await checkRateLimit(request, 10, 60_000); // Stricter: 10 restores per minute
    if (rateLimitResponse) return rateLimitResponse;

    try {
        const authResult = await requireOwnerOrManager();
        if (authResult instanceof NextResponse) return authResult;

        const storeId = authResult.storeId;
        if (storeId === "all") {
            return NextResponse.json({ error: "Pilih cabang tertentu terlebih dahulu untuk melakukan pemulihan data." }, { status: 400 });
        }

        const body = await request.json();
        const parsed = restoreBackupSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Format berkas cadangan tidak valid atau versi tidak kompatibel.", details: parsed.error.format() }, { status: 400 });
        }

        const { data } = body;
        
        // Helper to parse dates securely
        const parseDate = (val: any) => (val ? new Date(val) : null);
        const parseDateRequired = (val: any) => (val ? new Date(val) : new Date());

        // Process and map rows to inject the current active storeId
        // also parse ISO date strings back into Date objects for drizzle mode: 'timestamp'
        const settingsRow = data.storeSettings ? {
            ...data.storeSettings,
            storeId,
            updatedAt: parseDateRequired(data.storeSettings.updatedAt)
        } : null;

        const customersRows = (data.customers || []).map((r: any) => ({
            ...r,
            storeId,
            createdAt: parseDateRequired(r.createdAt)
        }));

        const inventoryRows = (data.inventory || []).map((r: any) => ({
            ...r,
            storeId,
            createdAt: parseDateRequired(r.createdAt)
        }));

        const transactionsRows = (data.transactions || []).map((r: any) => ({
            ...r,
            storeId,
            transactionDate: parseDateRequired(r.transactionDate),
            dueDate: parseDate(r.dueDate),
            createdAt: parseDateRequired(r.createdAt)
        }));

        const transactionItemsRows = (data.transactionItems || []).map((r: any) => ({
            ...r
        }));

        const journalEntriesRows = (data.journalEntries || []).map((r: any) => ({
            ...r,
            storeId,
            createdAt: parseDateRequired(r.createdAt)
        }));

        const serviceOrdersRows = (data.serviceOrders || []).map((r: any) => ({
            ...r,
            storeId,
            receivedDate: parseDateRequired(r.receivedDate),
            completedDate: parseDate(r.completedDate),
            warrantyUntil: parseDate(r.warrantyUntil),
            createdAt: parseDateRequired(r.createdAt)
        }));

        const activityLogsRows = (data.activityLogs || []).map((r: any) => ({
            ...r,
            storeId,
            createdAt: parseDateRequired(r.createdAt)
        }));

        // Execute truncate and insertions in a transaction
        await db.transaction(async (tx) => {
            // 1. Deletion
            // Fetch transaction IDs of active storeId to delete their transaction items
            const existingTx = await tx.select({ id: transactions.id })
                .from(transactions)
                .where(eq(transactions.storeId, storeId));
            const existingTxIds = existingTx.map(t => t.id);

            // Delete transaction items in chunks
            if (existingTxIds.length > 0) {
                const chunkSize = 500;
                for (let i = 0; i < existingTxIds.length; i += chunkSize) {
                    const chunk = existingTxIds.slice(i, i + chunkSize);
                    await tx.delete(transactionItems).where(inArray(transactionItems.transactionId, chunk));
                }
            }

            // Delete remaining store data
            await tx.delete(journalEntries).where(eq(journalEntries.storeId, storeId));
            await tx.delete(transactions).where(eq(transactions.storeId, storeId));
            await tx.delete(serviceOrders).where(eq(serviceOrders.storeId, storeId));
            await tx.delete(inventory).where(eq(inventory.storeId, storeId));
            await tx.delete(customers).where(eq(customers.storeId, storeId));
            await tx.delete(storeSettings).where(eq(storeSettings.storeId, storeId));
            await tx.delete(activityLogs).where(eq(activityLogs.storeId, storeId));

            // 2. Insertion
            if (settingsRow) {
                await tx.insert(storeSettings).values(settingsRow);
            }

            if (customersRows.length > 0) {
                await tx.insert(customers).values(customersRows);
            }

            if (inventoryRows.length > 0) {
                await tx.insert(inventory).values(inventoryRows);
            }

            if (transactionsRows.length > 0) {
                await tx.insert(transactions).values(transactionsRows);
            }

            if (transactionItemsRows.length > 0) {
                const itemsChunkSize = 150;
                for (let i = 0; i < transactionItemsRows.length; i += itemsChunkSize) {
                    const chunk = transactionItemsRows.slice(i, i + itemsChunkSize);
                    await tx.insert(transactionItems).values(chunk);
                }
            }

            if (journalEntriesRows.length > 0) {
                const journalChunkSize = 100;
                for (let i = 0; i < journalEntriesRows.length; i += journalChunkSize) {
                    const chunk = journalEntriesRows.slice(i, i + journalChunkSize);
                    await tx.insert(journalEntries).values(chunk);
                }
            }

            if (serviceOrdersRows.length > 0) {
                const serviceChunkSize = 50;
                for (let i = 0; i < serviceOrdersRows.length; i += serviceChunkSize) {
                    const chunk = serviceOrdersRows.slice(i, i + serviceChunkSize);
                    await tx.insert(serviceOrders).values(chunk);
                }
            }

            if (activityLogsRows.length > 0) {
                const logChunkSize = 100;
                for (let i = 0; i < activityLogsRows.length; i += logChunkSize) {
                    const chunk = activityLogsRows.slice(i, i + logChunkSize);
                    await tx.insert(activityLogs).values(chunk);
                }
            }

            // Create new audit log for the restoration event
            await tx.insert(activityLogs).values({
                storeId,
                userId: authResult.user.id,
                userName: authResult.user.name,
                action: "RESTORE_DATABASE",
                entityType: "settings",
                entityId: storeId,
                details: JSON.stringify({ restoreDate: new Date(), backupDate: body.backupDate }),
                createdAt: new Date()
            });
        });

        return NextResponse.json({ success: true, message: "Database successfully restored!" }, { status: 200 });
    } catch (error: any) {
        console.error("Restore failed:", error);
        return NextResponse.json({ error: error.message || "Failed to restore database" }, { status: 500 });
    }
}
