import { db } from "@/db";
import { customers, inventory, cashierShifts, suppliers, serviceOrders, technicians } from "@/db/schema";
import { TransactionService } from "./TransactionService";
import { transactionSchema } from "@/lib/validators";
import { nanoid } from "nanoid";

/**
 * Sample data for the read-only demo tenant. Sales go through TransactionService
 * (not raw inserts) so they produce real double-entry journals + stock deductions —
 * otherwise the dashboard/reports (which read journal_entries) would look empty.
 *
 * Robustness: each sale is wrapped in try/catch so one failing sale can never abort
 * the rest of the seed (service orders, technicians). There is no outer transaction on
 * purpose — TransactionService.createTransaction opens its own, and nesting would create
 * fragile savepoints.
 *
 * Enum values follow the app's schema: transactionType "Penjualan", paymentStatus
 * "Lunas"/"Belum Lunas", inventory.condition "NEW"/"USED_A", serviceOrders.status
 * "Diterima"/"Dikerjakan"/"Menunggu Part"/"Selesai"/"Diambil".
 */
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export async function seedDemoData(storeId: string, userId: string) {
    // 1. Customers
    const custRows = await db.insert(customers).values([
        { id: nanoid(), storeId, name: "Budi Santoso", phone: "081234567890", address: "Jl. Merdeka No 1" },
        { id: nanoid(), storeId, name: "Siti Aminah", phone: "089876543210", address: "Jl. Sudirman No 2" },
        { id: nanoid(), storeId, name: "Agus Pratama", phone: "085612345678", address: "Jl. Thamrin No 3" },
    ]).returning({ id: customers.id });

    // 2. Suppliers
    await db.insert(suppliers).values([
        { id: nanoid(), storeId, name: "Distributor Laptop Jakarta", phone: "021-123456", email: "sales@distrolaptop.com" },
        { id: nanoid(), storeId, name: "Grosir Sparepart", phone: "021-654321", email: "info@grosirpart.com" },
    ]);

    // 3. Inventory (condition uses the app's uppercase enum)
    const invRows = await db.insert(inventory).values([
        { id: nanoid(), storeId, barcode: "LT-ASUS-001", itemName: "Asus ROG Zephyrus G14", category: "Gaming", quantity: 5, sellingPrice: 20000000, costPrice: 18000000, condition: "NEW" },
        { id: nanoid(), storeId, barcode: "LT-LENOVO-001", itemName: "Lenovo ThinkPad T14", category: "Business", quantity: 3, sellingPrice: 15000000, costPrice: 13500000, condition: "USED_A" },
        { id: nanoid(), storeId, barcode: "SP-RAM-001", itemName: "RAM DDR4 8GB Kingston", category: "RAM", quantity: 20, sellingPrice: 400000, costPrice: 300000, condition: "NEW" },
        { id: nanoid(), storeId, barcode: "SP-SSD-001", itemName: "SSD NVMe 512GB Samsung", category: "Storage", quantity: 15, sellingPrice: 800000, costPrice: 650000, condition: "NEW" },
        { id: nanoid(), storeId, barcode: "ACC-MSE-001", itemName: "Logitech Wireless Mouse", category: "Peripherals", quantity: 30, sellingPrice: 150000, costPrice: 100000, condition: "NEW" },
    ]).returning({ id: inventory.id, sellingPrice: inventory.sellingPrice });

    // 4. Technicians (for the service Kanban's per-technician view + commissions)
    const techRows = await db.insert(technicians).values([
        { id: nanoid(), storeId, name: "Rudi Hartono", commissionType: "percentage", commissionValue: 10 },
        { id: nanoid(), storeId, name: "Sari Wijaya", commissionType: "percentage", commissionValue: 12 },
        { id: nanoid(), storeId, name: "Andi Kurniawan", commissionType: "percentage", commissionValue: 10 },
    ]).returning({ id: technicians.id, name: technicians.name });

    // 5. An open cashier shift so the demo shows an active session
    const [shift] = await db.insert(cashierShifts).values({
        id: nanoid(), storeId, userId, userName: "Demo User",
        openedAt: new Date(Date.now() - 4 * HOUR),
        openingBalance: 500000,
        status: "open",
    }).returning({ id: cashierShifts.id });

    // 6. Real sales via TransactionService → invoice number + journals + stock deduction.
    // Each is best-effort: a failure is logged but never blocks the rest of the seed.
    const sales = [
        // Paid cash sale (Asus + RAM).
        {
            transactionType: "Penjualan", paymentMethod: "Cash", paymentStatus: "Lunas",
            amount: invRows[0].sellingPrice + invRows[2].sellingPrice, customerId: custRows[0].id,
            items: [
                { inventoryId: invRows[0].id, quantity: 1, unitPrice: invRows[0].sellingPrice },
                { inventoryId: invRows[2].id, quantity: 1, unitPrice: invRows[2].sellingPrice },
            ],
        },
        // Paid transfer sale (Lenovo + Mouse).
        {
            transactionType: "Penjualan", paymentMethod: "Transfer Bank", paymentStatus: "Lunas",
            amount: invRows[1].sellingPrice + invRows[4].sellingPrice, customerId: custRows[1].id,
            items: [
                { inventoryId: invRows[1].id, quantity: 1, unitPrice: invRows[1].sellingPrice },
                { inventoryId: invRows[4].id, quantity: 1, unitPrice: invRows[4].sellingPrice },
            ],
        },
        // DP / unpaid sale (SSD) → leaves a Piutang Usaha balance so receivables aren't empty.
        {
            transactionType: "Penjualan", paymentMethod: "Cash", paymentStatus: "Belum Lunas", dpAmount: 300000,
            amount: invRows[3].sellingPrice, customerId: custRows[2].id,
            items: [{ inventoryId: invRows[3].id, quantity: 1, unitPrice: invRows[3].sellingPrice }],
        },
    ];
    for (const sale of sales) {
        try {
            await TransactionService.createTransaction({
                storeId, userId, userName: "Demo User", activeShiftId: shift.id,
                data: transactionSchema.parse(sale),
            });
        } catch (e) {
            console.error("Demo seed: a sample sale failed (continuing):", e);
        }
    }

    // 7. Service orders — a spread across every column, with technicians assigned and
    //    varied received dates so the SLA/overdue badges and per-technician filter are
    //    all exercised in the Kanban.
    await db.insert(serviceOrders).values([
        { id: nanoid(), storeId, customerId: custRows[0].id, customerName: "Budi Santoso", customerPhone: "081234567890", deviceName: "Acer Nitro 5", issue: "Mati total, indikator charger tidak nyala", status: "Diterima", estimatedCost: 350000, technicianId: techRows[0].id, technicianName: techRows[0].name, receivedDate: new Date(Date.now() - 3 * HOUR) },
        { id: nanoid(), storeId, customerId: custRows[1].id, customerName: "Siti Aminah", customerPhone: "089876543210", deviceName: "HP Pavilion 14", issue: "Overheat, kipas berisik, perlu repaste", status: "Dikerjakan", estimatedCost: 250000, technicianId: techRows[1].id, technicianName: techRows[1].name, receivedDate: new Date(Date.now() - 28 * HOUR) },
        { id: nanoid(), storeId, customerId: custRows[2].id, customerName: "Agus Pratama", customerPhone: "085612345678", deviceName: "MacBook Air M1", issue: "Baterai kembung, ganti baterai", status: "Dikerjakan", estimatedCost: 1500000, technicianId: techRows[2].id, technicianName: techRows[2].name, receivedDate: new Date(Date.now() - 4 * DAY) },
        { id: nanoid(), storeId, customerId: custRows[0].id, customerName: "Budi Santoso", customerPhone: "081234567890", deviceName: "Lenovo Legion 5", issue: "Keyboard beberapa tombol mati, tunggu part", status: "Menunggu Part", estimatedCost: 400000, technicianId: techRows[0].id, technicianName: techRows[0].name, receivedDate: new Date(Date.now() - 5 * DAY) },
        { id: nanoid(), storeId, customerId: custRows[1].id, customerName: "Siti Aminah", customerPhone: "089876543210", deviceName: "Dell XPS 13", issue: "Install ulang Windows + upgrade SSD", status: "Selesai", estimatedCost: 500000, finalCost: 650000, technicianId: techRows[1].id, technicianName: techRows[1].name, receivedDate: new Date(Date.now() - 1 * DAY), completedDate: new Date(Date.now() - 2 * HOUR) },
        { id: nanoid(), storeId, customerId: custRows[2].id, customerName: "Agus Pratama", customerPhone: "085612345678", deviceName: "Asus VivoBook 14", issue: "Cleaning + thermal paste", status: "Diambil", estimatedCost: 150000, finalCost: 150000, technicianId: techRows[2].id, technicianName: techRows[2].name, receivedDate: new Date(Date.now() - 3 * DAY), completedDate: new Date(Date.now() - 1 * DAY) },
    ]);
}
