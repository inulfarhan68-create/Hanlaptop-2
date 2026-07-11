import { db } from "./src/db";
import { journals, transactions, transactionItems } from "./src/db/schema";
import { sql } from "drizzle-orm";

async function main() {
    console.log("=== Checking July Journals ===");
    // Filter directly from JS just to be absolutely sure about dates
    const allJournals = await db.select().from(journals);
    let pendapatan = 0;
    allJournals.forEach(j => {
        const d = new Date(j.createdAt);
        if (d.getFullYear() === 2026 && d.getMonth() === 6) { // 6 = July
            if (j.accountName === "Pendapatan") {
                const net = (j.credit || 0) - (j.debit || 0);
                pendapatan += net;
                console.log(`Journal Pendapatan: ID ${j.id}, Ref ${j.referenceId}, Deskripsi: ${j.description}, Credit: ${j.credit}, Debit: ${j.debit}, Net: ${net}`);
            }
        }
    });
    console.log(`Total Pendapatan (Juli): ${pendapatan}`);

    console.log("\n=== Checking July Transactions (Aksesoris) ===");
    const items = await db.query.transactionItems.findMany({
        with: {
            transaction: true,
            inventoryItem: true
        }
    });
    let aksesoris = 0;
    items.forEach(item => {
        if (!item.transaction) return;
        const txDate = new Date(item.transaction.transactionDate);
        if (txDate.getFullYear() === 2026 && txDate.getMonth() === 6) { 
            if (item.transaction.transactionType === "Penjualan" && item.inventoryItem?.category === "Aksesoris") {
                const itemTotal = item.quantity * item.unitPrice;
                aksesoris += itemTotal;
                console.log(`Aksesoris terjual: Tx ${item.transactionId}, Item: ${item.inventoryItem.itemName}, Qty: ${item.quantity}, Price: ${item.unitPrice}, Total: ${itemTotal}`);
            }
        }
    });
    console.log(`Total Aksesoris (Juli): ${aksesoris}`);
    
    console.log(`\nFormula di dashboard: sales = Math.round((Pendapatan - Aksesoris) / 1000)`);
    console.log(`Result: Math.round((${pendapatan} - ${aksesoris}) / 1000) = ${Math.round((pendapatan - aksesoris) / 1000)}k`);
}
main().catch(console.error).then(() => process.exit(0));
