import * as dotenv from "dotenv";
dotenv.config();

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./src/db/schema";
import { eq, and, gte, lte, sum } from "drizzle-orm";

async function main() {
    const url = process.env.DATABASE_URL;
    const authToken = process.env.DATABASE_AUTH_TOKEN;
    const client = createClient({ url: url!, authToken: authToken! });
    const db = drizzle(client, { schema });

    const journalBalances = await db.select({
        accountName: schema.journalEntries.accountName,
        totalDebit: sum(schema.journalEntries.debit).mapWith(Number),
        totalCredit: sum(schema.journalEntries.credit).mapWith(Number)
    }).from(schema.journalEntries).groupBy(schema.journalEntries.accountName);

    console.log("=== JOURNAL BALANCES ===");
    console.log(journalBalances);

    let kas = 0, bank = 0, qris = 0, piutang = 0, liabilities = 0, equity = 0, prive = 0;
    journalBalances.forEach(entry => {
        const deb = entry.totalDebit || 0;
        const cred = entry.totalCredit || 0;
        const name = entry.accountName;
        if (name.includes("Hutang")) {
            liabilities += cred - deb;
        } else if (name === "Modal Pemilik") {
            equity += cred - deb;
        } else if (name === "Prive") {
            prive += deb - cred;
        } else if (name === "Kas") {
            kas += deb - cred;
        } else if (name === "Bank") {
            bank += deb - cred;
        } else if (name === "QRIS") {
            qris += deb - cred;
        } else if (name === "Piutang Usaha") {
            piutang += deb - cred;
        }
    });

    const kasLiquid = kas + bank + qris;
    const allInventory = await db.select().from(schema.inventory);
    const totalInventoryValue = allInventory.reduce((sum, i) => sum + (i.costPrice * i.quantity), 0);
    const actualTotalAssets = kasLiquid + totalInventoryValue + piutang;

    console.log("\n=== COMPUTED VALUES ===");
    console.log("Kas:", kas);
    console.log("Bank:", bank);
    console.log("QRIS:", qris);
    console.log("Kas Liquid:", kasLiquid);
    console.log("Piutang Usaha:", piutang);
    console.log("Total Inventory Value (Physical):", totalInventoryValue);
    console.log("Actual Total Assets (Dashboard):", actualTotalAssets);
    console.log("Liabilities (Utang):", liabilities);
    console.log("Equity (Capital):", equity);
    console.log("Net Asset (Dashboard):", actualTotalAssets - liabilities);

    console.log("\n=== INVENTORY ITEMS ===");
    console.log(allInventory);
}

main().catch(console.error);
