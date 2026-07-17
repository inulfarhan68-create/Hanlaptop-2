import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventory } from "@/db/schema";
import { count, eq, sql, and, isNull, gte, lt } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = 'force-dynamic';

/**
 * Dashboard KPI API - Uses SQL Aggregation instead of fetching all data
 * This endpoint calculates inventory KPIs efficiently without loading all inventory items
 */
export async function GET(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const storeId = authResult.storeId;

        // Build store condition
        const storeCondition = storeId !== "all"
            ? eq(inventory.storeId, storeId)
            : undefined;

        // Active items condition (not deleted)
        const activeCondition = isNull(inventory.deletedAt);

        // Combined condition
        const whereCondition = storeCondition && activeCondition
            ? and(storeCondition, activeCondition)
            : activeCondition;

        // Get aggregate stats using SQL - MUCH more efficient than fetching all rows
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        // Total counts by category - single query with conditional aggregation
        const categoryStats = await db
            .select({
                category: inventory.category,
                count: count(),
                totalQty: sql<number>`SUM(CAST(${inventory.quantity} AS INTEGER))`,
                totalValue: sql<number>`SUM(CAST(${inventory.quantity} AS INTEGER) * CAST(COALESCE(${inventory.costPrice}, 0) AS REAL))`
            })
            .from(inventory)
            .where(whereCondition)
            .groupBy(inventory.category);

        // Low stock items (quantity <= minStock)
        const lowStockStats = await db
            .select({
                count: count()
            })
            .from(inventory)
            .where(and(
                whereCondition,
                sql`CAST(${inventory.quantity} AS INTEGER) <= CAST(COALESCE(${inventory.minStock}, 0) AS INTEGER)`
            ));

        // Slow moving items (30-60 days old with stock)
        const slowMovingStats = await db
            .select({
                count: count()
            })
            .from(inventory)
            .where(and(
                whereCondition,
                sql`CAST(${inventory.quantity} AS INTEGER) > 0`,
                gte(inventory.createdAt, sixtyDaysAgo),
                lt(inventory.createdAt, thirtyDaysAgo)
            ));

        // Dead stock items (>60 days old with stock)
        const deadStockStats = await db
            .select({
                count: count()
            })
            .from(inventory)
            .where(and(
                whereCondition,
                sql`CAST(${inventory.quantity} AS INTEGER) > 0`,
                lt(inventory.createdAt, sixtyDaysAgo)
            ));

        // Items in QC/Inspection
        const qcStats = await db
            .select({
                count: count()
            })
            .from(inventory)
            .where(and(
                whereCondition,
                eq(inventory.condition, 'IN_INSPECTION')
            ));

        // Calculate totals from category stats
        let laptops = { qty: 0, value: 0 };
        let aksesoris = { qty: 0, value: 0 };
        let spareParts = { qty: 0, value: 0 };

        for (const stat of categoryStats) {
            const qty = Number(stat.totalQty) || 0;
            const value = Number(stat.totalValue) || 0;

            if (stat.category === "Laptop Bekas") {
                laptops = { qty, value };
            } else if (stat.category === "Aksesoris") {
                aksesoris = { qty, value };
            } else if (stat.category !== "Jasa Servis") {
                spareParts.qty += qty;
                spareParts.value += value;
            }
        }

        return NextResponse.json({
            // Category breakdown
            laptop: {
                qty: laptops.qty,
                value: laptops.value
            },
            sparepart: {
                qty: spareParts.qty,
                value: spareParts.value
            },
            aksesoris: {
                qty: aksesoris.qty,
                value: aksesoris.value
            },
            // Totals
            total: {
                qty: laptops.qty + spareParts.qty + aksesoris.qty,
                value: laptops.value + spareParts.value + aksesoris.value,
                items: categoryStats.reduce((sum, s) => sum + Number(s.count), 0)
            },
            // Alert counts
            lowStockCount: Number(lowStockStats[0]?.count) || 0,
            slowMovingCount: Number(slowMovingStats[0]?.count) || 0,
            deadStockCount: Number(deadStockStats[0]?.count) || 0,
            pendingQcCount: Number(qcStats[0]?.count) || 0,
            // Raw category data for detailed view
            byCategory: categoryStats.map(s => ({
                category: s.category,
                count: Number(s.count),
                quantity: Number(s.totalQty) || 0,
                value: Number(s.totalValue) || 0
            }))
        });
    } catch (error) {
        console.error("Failed to fetch inventory KPI:", error);
        return NextResponse.json({ error: "Failed to fetch inventory KPI" }, { status: 500 });
    }
}
