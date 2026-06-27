import { db } from "./src/db/index.js";
import { inventory, transactions, transactionItems, journalEntries } from "./src/db/schema.js";
import crypto from "crypto";

async function main() {
    console.log("Seeding database with extra dummy data (without deleting existing data)...");

    try {
        const today = new Date();
        
        // Insert Inventory Items
        console.log("Inserting new dummy inventory...");
        const laptopId = crypto.randomUUID();
        const sparepartId = crypto.randomUUID();
        
        await db.insert(inventory).values([
            {
                id: laptopId,
                itemName: "MacBook Pro M1 (Dummy)",
                category: "Laptop Bekas",
                quantity: 3, 
                costPrice: 12000000,
                sellingPrice: 14500000,
            },
            {
                id: sparepartId,
                itemName: "RAM DDR4 8GB (Dummy)",
                category: "Sparepart",
                quantity: 10,
                costPrice: 250000,
                sellingPrice: 400000,
            }
        ]);

        // Pembelian Stok
        console.log("Inserting purchases...");
        const purchaseId = crypto.randomUUID();
        const purchaseAmount = (3 * 12000000) + (10 * 250000); 
        await db.insert(transactions).values({
            id: purchaseId,
            transactionType: "Pembelian Stok",
            amount: purchaseAmount,
            description: "Beli stok MacBook M1 & RAM (Dummy)",
            transactionDate: today,
            paymentMethod: "Transfer",
            paymentStatus: "Lunas"
        });
        await db.insert(journalEntries).values([
            { transactionId: purchaseId, accountName: "Persediaan", debit: purchaseAmount, credit: 0, createdAt: today },
            { transactionId: purchaseId, accountName: "Kas", debit: 0, credit: purchaseAmount, createdAt: today }
        ]);

        // Penjualan Tunai
        console.log("Inserting sales...");
        const sale1Id = crypto.randomUUID();
        const sale1Rev = (1 * 14500000) + (2 * 400000); 
        const sale1Cogs = (1 * 12000000) + (2 * 250000); 
        await db.insert(transactions).values({
            id: sale1Id,
            transactionType: "Penjualan",
            amount: sale1Rev,
            description: "Jual 1 MacBook & 2 RAM (Dummy)",
            transactionDate: today,
            customerName: "Rizky (Dummy)",
            paymentMethod: "Cash",
            paymentStatus: "Lunas"
        });
        await db.insert(transactionItems).values([
            { transactionId: sale1Id, inventoryId: laptopId, quantity: 1, unitPrice: 14500000 },
            { transactionId: sale1Id, inventoryId: sparepartId, quantity: 2, unitPrice: 400000 }
        ]);
        await db.insert(journalEntries).values([
            { transactionId: sale1Id, accountName: "Kas", debit: sale1Rev, credit: 0, createdAt: today },
            { transactionId: sale1Id, accountName: "Pendapatan", debit: 0, credit: sale1Rev, createdAt: today },
            { transactionId: sale1Id, accountName: "HPP", debit: sale1Cogs, credit: 0, createdAt: today },
            { transactionId: sale1Id, accountName: "Persediaan", debit: 0, credit: sale1Cogs, createdAt: today }
        ]);

        console.log("Dummy data successfully added!");
        process.exit(0);
    } catch (error) {
        console.error("Error seeding database:", error);
        process.exit(1);
    }
}

main();
