import { NextResponse } from "next/server";
import { db } from "@/db";
import { transactionItems, transactions, inventory, customers } from "@/db/schema";
import { requireAuth } from "@/lib/auth-guard";
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
        // Using LIKE is the simplest way in sqlite for basic JSON array searching
        const snPattern = `%"${sn}"%`;

        // We need to find the matching transactionItems, then get their transactions & inventory details
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
        .where(withActiveTransactions(like(transactionItems.serialNumbers, snPattern)));

        // Optional: If multi-tenant, filter by storeId
        const filteredResults = storeId === "all" 
            ? results 
            : results.filter((r: any) => {
                // To do this strictly in DB we need to join stores or add storeId to transactions.
                // Assuming transactions.storeId is available (it should be, based on earlier review).
                return true; // We'll just filter after fetching or rely on the fact that Kasir only sees their SNs.
            });

        // Fetch transactions directly to filter properly by storeId
        const finalResults = [];
        for (const r of filteredResults) {
            const tx = await db.query.transactions.findFirst({
                where: withActiveTransactions(eq(transactions.id, r.transactionId))
            });
            
            if (!tx) continue;
            if (storeId !== "all" && tx.storeId !== storeId) continue;

            // Determine if warranty is still active (Assuming default 30 days for testing, you can customize this)
            const purchaseDate = new Date(tx.transactionDate || new Date());
            const today = new Date();
            
            // Calculate diff in days
            const diffTime = Math.abs(today.getTime() - purchaseDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            let status = "Habis";
            let daysRemaining = 0;

            // Example default rule: 30 days hardware warranty
            const warrantyLimitDays = 30;
            if (diffDays <= warrantyLimitDays) {
                status = "Aktif";
                daysRemaining = warrantyLimitDays - diffDays;
            }

            finalResults.push({
                ...r,
                tx,
                warrantyStatus: status,
                warrantyDaysRemaining: daysRemaining,
                warrantyLimitDays
            });
        }

        return NextResponse.json(finalResults, { status: 200 });
    } catch (error: any) {
        console.error("Failed to check warranty:", error);
        return NextResponse.json({ error: error.message || "Failed to check warranty" }, { status: 500 });
    }
}
