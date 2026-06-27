import { db } from "./index";
import { inventory, transactions, transactionItems, journalEntries } from "./schema";
import crypto from "crypto";

async function main() {
    console.log("Seeding database with dummy data (Desember 2025 - present)...");
    try {
        await db.delete(journalEntries);
        await db.delete(transactionItems);
        await db.delete(transactions);
        await db.delete(inventory);

        // Arrays for batch insertion
        const transToInsert: any[] = [];
        const transItemsToInsert: any[] = [];
        const journalsToInsert: any[] = [];

        // Date range
        const startDate = new Date('2025-12-01T08:00:00Z');
        const endDate = new Date('2026-06-12T23:59:59Z');

        // Modal Awal (December 2025)
        const modalId = crypto.randomUUID();
        const modalAmount = 100000000; // 100 Juta
        transToInsert.push({
            id: modalId, 
            transactionType: "Modal Baru", 
            amount: modalAmount, 
            description: "Setoran Modal Awal", 
            transactionDate: startDate, 
            paymentMethod: "Transfer Bank", 
            paymentStatus: "Lunas",
            invoiceNumber: `INV-MODAL-${Date.now()}`,
            createdAt: startDate
        });
        journalsToInsert.push(
            { id: crypto.randomUUID(), transactionId: modalId, accountName: "Bank", debit: modalAmount, credit: 0, createdAt: startDate },
            { id: crypto.randomUUID(), transactionId: modalId, accountName: "Modal Pemilik", debit: 0, credit: modalAmount, createdAt: startDate }
        );

        const laptopTemplates = [
            { name: "Asus VivoBook 14", specs: "Prosesor: Intel Core i5 Gen 11 | RAM: 8GB DDR4 | Storage: 512GB SSD NVMe | Layar: 14 FHD | VGA: Intel Iris Xe | Kondisi: Bekas Mulus | Minus: Tidak ada", cost: 4500000, sell: 5500000 },
            { name: "Lenovo ThinkPad T480", specs: "Prosesor: Intel Core i5 Gen 8 | RAM: 16GB DDR4 | Storage: 256GB SSD | Layar: 14 FHD | VGA: Intel UHD | Kondisi: Bekas Normal | Minus: Lecet pemakaian wajar", cost: 3500000, sell: 4300000 },
            { name: "Lenovo ThinkPad X280", specs: "Prosesor: Intel Core i7 Gen 8 | RAM: 8GB DDR4 | Storage: 512GB SSD | Layar: 12.5 HD | VGA: Intel UHD | Kondisi: Bekas Normal | Minus: Baret halus di cover", cost: 3800000, sell: 4600000 },
            { name: "MacBook Air M1 2020", specs: "Prosesor: Apple M1 | RAM: 8GB Unified | Storage: 256GB SSD | Layar: 13.3 Retina | VGA: Apple 7-core | Kondisi: Bekas Mulus | Minus: CC Baterai 250", cost: 9500000, sell: 11000000 },
            { name: "MacBook Pro 13 2019", specs: "Prosesor: Intel Core i5 Gen 8 | RAM: 8GB LPDDR3 | Storage: 256GB SSD | Layar: 13.3 Retina | VGA: Intel Iris Plus | Kondisi: Bekas Normal | Minus: Whitespot setitik", cost: 7500000, sell: 8500000 },
            { name: "Acer Aspire 5", specs: "Prosesor: AMD Ryzen 5 4500U | RAM: 8GB DDR4 | Storage: 512GB SSD | Layar: 14 FHD | VGA: AMD Radeon | Kondisi: Bekas Mulus | Minus: Tidak ada", cost: 4000000, sell: 5000000 },
            { name: "Acer Nitro 5", specs: "Prosesor: Intel Core i5 Gen 10 | RAM: 16GB DDR4 | Storage: 512GB SSD | Layar: 15.6 FHD 144Hz | VGA: GTX 1650 4GB | Kondisi: Bekas Gaming | Minus: Kipas agak berisik", cost: 6500000, sell: 7800000 },
            { name: "HP Pavilion 14", specs: "Prosesor: Intel Core i5 Gen 10 | RAM: 8GB DDR4 | Storage: 512GB SSD | Layar: 14 FHD | VGA: NVIDIA MX250 | Kondisi: Bekas Mulus | Minus: Body bawah lecet sedikit", cost: 4200000, sell: 5200000 },
            { name: "Dell Latitude 5400", specs: "Prosesor: Intel Core i5 Gen 8 | RAM: 8GB DDR4 | Storage: 256GB SSD | Layar: 14 HD | VGA: Intel UHD | Kondisi: Bekas Normal | Minus: Layar ada dent kecil", cost: 3200000, sell: 4000000 },
            { name: "MSI Modern 14", specs: "Prosesor: AMD Ryzen 5 5500U | RAM: 8GB DDR4 | Storage: 512GB SSD | Layar: 14 FHD IPS | VGA: AMD Radeon | Kondisi: Bekas Mulus | Minus: Dus tidak ada", cost: 5500000, sell: 6500000 }
        ];

        const spareparts = [
            { name: "SSD Kingston NVMe 512GB", cost: 350000, sell: 450000 },
            { name: "RAM DDR4 8GB Kingston", cost: 200000, sell: 300000 },
            { name: "Keyboard Lenovo T480", cost: 250000, sell: 400000 },
            { name: "Baterai Asus VivoBook", cost: 300000, sell: 500000 },
            { name: "Thermal Paste DeepCool", cost: 45000, sell: 75000 }
        ];

        const services = [
            { name: "Install Ulang Windows 10/11 + Office", cost: 0, sell: 150000 },
            { name: "Pembersihan Debu & Ganti Thermal Paste", cost: 0, sell: 150000 },
            { name: "Recovery Data Harddisk", cost: 0, sell: 300000 },
            { name: "Jasa Pasang SSD/RAM", cost: 0, sell: 50000 }
        ];

        const generatedInventory: any[] = [];
        let initialRestockCost = 0;
        
        // Buat inventory dari modal awal
        for (const lp of laptopTemplates) {
            const qty = 1; // Beli 1 buah di awal agar tidak melebihi modal 100jt
            initialRestockCost += lp.cost * qty;
            generatedInventory.push({
                id: crypto.randomUUID(),
                itemName: lp.name,
                category: "Laptop Bekas",
                quantity: qty,
                costPrice: lp.cost,
                sellingPrice: lp.sell,
                specs: lp.specs,
                createdAt: startDate
            });
        }

        for (const sp of spareparts) {
            const qty = 10;
            initialRestockCost += sp.cost * qty;
            generatedInventory.push({
                id: crypto.randomUUID(),
                itemName: sp.name,
                category: "Sparepart",
                quantity: qty,
                costPrice: sp.cost,
                sellingPrice: sp.sell,
                createdAt: startDate
            });
        }

        // Add service items (jasa)
        for (const svc of services) {
            generatedInventory.push({
                id: crypto.randomUUID(),
                itemName: svc.name,
                category: "Jasa Servis",
                quantity: 9999, // Infinite
                costPrice: svc.cost,
                sellingPrice: svc.sell,
                createdAt: startDate
            });
        }

        await db.insert(inventory).values(generatedInventory);

        // Catat transaksi pembelian stok awal (mengurangi modal awal dari Bank)
        const initRestockId = crypto.randomUUID();
        transToInsert.push({
            id: initRestockId,
            transactionType: "Pembelian Stok",
            amount: initialRestockCost,
            description: "Pembelian Stok Awal Usaha",
            transactionDate: startDate,
            createdAt: startDate,
            paymentMethod: "Transfer Bank",
            paymentStatus: "Lunas",
            invoiceNumber: `INV-RESTOCK-${Date.now()}`
        });
        journalsToInsert.push(
            { id: crypto.randomUUID(), transactionId: initRestockId, accountName: "Persediaan", debit: initialRestockCost, credit: 0, createdAt: startDate },
            { id: crypto.randomUUID(), transactionId: initRestockId, accountName: "Bank", debit: 0, credit: initialRestockCost, createdAt: startDate }
        );

        const customers = ["Budi Santoso", "Siti Aminah", "Agus Setiawan", "Dewi Lestari", "Joko Purwanto", "Rina Marlina", "Andi Pratama", "CV Sukses Makmur", "PT Teknologi Maju", "Toko Komputer Mandiri"];

        let currentDate = new Date('2025-12-02T10:00:00Z');
        let i_count = 0;

        // Loop per bulan dari Desember 2025 sampai bulan ini
        while (currentDate <= endDate) {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            
            // Target net profit bulanan 15jt - 30jt
            const targetProfit = Math.floor(Math.random() * 15000000) + 15000000;
            let currentGrossProfit = 0;

            // Beban operasional sekitar 4-7jt per bulan
            const operasionalCost = Math.floor(Math.random() * 3000000) + 4000000;
            
            // Target gross profit = net profit + operasional
            const targetGrossProfit = targetProfit + operasionalCost;

            let saleCount = 0;

            // Lakukan penjualan sampai mencapai target laba kotor
            while (currentGrossProfit < targetGrossProfit) {
                const isService = Math.random() > 0.7; // 30% jasa, 70% barang
                const tType = isService ? "Jasa Servis" : "Penjualan";
                const tId = crypto.randomUUID();
                
                const availableInv = generatedInventory.filter(g => isService ? g.category === "Jasa Servis" : g.category !== "Jasa Servis");
                const item = availableInv[Math.floor(Math.random() * availableInv.length)];
                
                // Pastikan stok selalu ada, jika habis kita asumsikan restock secara magis (dummy data purpose)
                // Tapi untuk konsistensi di database, kita tidak mengurangi property `quantity` dari object generatedInventory secara literal di memori agar bisa dipakai terus, 
                // namun dalam laporan keuangan kita asumsikan HPP jalan terus.
                
                let qty = isService ? 1 : (item.category === "Laptop Bekas" ? 1 : Math.floor(Math.random() * 2) + 1);
                // Ensure we don't sell more than we have
                if (!isService && item.quantity < qty) {
                    qty = item.quantity;
                }
                if (!isService && qty === 0) continue; // Skip if out of stock

                if (!isService) {
                    item.quantity -= qty; // Reduce physical stock
                }

                const amount = item.sellingPrice * qty;
                const cogs = isService ? 0 : item.costPrice * qty;
                
                const margin = amount - cogs;
                currentGrossProfit += margin;
                
                // Distribusikan transaksi secara acak dalam bulan tersebut
                const tDate = new Date(year, month, Math.floor(Math.random() * 27) + 1, Math.floor(Math.random() * 8) + 9); 
                if (tDate > endDate) break; 

                const custName = customers[Math.floor(Math.random() * customers.length)];
                const paymentMethod = Math.random() > 0.4 ? "Transfer Bank" : "Cash";
                const liquidAccount = paymentMethod === "Cash" ? "Kas" : "Bank";

                transToInsert.push({ 
                    id: tId, 
                    transactionType: tType, 
                    amount, 
                    dpAmount: 0, 
                    description: `${tType} - ${item.itemName}`, 
                    transactionDate: tDate, 
                    createdAt: tDate,
                    customerName: custName, 
                    paymentMethod, 
                    paymentStatus: "Lunas",
                    invoiceNumber: `INV-${tDate.getTime().toString().slice(-6)}-${i_count++}`
                });

                transItemsToInsert.push({ 
                    id: crypto.randomUUID(),
                    transactionId: tId, 
                    inventoryId: item.id, 
                    quantity: qty, 
                    unitPrice: item.sellingPrice 
                });

                if (isService) {
                    journalsToInsert.push(
                        { id: crypto.randomUUID(), transactionId: tId, accountName: "Pendapatan Servis", debit: 0, credit: amount, createdAt: tDate },
                        { id: crypto.randomUUID(), transactionId: tId, accountName: liquidAccount, debit: amount, credit: 0, createdAt: tDate }
                    );
                } else {
                    journalsToInsert.push(
                        { id: crypto.randomUUID(), transactionId: tId, accountName: "Pendapatan", debit: 0, credit: amount, createdAt: tDate },
                        { id: crypto.randomUUID(), transactionId: tId, accountName: "HPP", debit: cogs, credit: 0, createdAt: tDate },
                        { id: crypto.randomUUID(), transactionId: tId, accountName: "Persediaan", debit: 0, credit: cogs, createdAt: tDate },
                        { id: crypto.randomUUID(), transactionId: tId, accountName: liquidAccount, debit: amount, credit: 0, createdAt: tDate }
                    );
                }
                saleCount++;

                // Lakukan Restock secara berkala tiap 5 transaksi untuk menjaga stok dan memutar arus kas
                if (saleCount % 5 === 0) {
                    const rId = crypto.randomUUID();
                    const rDate = new Date(tDate.getTime() + 1000 * 60 * 60 * 24); // Besoknya
                    if (rDate <= endDate) {
                        const restockQty = qty * 2;
                        const buyAmount = item.costPrice * restockQty; // Restock 2x lipat dari yang terjual
                        
                        if (!isService) {
                            item.quantity += restockQty; // Increase physical stock
                        }

                        transToInsert.push({ 
                            id: rId, 
                            transactionType: "Pembelian Stok", 
                            amount: buyAmount, 
                            description: `Restock Barang (Otomatis)`, 
                            transactionDate: rDate, 
                            createdAt: rDate,
                            customerName: "Supplier Grosir",
                            paymentMethod: "Transfer Bank", 
                            paymentStatus: "Lunas",
                            invoiceNumber: `INV-BUY-${rDate.getTime().toString().slice(-6)}-${i_count++}`
                        });
                        journalsToInsert.push(
                            { id: crypto.randomUUID(), transactionId: rId, accountName: "Persediaan", debit: buyAmount, credit: 0, createdAt: rDate },
                            { id: crypto.randomUUID(), transactionId: rId, accountName: "Bank", debit: 0, credit: buyAmount, createdAt: rDate }
                        );
                    }
                }
            }

            // Tambahkan Pengeluaran Operasional di akhir bulan
            const opDate = new Date(year, month, 28, 16); // Tanggal 28
            if (opDate <= endDate) {
                const opId = crypto.randomUUID();
                transToInsert.push({ 
                    id: opId, 
                    transactionType: "Operasional", 
                    amount: operasionalCost, 
                    description: `Beban Gaji & Listrik Bulan ${month+1}`, 
                    transactionDate: opDate, 
                    createdAt: opDate,
                    paymentMethod: "Transfer Bank", 
                    paymentStatus: "Lunas",
                    invoiceNumber: `INV-OPEX-${opDate.getTime().toString().slice(-6)}-${i_count++}`
                });
                journalsToInsert.push(
                    { id: crypto.randomUUID(), transactionId: opId, accountName: "Beban Gaji Karyawan", debit: operasionalCost * 0.7, credit: 0, createdAt: opDate },
                    { id: crypto.randomUUID(), transactionId: opId, accountName: "Beban Listrik & Internet", debit: operasionalCost * 0.3, credit: 0, createdAt: opDate },
                    { id: crypto.randomUUID(), transactionId: opId, accountName: "Bank", debit: 0, credit: operasionalCost, createdAt: opDate }
                );
            }

            // Lanjut ke bulan berikutnya
            currentDate.setMonth(currentDate.getMonth() + 1);
            currentDate.setDate(1); // Set to 1st of next month
        }

        // Batch insert functions to avoid Drizzle params limit
        async function chunkedInsert(table: any, data: any[]) {
            const chunkSize = 500;
            for (let i = 0; i < data.length; i += chunkSize) {
                await db.insert(table).values(data.slice(i, i + chunkSize));
            }
        }

        // Execute batch inserts
        console.log(`Inserting ${transToInsert.length} transactions...`);
        await chunkedInsert(transactions, transToInsert);
        console.log(`Inserting ${transItemsToInsert.length} transaction items...`);
        await chunkedInsert(transactionItems, transItemsToInsert);
        console.log(`Inserting ${journalsToInsert.length} journal entries...`);
        await chunkedInsert(journalEntries, journalsToInsert);

        // Update final physical inventory into the table
        console.log(`Updating ${generatedInventory.length} inventory records...`);
        for (const item of generatedInventory) {
            await db.update(inventory).set({ quantity: item.quantity }).where(require("drizzle-orm").eq(inventory.id, item.id));
        }

        console.log("Seeding complete: Dummy data created successfully from December 2025!");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
main();
