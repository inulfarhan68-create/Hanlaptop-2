import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventory, transactions, serviceOrders, stores } from "@/db/schema";
import { and, eq, inArray, lte } from "drizzle-orm";
import { requireAuth, storeScope } from "@/lib/auth-guard";
import { withActiveTransactions } from "@/db/query-helpers";

export const dynamic = 'force-dynamic';

export async function GET() {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const storeId = authResult.storeId;
        const isMultiStore = storeId === "all";

        // Fetch stores to map store ID to store name (helpful for "All Branches" view)
        const allStores = await db.select().from(stores);
        const storeMap = new Map(allStores.map(s => [s.id, s.name]));

        const formatCurrency = (val: number) => {
            return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);
        };

        const alerts: Array<{
            id: string;
            type: "warning" | "danger" | "info";
            title: string;
            message: string;
            link: string;
            createdAt: Date;
        }> = [];

        // 🔒 Tenant-safe: storeScope handles platform_admin vs tenant boundary
        const invScope = storeScope(authResult, inventory.storeId);
        const txScope = storeScope(authResult, transactions.storeId);
        const svcScope = storeScope(authResult, serviceOrders.storeId);

        // 1. Low Stock Alerts (quantity <= 2)
        let invConditions = [lte(inventory.quantity, 2)];
        if (invScope) invConditions.push(invScope);

        const lowStockItems = await db.select()
            .from(inventory)
            .where(and(...invConditions));

        lowStockItems.forEach(item => {
            const storePrefix = isMultiStore ? `[${storeMap.get(item.storeId) || "Cabang"}] ` : "";
            alerts.push({
                id: `low-stock-${item.id}`,
                type: "warning",
                title: "Stok Menipis",
                message: `${storePrefix}${item.itemName} tersisa ${item.quantity} unit.`,
                link: "/inventory",
                createdAt: item.createdAt || new Date()
            });
        });

        // 2. Overdue Receivables Alerts
        let txConditions = [
            eq(transactions.paymentStatus, "Belum Lunas")
        ];
        if (txScope) txConditions.push(txScope);

        const unpaidTransactions = await db.select()
            .from(transactions)
            .where(withActiveTransactions(and(...txConditions)));

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        unpaidTransactions.forEach(tx => {
            if (!tx.dueDate) return;
            const due = new Date(tx.dueDate);
            due.setHours(0, 0, 0, 0);

            if (due <= today) {
                const isOverdue = due < today;
                const storePrefix = isMultiStore ? `[${storeMap.get(tx.storeId) || "Cabang"}] ` : "";
                const sisa = (tx.amount || 0) - (tx.dpAmount || 0);
                alerts.push({
                    id: `overdue-piutang-${tx.id}`,
                    type: "danger",
                    title: isOverdue ? "Piutang Menunggak" : "Piutang Jatuh Tempo",
                    message: `${storePrefix}Nota ${tx.invoiceNumber} (${tx.customerName || "Umum"}) senilai ${formatCurrency(sisa)} ${isOverdue ? "telah melewati tanggal jatuh tempo" : "jatuh tempo hari ini"}.`,
                    link: "/piutang",
                    createdAt: tx.dueDate
                });
            }
        });

        // 2.5 Overdue Payables (Hutang) Alerts
        let payConditions = [
            eq(transactions.transactionType, "Pembelian Stok"),
            eq(transactions.paymentStatus, "Belum Lunas")
        ];
        if (txScope) payConditions.push(txScope);

        const unpaidPurchases = await db.select()
            .from(transactions)
            .where(withActiveTransactions(and(...payConditions)));

        unpaidPurchases.forEach(tx => {
            if (!tx.dueDate) return;
            const due = new Date(tx.dueDate);
            due.setHours(0, 0, 0, 0);

            if (due <= today) {
                const isOverdue = due < today;
                const storePrefix = isMultiStore ? `[${storeMap.get(tx.storeId) || "Cabang"}] ` : "";
                const sisa = (tx.amount || 0) - (tx.dpAmount || 0);
                const supplierName = tx.description ? tx.description.replace("Supplier: ", "") : "Supplier";
                alerts.push({
                    id: `overdue-hutang-${tx.id}`,
                    type: "danger",
                    title: isOverdue ? "Hutang Menunggak" : "Hutang Jatuh Tempo",
                    message: `${storePrefix}Hutang ke ${supplierName} senilai ${formatCurrency(sisa)} ${isOverdue ? "telah melewati jatuh tempo" : "jatuh tempo hari ini"}.`,
                    link: "/hutang",
                    createdAt: tx.dueDate
                });
            }
        });

        // 3. Stalled Services Alerts (stuck in active status for > 3 days)
        let svcConditions = [
            inArray(serviceOrders.status, ["Diterima", "Dikerjakan", "Menunggu Part"])
        ];
        if (svcScope) svcConditions.push(svcScope);

        const activeServices = await db.select()
            .from(serviceOrders)
            .where(and(...svcConditions));

        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        activeServices.forEach(order => {
            const receivedDate = new Date(order.receivedDate);
            if (receivedDate < threeDaysAgo) {
                const storePrefix = isMultiStore ? `[${storeMap.get(order.storeId) || "Cabang"}] ` : "";
                const diffTime = Math.abs(new Date().getTime() - receivedDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                alerts.push({
                    id: `stalled-service-${order.id}`,
                    type: "info",
                    title: "Servis Menggantung",
                    message: `${storePrefix}Unit ${order.deviceName} (${order.customerName}) sudah ${diffDays} hari berstatus "${order.status}".`,
                    link: "/services",
                    createdAt: order.receivedDate
                });
            }
        });

        // Sort alerts by type importance (danger, then warning, then info) and date descending
        const typePriority = { danger: 0, warning: 1, info: 2 };
        alerts.sort((a, b) => {
            if (typePriority[a.type] !== typePriority[b.type]) {
                return typePriority[a.type] - typePriority[b.type];
            }
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        return NextResponse.json(alerts);

    } catch (error: any) {
        console.error("Failed to fetch alerts:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch alerts" }, { status: 500 });
    }
}
