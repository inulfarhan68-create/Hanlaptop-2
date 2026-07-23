import { NextResponse } from "next/server";
import { db } from "@/db";
import { transactionItems, transactions, inventory, customers } from "@/db/schema";
import { requireAuth, storeScope } from "@/lib/auth-guard";
import { withActiveTransactions } from "@/db/query-helpers";
import { eq, like, and } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const sn = searchParams.get('sn');

    if (!sn) {
        return NextResponse.json({ error: "Serial Number (SN) diperlukan" }, { status: 400 });
    }

    try {
        const storeId = authResult.storeId;
        
        // Search for transaction items where serialNumbers contains the SN.
        // serialNumbers is stored as JSON string like '["SN123", "SN456"]'
        const snPattern = `%"${sn}"%`;

        // 🔒 Tenant-safe: Build WHERE with storeScope
        const scope = storeScope(authResult, transactions.storeId);
        const whereCondition = scope
            ? withActiveTransactions(and(like(transactionItems.serialNumbers, snPattern), scope))
            : withActiveTransactions(like(transactionItems.serialNumbers, snPattern));

        const results = await db.select({
            transactionItemId: transactionItems.id,
            serialNumbers: transactionItems.serialNumbers,
            quantity: transactionItems.quantity,
            unitPrice: transactionItems.unitPrice,
            
            transactionId: transactions.id,
            invoiceNumber: transactions.invoiceNumber,
            transactionDate: transactions.transactionDate,
            customerName: transactions.customerName,
            
            inventoryId: inventory.id,
            itemName: inventory.itemName,
            category: inventory.category,
        })
        .from(transactionItems)
        .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
        .leftJoin(inventory, eq(transactionItems.inventoryId, inventory.id))
        .where(whereCondition);

        // Process warranty status for each result
        const finalResults = results.map(r => {
            const purchaseDate = new Date(r.transactionDate || new Date());
            const today = new Date();
            
            const diffTime = Math.abs(today.getTime() - purchaseDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            let status = "Habis";
            let daysRemaining = 0;

            const warrantyLimitDays = 30;
            if (diffDays <= warrantyLimitDays) {
                status = "Aktif";
                daysRemaining = warrantyLimitDays - diffDays;
            }

            return {
                ...r,
                warrantyStatus: status,
                warrantyDaysRemaining: daysRemaining,
                warrantyLimitDays
            };
        });

        return NextResponse.json(finalResults, { status: 200 });
    } catch (error: any) {
        console.error("Failed to check warranty:", error);
        return NextResponse.json({ error: error.message || "Failed to check warranty" }, { status: 500 });
    }
}
