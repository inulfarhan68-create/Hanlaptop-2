import { db } from "./index";
import { inventory, transactions, transactionItems, journalEntries } from "./schema";
import crypto from "crypto";

async function main() {
    console.log("Seeding database with large dummy data...");
    try {
        await db.delete(journalEntries);
        await db.delete(transactionItems);
        await db.delete(transactions);
        await db.delete(inventory);

        // Modal
        const modalId = crypto.randomUUID();
        await db.insert(transactions).values({
            id: modalId, transactionType: "Modal Baru", amount: 200000000, description: "Setoran Modal", transactionDate: new Date('2026-01-01'), paymentMethod: "Transfer", paymentStatus: "Lunas"
        });

        const categories = ["Laptop Bekas", "Sparepart", "Aksesoris"];
        const laptopBrands = ["Asus", "Lenovo", "Acer", "HP", "Dell", "MacBook", "MSI"];
        const sparepartNames = ["SSD Kingston 512GB", "RAM DDR4 8GB", "HDD 1TB WD", "Keyboard Asus", "Charger Lenovo 65W", "Baterai Dell", "LCD Panel 14 inch", "Pasta Thermal", "RAM DDR5 16GB", "SSD NVMe 1TB"];
        const accessoriesNames = ["Mouse Wireless Logitech", "Mousepad RGB", "Tas Laptop Ransel", "Cooling Pad DeepCool", "Flashdisk SanDisk 32GB", "Kabel HDMI", "USB Hub", "Speaker Bluetooth"];
        const serviceNames = ["Install Ulang Windows", "Pembersihan Debu & Ganti Pasta", "Ganti LCD", "Ganti Keyboard", "Upgrade RAM & SSD", "Recovery Data"];

        const generatedInventory = [];

        // Generate 35 Inventory items
        for (let i = 0; i < 35; i++) {
            let cat = categories[Math.floor(Math.random() * 3)];
            let name = "";
            let cost = 0;
            let sell = 0;
            
            if (cat === "Laptop Bekas") {
                name = `${laptopBrands[Math.floor(Math.random() * laptopBrands.length)]} Core i${Math.floor(Math.random()*3)*2 + 3} Gen ${Math.floor(Math.random()*4)+8}`;
                cost = Math.floor(Math.random() * 3000000) + 2000000;
                sell = cost + 1000000;
            } else if (cat === "Sparepart") {
                name = sparepartNames[Math.floor(Math.random() * sparepartNames.length)];
                cost = Math.floor(Math.random() * 300000) + 150000;
                sell = cost + 150000;
            } else {
                name = accessoriesNames[Math.floor(Math.random() * accessoriesNames.length)];
                cost = Math.floor(Math.random() * 50000) + 50000;
                sell = cost + 50000;
            }

            generatedInventory.push({
                id: crypto.randomUUID(),
                itemName: name,
                category: cat,
                quantity: Math.floor(Math.random() * 30) + 2,
                costPrice: cost,
                sellingPrice: sell
            });
        }

        // Add service items
        for (const svc of serviceNames) {
            generatedInventory.push({
                id: crypto.randomUUID(),
                itemName: svc,
                category: "Jasa Servis",
                quantity: 999,
                costPrice: 0,
                sellingPrice: Math.floor(Math.random() * 200000) + 100000
            });
        }

        await db.insert(inventory).values(generatedInventory);

        // Generate 80 Transactions
        const customers = ["Budi", "Siti", "Agus", "Dewi", "Joko", "Rina", "Andi", "Tini", "Wawan", "Nia", "Anton", "Lina"];
        const types = ["Penjualan", "Penjualan", "Penjualan", "Jasa Servis", "Jasa Servis", "Operasional", "Pembelian Stok"];
        
        for (let i = 0; i < 80; i++) {
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 90)); // last 90 days
            
            const tType = types[Math.floor(Math.random() * types.length)];
            const tId = crypto.randomUUID();
            
            let amount = 0;
            let desc = "";
            let custName = customers[Math.floor(Math.random() * customers.length)];
            const isLunas = Math.random() > 0.15; // 85% lunas
            const status = tType === "Penjualan" ? (isLunas ? "Lunas" : "Belum Lunas") : "Lunas";
            const method = tType === "Penjualan" && !isLunas ? "Tempo" : (Math.random() > 0.5 ? "Cash" : "Transfer");

            if (tType === "Operasional") {
                amount = Math.floor(Math.random() * 1000000) + 50000;
                desc = `Pengeluaran ${Math.floor(Math.random() * 1000)}`;
                custName = "";
                await db.insert(transactions).values({ id: tId, transactionType: tType, amount, description: desc, transactionDate: date, paymentMethod: method, paymentStatus: status });
            } else if (tType === "Pembelian Stok") {
                amount = Math.floor(Math.random() * 5000000) + 1000000;
                desc = `Pembelian Stok ${Math.floor(Math.random() * 1000)}`;
                custName = "Supplier Pusat";
                await db.insert(transactions).values({ id: tId, transactionType: tType, amount, description: desc, transactionDate: date, paymentMethod: method, paymentStatus: status });
            } else {
                // Penjualan or Jasa Servis
                const availableInv = generatedInventory.filter(g => tType === "Penjualan" ? g.category !== "Jasa Servis" : g.category === "Jasa Servis");
                const item = availableInv[Math.floor(Math.random() * availableInv.length)];
                
                const qty = tType === "Penjualan" ? Math.floor(Math.random() * 3) + 1 : 1;
                amount = item.sellingPrice * qty;
                desc = `${tType} - ${item.itemName}`;

                const dpAmount = status === "Belum Lunas" ? Math.floor(amount * 0.3) : 0;
                
                await db.insert(transactions).values({ id: tId, transactionType: tType, amount, dpAmount, description: desc, transactionDate: date, customerName: custName, paymentMethod: method, paymentStatus: status });
                await db.insert(transactionItems).values({ transactionId: tId, inventoryId: item.id, quantity: qty, unitPrice: item.sellingPrice });
            }
        }

        console.log("Seeding complete with large data.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
main();
