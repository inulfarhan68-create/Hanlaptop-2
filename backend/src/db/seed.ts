import { db } from "./index";
import { inventory, transactions, transactionItems, journalEntries } from "./schema";
import crypto from "crypto";

async function main() {
    console.log("Seeding database with comprehensive dummy data...");

    try {
        // 1. Clear existing data
        console.log("Clearing existing data...");
        await db.delete(journalEntries);
        await db.delete(transactionItems);
        await db.delete(transactions);
        await db.delete(inventory);

        // 2. Initial Capital (Modal Awal)
        console.log("Inserting initial capital...");
        const modalId = crypto.randomUUID();
        await db.insert(transactions).values({
            id: modalId,
            transactionType: "Modal Baru",
            amount: 100000000,
            description: "Setoran Modal Awal Pemilik",
            transactionDate: new Date('2026-01-01'),
            paymentMethod: "Transfer",
            paymentStatus: "Lunas"
        });
        await db.insert(journalEntries).values([
            { transactionId: modalId, accountName: "Kas", debit: 100000000, credit: 0, createdAt: new Date('2026-01-01') },
            { transactionId: modalId, accountName: "Modal Pemilik", debit: 0, credit: 100000000, createdAt: new Date('2026-01-01') }
        ]);

        // 3. Insert Inventory Items (Final Quantities after seed)
        console.log("Inserting inventory...");
        const laptopId = crypto.randomUUID();
        const sparepartId = crypto.randomUUID();
        const serviceItemId = crypto.randomUUID();
        
        await db.insert(inventory).values([
            {
                id: laptopId,
                itemName: "ThinkPad T480 Core i5",
                category: "Laptop Bekas",
                quantity: 2, // 5 bought - 2 sold - 1 sold (tempo) = 2
                costPrice: 3500000,
                sellingPrice: 4500000,
            },
            {
                id: sparepartId,
                itemName: "SSD Kingston 500GB",
                category: "Sparepart",
                quantity: 15, // 20 bought - 5 sold = 15
                costPrice: 400000,
                sellingPrice: 550000,
            },
            {
                id: serviceItemId,
                itemName: "Jasa Install Ulang OS",
                category: "Jasa Servis",
                quantity: 999, // unlimited essentially
                costPrice: 0,
                sellingPrice: 150000,
            }
        ]);

        // 4. Pembelian Stok (Purchasing Inventory)
        console.log("Inserting purchases...");
        const purchaseId = crypto.randomUUID();
        // bought 5 laptops, 20 SSDs
        const purchaseAmount = (5 * 3500000) + (20 * 400000); 
        await db.insert(transactions).values({
            id: purchaseId,
            transactionType: "Pembelian Stok",
            amount: purchaseAmount,
            description: "Beli stok awal (5 ThinkPad, 20 SSD)",
            transactionDate: new Date('2026-01-02'),
            paymentMethod: "Transfer",
            paymentStatus: "Lunas"
        });
        await db.insert(journalEntries).values([
            { transactionId: purchaseId, accountName: "Persediaan", debit: purchaseAmount, credit: 0, createdAt: new Date('2026-01-02') },
            { transactionId: purchaseId, accountName: "Kas", debit: 0, credit: purchaseAmount, createdAt: new Date('2026-01-02') }
        ]);

        // 5. Penjualan Tunai (Cash Sale)
        console.log("Inserting sales...");
        const sale1Id = crypto.randomUUID();
        const sale1Rev = (2 * 4500000) + (5 * 550000); // 9.000.000 + 2.750.000 = 11.750.000
        const sale1Cogs = (2 * 3500000) + (5 * 400000); // 7.000.000 + 2.000.000 = 9.000.000
        await db.insert(transactions).values({
            id: sale1Id,
            transactionType: "Penjualan",
            amount: sale1Rev,
            description: "Jual 2 Laptop & 5 SSD",
            transactionDate: new Date('2026-01-10'),
            customerName: "Budi Santoso",
            paymentMethod: "Cash",
            paymentStatus: "Lunas"
        });
        await db.insert(transactionItems).values([
            { transactionId: sale1Id, inventoryId: laptopId, quantity: 2, unitPrice: 4500000 },
            { transactionId: sale1Id, inventoryId: sparepartId, quantity: 5, unitPrice: 550000 }
        ]);
        await db.insert(journalEntries).values([
            { transactionId: sale1Id, accountName: "Kas", debit: sale1Rev, credit: 0, createdAt: new Date('2026-01-10') },
            { transactionId: sale1Id, accountName: "Pendapatan", debit: 0, credit: sale1Rev, createdAt: new Date('2026-01-10') },
            { transactionId: sale1Id, accountName: "HPP", debit: sale1Cogs, credit: 0, createdAt: new Date('2026-01-10') },
            { transactionId: sale1Id, accountName: "Persediaan", debit: 0, credit: sale1Cogs, createdAt: new Date('2026-01-10') }
        ]);

        // 6. Penjualan Tempo (Credit Sale / Piutang)
        const sale2Id = crypto.randomUUID();
        const sale2Rev = 4500000;
        const sale2Cogs = 3500000;
        await db.insert(transactions).values({
            id: sale2Id,
            transactionType: "Penjualan",
            amount: sale2Rev,
            dpAmount: 1500000,
            description: "Jual 1 Laptop (Tempo)",
            transactionDate: new Date('2026-02-05'),
            customerName: "Agus Setiawan",
            paymentMethod: "Tempo",
            paymentStatus: "Belum Lunas"
        });
        await db.insert(transactionItems).values([
            { transactionId: sale2Id, inventoryId: laptopId, quantity: 1, unitPrice: 4500000 }
        ]);
        await db.insert(journalEntries).values([
            { transactionId: sale2Id, accountName: "Kas", debit: 1500000, credit: 0, createdAt: new Date('2026-02-05') }, // DP
            { transactionId: sale2Id, accountName: "Piutang Usaha", debit: 3000000, credit: 0, createdAt: new Date('2026-02-05') }, // Sisa
            { transactionId: sale2Id, accountName: "Pendapatan", debit: 0, credit: sale2Rev, createdAt: new Date('2026-02-05') },
            { transactionId: sale2Id, accountName: "HPP", debit: sale2Cogs, credit: 0, createdAt: new Date('2026-02-05') },
            { transactionId: sale2Id, accountName: "Persediaan", debit: 0, credit: sale2Cogs, createdAt: new Date('2026-02-05') }
        ]);

        // 7. Jasa Servis (Service Income)
        const serviceId = crypto.randomUUID();
        await db.insert(transactions).values({
            id: serviceId,
            transactionType: "Jasa Servis",
            amount: 150000,
            description: "Install Ulang OS Laptop Pelanggan",
            transactionDate: new Date('2026-02-15'),
            customerName: "Siti Aminah",
            paymentMethod: "Transfer",
            paymentStatus: "Lunas"
        });
        await db.insert(transactionItems).values([
            { transactionId: serviceId, inventoryId: serviceItemId, quantity: 1, unitPrice: 150000 }
        ]);
        await db.insert(journalEntries).values([
            { transactionId: serviceId, accountName: "Kas", debit: 150000, credit: 0, createdAt: new Date('2026-02-15') },
            { transactionId: serviceId, accountName: "Pendapatan Servis", debit: 0, credit: 150000, createdAt: new Date('2026-02-15') }
        ]);

        // 8. Beban Operasional (Opex)
        console.log("Inserting expenses...");
        const opex1Id = crypto.randomUUID();
        await db.insert(transactions).values({
            id: opex1Id,
            transactionType: "Operasional",
            amount: 2500000,
            description: "Gaji Karyawan Bulan Jan-Feb",
            transactionDate: new Date('2026-02-28'),
        });
        await db.insert(journalEntries).values([
            { transactionId: opex1Id, accountName: "Beban Gaji Karyawan", debit: 2500000, credit: 0, createdAt: new Date('2026-02-28') },
            { transactionId: opex1Id, accountName: "Kas", debit: 0, credit: 2500000, createdAt: new Date('2026-02-28') }
        ]);

        const opex2Id = crypto.randomUUID();
        await db.insert(transactions).values({
            id: opex2Id,
            transactionType: "Operasional",
            amount: 500000,
            description: "Tagihan Listrik & Internet",
            transactionDate: new Date('2026-03-05'),
        });
        await db.insert(journalEntries).values([
            { transactionId: opex2Id, accountName: "Beban Listrik & Internet", debit: 500000, credit: 0, createdAt: new Date('2026-03-05') },
            { transactionId: opex2Id, accountName: "Kas", debit: 0, credit: 500000, createdAt: new Date('2026-03-05') }
        ]);

        console.log("Seeding complete! Initial Capital: 100,000,000 IDR");
        process.exit(0);
    } catch (error) {
        console.error("Error seeding database:", error);
        process.exit(1);
    }
}

main();
