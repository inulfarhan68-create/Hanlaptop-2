import { NextResponse } from "next/server";
import { db } from "@/db";
import { transactions, transactionItems, journalEntries, inventory, activityLogs, cashierShifts, storeSettings } from "@/db/schema";
import { eq, and, gte, like, desc } from "drizzle-orm";
import { requireAuth, storeScope, requireWritable } from "@/lib/auth-guard";
import { returnTransactionSchema } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeInput } from "@/lib/sanitize";

export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    const rateLimitResponse = await checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const demoBlock = requireWritable(authResult);
    if (demoBlock) return demoBlock;

    if (authResult.storeId === "all") {
        return NextResponse.json({ error: "Please select a specific branch to process returns" }, { status: 400 });
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

        const { id } = await context.params;
        const rawBody = await request.json();
        const body = sanitizeInput(rawBody);
        const parsed = returnTransactionSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }

        const { items, refundMethod, refundAmount, reason } = parsed.data;

        // Fetch original transaction
        const originalTx = await db.query.transactions.findFirst({
            where: and(eq(transactions.id, id), storeScope(authResult, transactions.storeId)),
            with: {
                items: true
            }
        });

        if (!originalTx) {
            return NextResponse.json({ error: "Original transaction not found" }, { status: 404 });
        }

        if (originalTx.transactionType !== "Penjualan") {
            return NextResponse.json({ error: "Only sales transactions can be returned" }, { status: 400 });
        }

        // Find all previous returns for this transaction to check remaining returnable qty
        const previousReturns = await db.query.transactions.findMany({
            where: and(
                eq(transactions.originalTransactionId, id),
                eq(transactions.transactionType, "Retur Penjualan")
            ),
            with: {
                items: true
            }
        });

        const returnedQtyMap: Record<string, number> = {};
        previousReturns.forEach(ret => {
            ret.items.forEach(item => {
                if (item.inventoryId) {
                    returnedQtyMap[item.inventoryId] = (returnedQtyMap[item.inventoryId] || 0) + item.quantity;
                }
            });
        });

        // Validate quantities to return
        for (const item of items) {
            const originalItem = originalTx.items.find(it => it.inventoryId === item.inventoryId);
            if (!originalItem) {
                return NextResponse.json({ error: `Item with ID ${item.inventoryId} is not in the original transaction` }, { status: 400 });
            }
            const alreadyReturned = returnedQtyMap[item.inventoryId] || 0;
            const maxReturnable = originalItem.quantity - alreadyReturned;
            if (item.quantity > maxReturnable) {
                return NextResponse.json({ error: `Return quantity (${item.quantity}) exceeds remaining returnable quantity (${maxReturnable}) for item: ${originalItem.inventoryId}` }, { status: 400 });
            }
        }

        // Validate refund method 'Potong Piutang'
        const remainingDebt = originalTx.amount - (originalTx.dpAmount || 0);
        if (refundMethod === "Potong Piutang") {
            if (originalTx.paymentStatus !== "Belum Lunas" || remainingDebt <= 0) {
                return NextResponse.json({ error: "Cannot use Potong Piutang for fully paid transactions" }, { status: 400 });
            }
            if (refundAmount > remainingDebt) {
                return NextResponse.json({ error: `Refund amount (${refundAmount}) exceeds remaining customer debt (${remainingDebt})` }, { status: 400 });
            }
        }

        // Generate return invoice number: RET/YYYY/MM/XXX
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const startOfMonth = new Date(year, now.getMonth(), 1);

        const prefix = `RET/${year}/${month}/`;
        const latestTx = await db.select({ invoiceNumber: transactions.invoiceNumber })
            .from(transactions)
            .where(and(
                eq(transactions.storeId, authResult.storeId),
                gte(transactions.transactionDate, startOfMonth),
                like(transactions.invoiceNumber, `${prefix}%`)
            ))
            .orderBy(desc(transactions.invoiceNumber))
            .limit(1);

        let seq = 1;
        if (latestTx.length > 0 && latestTx[0].invoiceNumber) {
            const parts = latestTx[0].invoiceNumber.split('/');
            const lastNum = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(lastNum)) seq = lastNum + 1;
        }
        
        const sequence = String(seq).padStart(3, "0");
        const invoiceNumber = `${prefix}${sequence}`;

        // Create return transaction record
        const [newTx] = await db.insert(transactions).values({
            storeId: authResult.storeId,
            transactionType: "Retur Penjualan",
            amount: refundAmount,
            description: reason || `Retur Penjualan untuk nota ${originalTx.invoiceNumber}`,
            invoiceNumber,
            customerName: originalTx.customerName,
            customerId: originalTx.customerId,
            paymentMethod: refundMethod,
            paymentStatus: "Lunas",
            originalTransactionId: originalTx.id,
            userId: authResult.user.id,
            shiftId: activeShift?.id || null,
            transactionDate: new Date(),
            createdAt: new Date()
        }).returning();

        // Calculate COGS and process items
        let totalCogs = 0;
        for (const item of items) {
            const invItem = await db.query.inventory.findFirst({
                where: eq(inventory.id, item.inventoryId)
            });
            if (invItem) {
                // Increase stock quantity
                await db.update(inventory)
                    .set({ quantity: invItem.quantity + item.quantity })
                    .where(eq(inventory.id, item.inventoryId));
                
                // Save returned item
                await db.insert(transactionItems).values({
                    transactionId: newTx.id,
                    inventoryId: item.inventoryId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    serialNumbers: item.serialNumbers ? JSON.stringify(item.serialNumbers) : null
                });

                totalCogs += invItem.costPrice * item.quantity;
            }
        }

        // Insert Journal Entries for Return
        const paymentAccountMap: Record<string, string> = {
            'Cash': 'Kas',
            'Transfer Bank': 'Bank',
            'QRIS': 'QRIS',
            'Potong Piutang': 'Piutang Usaha'
        };
        const refundAccount = paymentAccountMap[refundMethod] || "Kas";

        const entries = [
            { storeId: authResult.storeId, transactionId: newTx.id, accountName: "Pendapatan", debit: refundAmount, credit: 0 },
            { storeId: authResult.storeId, transactionId: newTx.id, accountName: refundAccount, debit: 0, credit: refundAmount }
        ];

        if (totalCogs > 0) {
            entries.push(
                { storeId: authResult.storeId, transactionId: newTx.id, accountName: "Persediaan", debit: totalCogs, credit: 0 },
                { storeId: authResult.storeId, transactionId: newTx.id, accountName: "HPP", debit: 0, credit: totalCogs }
            );
        }

        await db.insert(journalEntries).values(entries);

        // Update original transaction if 'Potong Piutang' is selected
        if (refundMethod === "Potong Piutang") {
            const newDpAmount = (originalTx.dpAmount || 0) + refundAmount;
            const isFullyPaid = newDpAmount >= originalTx.amount;
            
            await db.update(transactions)
                .set({
                    dpAmount: newDpAmount,
                    paymentStatus: isFullyPaid ? "Lunas" : "Belum Lunas"
                })
                .where(eq(transactions.id, id));

            // Also record adjustment in original transaction journal entries if needed, 
            // but the new return transaction's journal entry (debit Pendapatan / credit Piutang) 
            // already balances the customer ledger!
        }

        // Log activity
        await db.insert(activityLogs).values({
            storeId: authResult.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "CREATE_RETURN",
            entityType: "transaction",
            entityId: newTx.id,
            details: JSON.stringify({ 
                originalTransactionId: id, 
                refundAmount, 
                refundMethod,
                reason 
            })
        });

        return NextResponse.json(newTx, { status: 201 });
    } catch (error: any) {
        console.error("Failed to process return:", error);
        return NextResponse.json({ error: error.message || "Failed to process return" }, { status: 500 });
    }
}
