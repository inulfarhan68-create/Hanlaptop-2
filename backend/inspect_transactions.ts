import * as dotenv from "dotenv";
dotenv.config();

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./src/db/schema";

async function main() {
    const url = process.env.DATABASE_URL;
    const authToken = process.env.DATABASE_AUTH_TOKEN;
    const client = createClient({ url: url!, authToken: authToken! });
    const db = drizzle(client, { schema });

    console.log("=== TRANSACTIONS AND ITEMS ===");
    const trxs = await db.query.transactions.findMany({
        with: {
            items: {
                with: {
                    inventoryItem: true
                }
            }
        }
    });

    trxs.forEach(t => {
        console.log(`\nTransaction ID: ${t.id}`);
        console.log(`Type: ${t.transactionType} | Date: ${t.transactionDate} | Total Amount: ${t.amount}`);
        console.log(`Description: ${t.description}`);
        console.log("Items:");
        t.items.forEach(item => {
            console.log(`  - Name: ${item.inventoryItem?.itemName || 'Unknown'}`);
            console.log(`    Qty: ${item.quantity} | Unit Price: ${item.unitPrice} | Category: ${item.inventoryItem?.category}`);
        });
    });
}

main().catch(console.error);
