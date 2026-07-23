import { db } from "@/db";
import { 
    customers, inventory, cashierShifts, transactions, transactionItems,
    suppliers, serviceOrders
} from "@/db/schema";
import { nanoid } from "nanoid";

export async function seedDemoData(storeId: string, userId: string) {
    await db.transaction(async (tx) => {
        // 1. Create Customers
        const custRows = await tx.insert(customers).values([
            { id: nanoid(), storeId, name: "Budi Santoso", phone: "081234567890", address: "Jl. Merdeka No 1" },
            { id: nanoid(), storeId, name: "Siti Aminah", phone: "089876543210", address: "Jl. Sudirman No 2" },
            { id: nanoid(), storeId, name: "Agus Pratama", phone: "085612345678", address: "Jl. Thamrin No 3" }
        ]).returning({ id: customers.id });

        // 2. Create Suppliers
        await tx.insert(suppliers).values([
            { id: nanoid(), storeId, name: "Distributor Laptop Jakarta", phone: "021-123456", email: "sales@distrolaptop.com" },
            { id: nanoid(), storeId, name: "Grosir Sparepart", phone: "021-654321", email: "info@grosirpart.com" }
        ]);

        // 3. Create Inventory
        const invRows = await tx.insert(inventory).values([
            { id: nanoid(), storeId, barcode: "LT-ASUS-001", itemName: "Asus ROG Zephyrus G14", category: "Gaming", quantity: 5, sellingPrice: 20000000, costPrice: 18000000, condition: "new" },
            { id: nanoid(), storeId, barcode: "LT-LENOVO-001", itemName: "Lenovo ThinkPad T14", category: "Business", quantity: 3, sellingPrice: 15000000, costPrice: 13500000, condition: "second" },
            { id: nanoid(), storeId, barcode: "SP-RAM-001", itemName: "RAM DDR4 8GB Kingston", category: "RAM", quantity: 20, sellingPrice: 400000, costPrice: 300000, condition: "new" },
            { id: nanoid(), storeId, barcode: "SP-SSD-001", itemName: "SSD NVMe 512GB Samsung", category: "Storage", quantity: 15, sellingPrice: 800000, costPrice: 650000, condition: "new" },
            { id: nanoid(), storeId, barcode: "ACC-MSE-001", itemName: "Logitech Wireless Mouse", category: "Peripherals", quantity: 30, sellingPrice: 150000, costPrice: 100000, condition: "new" }
        ]).returning({ id: inventory.id, sellingPrice: inventory.sellingPrice });

        // 4. Create a Cashier Shift
        const [shift] = await tx.insert(cashierShifts).values({
            id: nanoid(), storeId, userId, userName: "Demo User",
            openedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
            openingBalance: 500000,
            status: "open"
        }).returning({ id: cashierShifts.id });

        // 5. Create Transactions
        const t1Id = nanoid();
        await tx.insert(transactions).values({
            id: t1Id, storeId, userId,
            transactionType: "sales", paymentStatus: "paid", paymentMethod: "cash",
            amount: 20400000, 
            customerId: custRows[0].id, shiftId: shift.id,
            transactionDate: new Date(Date.now() - 3 * 60 * 60 * 1000)
        });
        await tx.insert(transactionItems).values([
            { id: nanoid(), transactionId: t1Id, inventoryId: invRows[0].id, quantity: 1, unitPrice: invRows[0].sellingPrice },
            { id: nanoid(), transactionId: t1Id, inventoryId: invRows[2].id, quantity: 1, unitPrice: invRows[2].sellingPrice }
        ]);

        const t2Id = nanoid();
        await tx.insert(transactions).values({
            id: t2Id, storeId, userId,
            transactionType: "sales", paymentStatus: "paid", paymentMethod: "transfer",
            amount: 15150000, 
            customerId: custRows[1].id, shiftId: shift.id,
            transactionDate: new Date(Date.now() - 1 * 60 * 60 * 1000)
        });
        await tx.insert(transactionItems).values([
            { id: nanoid(), transactionId: t2Id, inventoryId: invRows[1].id, quantity: 1, unitPrice: invRows[1].sellingPrice },
            { id: nanoid(), transactionId: t2Id, inventoryId: invRows[4].id, quantity: 1, unitPrice: invRows[4].sellingPrice }
        ]);

        // 6. Create Service Orders
        await tx.insert(serviceOrders).values([
            { id: nanoid(), storeId, customerId: custRows[2].id, customerName: "Agus Pratama", deviceName: "Acer Nitro 5", issue: "Mati total, indikator charger tidak nyala", status: "diagnosing", estimatedCost: 0, receivedDate: new Date() },
            { id: nanoid(), storeId, customerId: custRows[0].id, customerName: "Budi Santoso", deviceName: "MacBook Air M1", issue: "Ganti baterai, cepat habis", status: "completed", estimatedCost: 1500000, receivedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }
        ]);
    });
}
