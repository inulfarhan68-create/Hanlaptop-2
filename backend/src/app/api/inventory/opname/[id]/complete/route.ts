import { NextResponse } from "next/server";
import { db } from "@/db";
import { stockOpnames, stockOpnameItems, inventory, transactions, journalEntries, activityLogs } from "@/db/schema";
import { requireOwnerOrManager } from "@/lib/auth-guard";
import { checkRateLimit } from "@/lib/rate-limit";
import { and, eq } from "drizzle-orm";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const rateLimitResponse = await checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const authResult = await requireOwnerOrManager();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const { id: opnameId } = await params;
        
        const opname = await db.query.stockOpnames.findFirst({
            where: eq(stockOpnames.id, opnameId),
            with: {
                items: {
                    with: {
                        inventoryItem: true
                    }
                }
            }
        });

        if (!opname) return NextResponse.json({ error: "Opname tidak ditemukan" }, { status: 404 });
        if (authResult.storeId !== "all" && opname.storeId !== authResult.storeId) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
        if (opname.status !== "DRAFT") return NextResponse.json({ error: "Opname sudah selesai" }, { status: 400 });

        let totalLossValue = 0;
        let totalGainValue = 0;

        // Process items
        for (const item of opname.items) {
            if (item.difference !== 0 && item.inventoryItem) {
                // Update actual inventory
                await db.update(inventory)
                    .set({ quantity: item.physicalQty })
                    .where(eq(inventory.id, item.inventoryId));

                const valueDiff = Math.abs(item.difference) * item.inventoryItem.costPrice;
                if (item.difference < 0) {
                    totalLossValue += valueDiff; // Missing stock
                } else {
                    totalGainValue += valueDiff; // Extra stock
                }
            }
        }

        // Generate journal entry if there is a difference
        if (totalLossValue > 0 || totalGainValue > 0) {
            // Create a dummy transaction for the journal
            const txId = crypto.randomUUID();
            await db.insert(transactions).values({
                id: txId,
                storeId: opname.storeId,
                transactionType: 'Operasional',
                amount: Math.max(totalLossValue, totalGainValue),
                description: `Penyesuaian Stok Opname - ${new Date().toLocaleDateString('id-ID')}`,
                transactionDate: new Date(),
                paymentMethod: 'Cash',
                paymentStatus: 'Lunas'
            });

            if (totalLossValue > 0) {
                // Loss: Debit HPP/Kerugian, Credit Persediaan
                await db.insert(journalEntries).values([
                    { storeId: opname.storeId, transactionId: txId, accountName: "Harga Pokok Penjualan", debit: totalLossValue, credit: 0 },
                    { storeId: opname.storeId, transactionId: txId, accountName: "Persediaan Barang", debit: 0, credit: totalLossValue },
                ]);
            }
            
            if (totalGainValue > 0) {
                // Gain: Debit Persediaan, Credit Pendapatan Lain-lain
                await db.insert(journalEntries).values([
                    { storeId: opname.storeId, transactionId: txId, accountName: "Persediaan Barang", debit: totalGainValue, credit: 0 },
                    { storeId: opname.storeId, transactionId: txId, accountName: "Pendapatan Lain-lain", debit: 0, credit: totalGainValue },
                ]);
            }
        }

        // Update Opname status
        await db.update(stockOpnames)
            .set({ 
                status: "COMPLETED",
                completedAt: new Date()
            })
            .where(eq(stockOpnames.id, opnameId));

        // Create Activity Log
        await db.insert(activityLogs).values({
            storeId: opname.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "COMPLETE_OPNAME",
            entityType: "inventory",
            entityId: opnameId,
            details: JSON.stringify({
                totalLossValue,
                totalGainValue
            })
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
