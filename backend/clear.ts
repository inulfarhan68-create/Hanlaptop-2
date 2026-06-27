import { db } from "./src/db";
import { transactions, transactionItems, journalEntries, inventory } from "./src/db/schema";

async function clearData() {
    try {
        console.log("Clearing transactions...");
        await db.delete(transactions);
        
        console.log("Clearing transactionItems...");
        await db.delete(transactionItems);
        
        console.log("Clearing journalEntries...");
        await db.delete(journalEntries);
        
        console.log("Clearing inventory...");
        await db.delete(inventory);

        console.log("Database cleared successfully!");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

clearData();
