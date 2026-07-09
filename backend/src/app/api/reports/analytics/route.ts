import { NextResponse } from "next/server";
import { db } from "@/db";
import { transactions, activityLogs, journalEntries } from "@/db/schema";
import { and, eq, inArray, sum, desc, count, gte } from "drizzle-orm";
import { requireReportAccess } from "@/lib/auth-guard";
import { withActiveTransactions, withActiveJournalEntries } from "@/db/query-helpers";

export const dynamic = 'force-dynamic';

export async function GET() {
    const authResult = await requireReportAccess();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const storeId = authResult.storeId;

        // 1. Cashier Sales Query (transactions joined with activityLogs)
        let cashierConditions = [
            inArray(transactions.transactionType, ["Penjualan", "Jasa Servis"])
        ];
        if (storeId !== "all") {
            cashierConditions.push(eq(transactions.storeId, storeId));
        }

        const cashierSalesRaw = await db.select({
            userName: activityLogs.userName,
            userId: activityLogs.userId,
            totalSales: sum(transactions.amount).mapWith(Number),
            transactionCount: count(transactions.id)
        })
        .from(transactions)
        .leftJoin(activityLogs, and(
            eq(activityLogs.entityId, transactions.id),
            eq(activityLogs.action, "CREATE_TRANSACTION")
        ))
        .where(withActiveTransactions(and(...cashierConditions)))
        .groupBy(activityLogs.userId, activityLogs.userName)
        .orderBy(desc(sum(transactions.amount)));

        const cashierSales = cashierSalesRaw.map(row => ({
            userName: row.userName || "Pelanggan / Seeded Data",
            userId: row.userId || "system",
            totalSales: row.totalSales || 0,
            transactionCount: row.transactionCount || 0
        }));

        // 2. Top Customers Query
        let customerConditions = [
            inArray(transactions.transactionType, ["Penjualan", "Jasa Servis"])
        ];
        if (storeId !== "all") {
            customerConditions.push(eq(transactions.storeId, storeId));
        }

        const topCustomersRaw = await db.select({
            customerName: transactions.customerName,
            totalSpent: sum(transactions.amount).mapWith(Number),
            transactionCount: count(transactions.id)
        })
        .from(transactions)
        .where(withActiveTransactions(and(...customerConditions)))
        .groupBy(transactions.customerName)
        .orderBy(desc(sum(transactions.amount)))
        .limit(10);

        const topCustomers = topCustomersRaw.map(row => ({
            customerName: row.customerName || "Pelanggan Umum",
            totalSpent: row.totalSpent || 0,
            transactionCount: row.transactionCount || 0
        }));

        // 3. Monthly Financial comparison over the last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        let journalConditions = [
            gte(journalEntries.createdAt, sixMonthsAgo)
        ];
        if (storeId !== "all") {
            journalConditions.push(eq(journalEntries.storeId, storeId));
        }

        const recentJournals = await db.select()
            .from(journalEntries)
            .where(withActiveJournalEntries(and(...journalConditions)))
            .orderBy(journalEntries.createdAt);

        // Group by month in JS/TS
        const MONTH_NAMES = [
            "Januari", "Februari", "Maret", "April", "Mei", "Juni",
            "Juli", "Agustus", "September", "Oktober", "November", "Desember"
        ];

        // Pre-fill the last 6 months to ensure they show up in order
        const monthlyComparisonMap: Record<string, { month: string, key: string, sales: number, cost: number, opex: number, profit: number }> = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthlyComparisonMap[key] = {
                month: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
                key,
                sales: 0,
                cost: 0,
                opex: 0,
                profit: 0
            };
        }

        recentJournals.forEach(entry => {
            const date = new Date(entry.createdAt);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyComparisonMap[key]) return; // Out of range

            const deb = entry.debit || 0;
            const cred = entry.credit || 0;

            if (entry.accountName === "Pendapatan" || entry.accountName === "Pendapatan Servis") {
                monthlyComparisonMap[key].sales += cred - deb;
            } else if (entry.accountName === "HPP") {
                monthlyComparisonMap[key].cost += deb - cred;
            } else if (entry.accountName.includes("Beban")) {
                monthlyComparisonMap[key].opex += deb - cred;
            }
        });

        // Calculate profit for each month
        const monthlyComparison = Object.values(monthlyComparisonMap).map(m => {
            return {
                ...m,
                profit: m.sales - m.cost - m.opex
            };
        });

        return NextResponse.json({
            cashierSales,
            topCustomers,
            monthlyComparison
        });

    } catch (error: any) {
        console.error("Failed to generate analytics report:", error);
        return NextResponse.json({ error: error.message || "Failed to generate analytics report" }, { status: 500 });
    }
}
