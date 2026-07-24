import { db } from "@/db";
import { customers, inventory, cashierShifts, suppliers, serviceOrders } from "@/db/schema";
import { TransactionService } from "./TransactionService";
import { transactionSchema } from "@/lib/validators";
import { nanoid } from "nanoid";

/**
 * Sample data for the read-only demo tenant. Sales go through TransactionService
 * (not raw inserts) so they produce real double-entry journals + stock deductions —
 * otherwise the dashboard/reports (which read journal_entries) would look empty.
 * Enum values follow the app's schema: transactionType "Penjualan", paymentStatus
 * "Lunas"/"Belum Lunas", inventory.condition "NEW"/"USED_A", serviceOrders.status
 * "Dikerjakan"/"Selesai".
 *
 * Not wrapped in an outer transaction on purpose: TransactionService.createTransaction
 * opens its own transaction, and nesting would create fragile savepoints. Seed data is
 * provisioned once for a fresh demo org, so per-step commits are fine.
 */
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

    // 4. An open cashier shift so the demo shows an active session
    const [shift] = await db.insert(cashierShifts).values({
        id: nanoid(), storeId, userId, userName: "Demo User",
        openedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        openingBalance: 500000,
        status: "open",
    }).returning({ id: cashierShifts.id });

    // 5. Real sales via TransactionService → invoice number + journals + stock deduction.
    // Paid cash sale (Asus + RAM).
    await TransactionService.createTransaction({
        storeId, userId, userName: "Demo User", activeShiftId: shift.id,
        data: transactionSchema.parse({
            transactionType: "Penjualan",
            amount: invRows[0].sellingPrice + invRows[2].sellingPrice,
            paymentMethod: "Cash",
            paymentStatus: "Lunas",
            customerId: custRows[0].id,
            items: [
                { inventoryId: invRows[0].id, quantity: 1, unitPrice: invRows[0].sellingPrice },
                { inventoryId: invRows[2].id, quantity: 1, unitPrice: invRows[2].sellingPrice },
            ],
        }),
    });

    // Paid transfer sale (Lenovo + Mouse).
    await TransactionService.createTransaction({
        storeId, userId, userName: "Demo User", activeShiftId: shift.id,
        data: transactionSchema.parse({
            transactionType: "Penjualan",
            amount: invRows[1].sellingPrice + invRows[4].sellingPrice,
            paymentMethod: "Transfer Bank",
            paymentStatus: "Lunas",
            customerId: custRows[1].id,
            items: [
                { inventoryId: invRows[1].id, quantity: 1, unitPrice: invRows[1].sellingPrice },
                { inventoryId: invRows[4].id, quantity: 1, unitPrice: invRows[4].sellingPrice },
            ],
        }),
    });

    // DP / unpaid sale (SSD) → leaves a Piutang Usaha balance so receivables aren't empty.
    await TransactionService.createTransaction({
        storeId, userId, userName: "Demo User", activeShiftId: shift.id,
        data: transactionSchema.parse({
            transactionType: "Penjualan",
            amount: invRows[3].sellingPrice,
            paymentMethod: "Cash",
            paymentStatus: "Belum Lunas",
            dpAmount: 300000,
            customerId: custRows[2].id,
            items: [
                { inventoryId: invRows[3].id, quantity: 1, unitPrice: invRows[3].sellingPrice },
            ],
        }),
    });

    // 6. Service orders (status uses the app's Indonesian enum)
    await db.insert(serviceOrders).values([
        { id: nanoid(), storeId, customerId: custRows[2].id, customerName: "Agus Pratama", deviceName: "Acer Nitro 5", issue: "Mati total, indikator charger tidak nyala", status: "Dikerjakan", estimatedCost: 350000, receivedDate: new Date() },
        { id: nanoid(), storeId, customerId: custRows[0].id, customerName: "Budi Santoso", deviceName: "MacBook Air M1", issue: "Ganti baterai, cepat habis", status: "Selesai", estimatedCost: 1500000, finalCost: 1500000, receivedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), completedDate: new Date() },
    ]);
}
