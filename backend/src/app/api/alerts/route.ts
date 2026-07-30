import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventory, transactions, serviceOrders, stores, devicePassports } from "@/db/schema";
import { and, eq, inArray, lte, gte, isNotNull } from "drizzle-orm";
import { requireAuth, storeScope } from "@/lib/auth-guard";
import { withActiveTransactions } from "@/db/query-helpers";

export const dynamic = 'force-dynamic';

export async function GET() {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const storeId = authResult.storeId;
        const isMultiStore = storeId === "all";

        const formatCurrency = (val: number) => {
            return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);
        };

        const alerts: Array<{
            id: string;
            type: "warning" | "danger" | "info";
            category: "stok" | "piutang" | "hutang" | "servis" | "garansi";
            title: string;
            message: string;
            link: string;
            createdAt: Date;
        }> = [];

        // 🔒 Tenant-safe: storeScope handles platform_admin vs tenant boundary
        const invScope = storeScope(authResult, inventory.storeId);
        const txScope = storeScope(authResult, transactions.storeId);
        const svcScope = storeScope(authResult, serviceOrders.storeId);
        const passScope = storeScope(authResult, devicePassports.storeId);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const in30Days = new Date();
        in30Days.setDate(in30Days.getDate() + 30);
        in30Days.setHours(23, 59, 59, 999);

        // Low stock (quantity <= 2)
        const invConditions = [lte(inventory.quantity, 2)];
        if (invScope) invConditions.push(invScope);

        // Everything unpaid — receivables and payables both come out of this set.
        const txConditions = [eq(transactions.paymentStatus, "Belum Lunas")];
        if (txScope) txConditions.push(txScope);

        // Services still open
        const svcConditions = [
            inArray(serviceOrders.status, ["Diterima", "Dikerjakan", "Menunggu Part"])
        ];
        if (svcScope) svcConditions.push(svcScope);

        // SOLD units whose warranty ends within 30 days
        const warrantyConditions = [
            eq(devicePassports.status, "SOLD"),
            isNotNull(devicePassports.warrantyEndDate),
            gte(devicePassports.warrantyEndDate, today),
            lte(devicePassports.warrantyEndDate, in30Days),
        ];
        if (passScope) warrantyConditions.push(passScope);

        // Store names for the "All Branches" prefix — scoped to the caller's stores
        // (platform_admin is unrestricted) and to id+name only.
        const storeScopeIds = authResult.accessibleStoreIds;

        // This endpoint is polled every 30s by the sidebar bell and the dashboard
        // action panel, and each slice below reads a different table — so they all
        // resolve in one batch instead of six sequential round-trips.
        const [allStores, lowStockItems, unpaidTransactions, activeServices, expiringWarranties] = await Promise.all([
            storeScopeIds !== null && storeScopeIds.length === 0
                ? Promise.resolve([])
                : db.select({ id: stores.id, name: stores.name })
                    .from(stores)
                    .where(storeScopeIds === null ? undefined : inArray(stores.id, storeScopeIds)),

            db.select().from(inventory).where(and(...invConditions)),

            db.select().from(transactions).where(withActiveTransactions(and(...txConditions))),

            db.select().from(serviceOrders).where(and(...svcConditions)),

            db.select({
                id: devicePassports.id,
                storeId: devicePassports.storeId,
                serialNumber: devicePassports.serialNumber,
                warrantyEndDate: devicePassports.warrantyEndDate,
                itemName: inventory.itemName,
            })
            .from(devicePassports)
            .leftJoin(inventory, eq(devicePassports.inventoryId, inventory.id))
            .where(and(...warrantyConditions)),
        ]);

        const storeMap = new Map(allStores.map(s => [s.id, s.name]));

        // Payables are the stock-purchase subset of the unpaid rows already fetched
        // above (same predicate plus transactionType), so no second query is needed.
        const unpaidPurchases = unpaidTransactions.filter(tx => tx.transactionType === "Pembelian Stok");

        // 1. Low Stock Alerts
        lowStockItems.forEach(item => {
            const storePrefix = isMultiStore ? `[${storeMap.get(item.storeId) || "Cabang"}] ` : "";
            alerts.push({
                id: `low-stock-${item.id}`,
                type: "warning",
                category: "stok",
                title: "Stok Menipis",
                message: `${storePrefix}${item.itemName} tersisa ${item.quantity} unit.`,
                link: "/inventory",
                createdAt: item.createdAt || new Date()
            });
        });

        // 2. Overdue Receivables Alerts
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
                    category: "piutang",
                    title: isOverdue ? "Piutang Menunggak" : "Piutang Jatuh Tempo",
                    message: `${storePrefix}Nota ${tx.invoiceNumber} (${tx.customerName || "Umum"}) senilai ${formatCurrency(sisa)} ${isOverdue ? "telah melewati tanggal jatuh tempo" : "jatuh tempo hari ini"}.`,
                    link: "/piutang",
                    createdAt: tx.dueDate
                });
            }
        });

        // 2.5 Overdue Payables (Hutang) Alerts
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
                    category: "hutang",
                    title: isOverdue ? "Hutang Menunggak" : "Hutang Jatuh Tempo",
                    message: `${storePrefix}Hutang ke ${supplierName} senilai ${formatCurrency(sisa)} ${isOverdue ? "telah melewati jatuh tempo" : "jatuh tempo hari ini"}.`,
                    link: "/hutang",
                    createdAt: tx.dueDate
                });
            }
        });

        // 3. Stalled Services Alerts (stuck in active status for > 3 days)
        activeServices.forEach(order => {
            const receivedDate = new Date(order.receivedDate);
            if (receivedDate < threeDaysAgo) {
                const storePrefix = isMultiStore ? `[${storeMap.get(order.storeId) || "Cabang"}] ` : "";
                const diffTime = Math.abs(new Date().getTime() - receivedDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                alerts.push({
                    id: `stalled-service-${order.id}`,
                    type: "info",
                    category: "servis",
                    title: "Servis Menggantung",
                    message: `${storePrefix}Unit ${order.deviceName} (${order.customerName}) sudah ${diffDays} hari berstatus "${order.status}".`,
                    link: "/services",
                    createdAt: order.receivedDate
                });
            }
        });

        // 4. Warranty Expiring Soon
        expiringWarranties.forEach((p) => {
            if (!p.warrantyEndDate) return;
            const end = new Date(p.warrantyEndDate);
            const diffDays = Math.max(0, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
            const storePrefix = isMultiStore ? `[${storeMap.get(p.storeId) || "Cabang"}] ` : "";
            const label = p.itemName || "Unit";
            alerts.push({
                id: `warranty-expiring-${p.id}`,
                type: "info",
                category: "garansi",
                title: "Garansi Segera Berakhir",
                message: `${storePrefix}Garansi ${label} (SN ${p.serialNumber}) berakhir dalam ${diffDays} hari.`,
                link: "/passports",
                createdAt: p.warrantyEndDate,
            });
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
