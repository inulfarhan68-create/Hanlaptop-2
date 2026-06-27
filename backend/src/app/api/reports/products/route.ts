import { NextResponse } from "next/server";
import { db } from "@/db";
import { transactions, transactionItems, inventory } from "@/db/schema";
import { and, eq, gte, lte, inArray } from "drizzle-orm";
import { requireReportAccess } from "@/lib/auth-guard";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authResult = await requireReportAccess();
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const storeId = authResult.storeId;

    try {
        let conditions = [
            inArray(transactions.transactionType, ["Penjualan", "Retur Penjualan"])
        ];
        if (storeId !== "all") {
            conditions.push(eq(transactions.storeId, storeId));
        }
        if (from) {
            conditions.push(gte(transactions.transactionDate, new Date(from)));
        }
        if (to) {
            const toDate = new Date(to);
            toDate.setHours(23, 59, 59, 999);
            conditions.push(lte(transactions.transactionDate, toDate));
        }

        const items = await db.select({
            id: transactionItems.id,
            transactionId: transactionItems.transactionId,
            inventoryId: transactionItems.inventoryId,
            quantity: transactionItems.quantity,
            unitPrice: transactionItems.unitPrice,
            transactionType: transactions.transactionType,
            itemName: inventory.itemName,
            category: inventory.category,
            costPrice: inventory.costPrice,
            sellingPrice: inventory.sellingPrice,
        })
        .from(transactionItems)
        .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
        .leftJoin(inventory, eq(transactionItems.inventoryId, inventory.id))
        .where(and(...conditions));

        const productMap = new Map<string, {
            inventoryId: string | null;
            itemName: string;
            category: string;
            qtySold: number;
            revenue: number;
            cogs: number;
            profit: number;
            margin: number;
        }>();

        items.forEach(item => {
            const isReturn = item.transactionType === "Retur Penjualan";
            const factor = isReturn ? -1 : 1;
            
            const key = item.inventoryId || `deleted_${item.id}`;
            const name = item.itemName || "Produk Dihapus / Tidak Diketahui";
            const cat = item.category || "Lainnya";
            const cost = item.costPrice || 0;
            
            const qty = (item.quantity || 0) * factor;
            const rev = (item.quantity * item.unitPrice) * factor;
            const itemCogs = (item.quantity * cost) * factor;
            
            if (productMap.has(key)) {
                const existing = productMap.get(key)!;
                existing.qtySold += qty;
                existing.revenue += rev;
                existing.cogs += itemCogs;
                existing.profit = existing.revenue - existing.cogs;
            } else {
                productMap.set(key, {
                    inventoryId: item.inventoryId,
                    itemName: name,
                    category: cat,
                    qtySold: qty,
                    revenue: rev,
                    cogs: itemCogs,
                    profit: rev - itemCogs,
                    margin: 0
                });
            }
        });

        const products = Array.from(productMap.values()).map(p => {
            p.margin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
            return p;
        });

        products.sort((a, b) => b.profit - a.profit);

        // Group by category
        const categoryMap = new Map<string, {
            category: string;
            qtySold: number;
            revenue: number;
            cogs: number;
            profit: number;
            margin: number;
        }>();

        products.forEach(p => {
            if (categoryMap.has(p.category)) {
                const existing = categoryMap.get(p.category)!;
                existing.qtySold += p.qtySold;
                existing.revenue += p.revenue;
                existing.cogs += p.cogs;
                existing.profit = existing.revenue - existing.cogs;
            } else {
                categoryMap.set(p.category, {
                    category: p.category,
                    qtySold: p.qtySold,
                    revenue: p.revenue,
                    cogs: p.cogs,
                    profit: p.profit,
                    margin: 0
                });
            }
        });

        // Query Jasa Servis to add service category
        let serviceConditions = [
            eq(transactions.transactionType, "Jasa Servis")
        ];
        if (storeId !== "all") {
            serviceConditions.push(eq(transactions.storeId, storeId));
        }
        if (from) {
            serviceConditions.push(gte(transactions.transactionDate, new Date(from)));
        }
        if (to) {
            const toDate = new Date(to);
            toDate.setHours(23, 59, 59, 999);
            serviceConditions.push(lte(transactions.transactionDate, toDate));
        }

        const serviceTransactions = await db.select({
            amount: transactions.amount
        })
        .from(transactions)
        .where(and(...serviceConditions));

        const totalServiceRevenue = serviceTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

        if (totalServiceRevenue > 0 || serviceTransactions.length > 0) {
            categoryMap.set("Jasa Servis", {
                category: "Jasa Servis",
                qtySold: serviceTransactions.length,
                revenue: totalServiceRevenue,
                cogs: 0,
                profit: totalServiceRevenue,
                margin: 100
            });
        }

        const categories = Array.from(categoryMap.values()).map(c => {
            c.margin = c.revenue > 0 ? (c.profit / c.revenue) * 100 : 0;
            return c;
        });

        categories.sort((a, b) => b.profit - a.profit);

        // Fetch Dead Stock
        let invStoreCond = storeId !== "all" ? eq(inventory.storeId, storeId) : undefined;
        const activeInventory = await db.select()
            .from(inventory)
            .where(and(
                invStoreCond,
                gte(inventory.quantity, 1)
            ));

        const soldItemIds = new Set(items.map(it => it.inventoryId).filter(Boolean));

        const deadStock = activeInventory.filter(item => !soldItemIds.has(item.id))
            .map(item => ({
                id: item.id,
                itemName: item.itemName,
                category: item.category,
                quantity: item.quantity,
                costPrice: item.costPrice,
                sellingPrice: item.sellingPrice,
                capitalLocked: item.quantity * item.costPrice
            }));

        deadStock.sort((a, b) => b.capitalLocked - a.capitalLocked);

        // Overall PnL Metrics
        const totalRevenue = products.reduce((sum, p) => sum + p.revenue, 0) + totalServiceRevenue;
        const totalCogs = products.reduce((sum, p) => sum + p.cogs, 0);
        const totalProfit = totalRevenue - totalCogs;
        const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

        return NextResponse.json({
            summary: {
                totalRevenue,
                totalCogs,
                totalProfit,
                overallMargin
            },
            products,
            categories,
            deadStock
        });

    } catch (error: any) {
        console.error("Failed to generate products report:", error);
        return NextResponse.json({ error: error.message || "Failed to generate products report" }, { status: 500 });
    }
}
