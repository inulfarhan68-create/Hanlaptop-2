import * as dotenv from "dotenv";
dotenv.config();

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./src/db/schema";
import { eq, and, gte, lte, sum } from "drizzle-orm";

function getPreviousPeriod(fromStr: string | null, toStr: string | null) {
    if (!fromStr || !toStr) return { prevFrom: null, prevTo: null };
    
    const from = new Date(fromStr);
    const to = new Date(toStr);
    
    const isStartOfMonth = from.getDate() === 1;
    const tempNextDay = new Date(to);
    tempNextDay.setDate(tempNextDay.getDate() + 1);
    const isEndOfMonth = tempNextDay.getDate() === 1;
    const isSameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
    
    let prevFrom: Date;
    let prevTo: Date;
    
    if (isStartOfMonth && isEndOfMonth && isSameMonth) {
        prevFrom = new Date(from.getFullYear(), from.getMonth() - 1, 1);
        prevTo = new Date(from.getFullYear(), from.getMonth(), 0);
    } else {
        const durationMs = to.getTime() - from.getTime();
        prevTo = new Date(from.getTime() - 24 * 60 * 60 * 1000);
        prevFrom = new Date(prevTo.getTime() - durationMs);
    }
    
    prevFrom.setHours(0, 0, 0, 0);
    prevTo.setHours(23, 59, 59, 999);
    
    return { prevFrom, prevTo };
}

async function getAssetsAtDate(db: any, storeId: string, dateLimit: Date) {
    const storeCond = storeId !== "all" ? eq(schema.journalEntries.storeId, storeId) : undefined;
    
    const balances = await db.select({
        accountName: schema.journalEntries.accountName,
        totalDebit: sum(schema.journalEntries.debit).mapWith(Number),
        totalCredit: sum(schema.journalEntries.credit).mapWith(Number)
    })
    .from(schema.journalEntries)
    .where(
        storeCond 
            ? and(storeCond, lte(schema.journalEntries.createdAt, dateLimit)) 
            : lte(schema.journalEntries.createdAt, dateLimit)
    )
    .groupBy(schema.journalEntries.accountName);
    
    let kas = 0;
    let bank = 0;
    let qris = 0;
    let piutang = 0;
    let persediaan = 0;
    let asetTetap = 0;
    
    balances.forEach((entry: any) => {
        const deb = entry.totalDebit || 0;
        const cred = entry.totalCredit || 0;
        const name = entry.accountName;
        
        if (name === "Kas") {
            kas += deb - cred;
        } else if (name === "Bank") {
            bank += deb - cred;
        } else if (name === "QRIS") {
            qris += deb - cred;
        } else if (name === "Piutang Usaha") {
            piutang += deb - cred;
        } else if (name === "Persediaan") {
            persediaan += deb - cred;
        } else if (name === "Aset Tetap") {
            asetTetap += deb - cred;
        }
    });
    
    return kas + bank + qris + piutang + persediaan + asetTetap;
}

async function main() {
    const url = process.env.DATABASE_URL;
    const authToken = process.env.DATABASE_AUTH_TOKEN;
    
    console.log("Turso URL:", url);
    const client = createClient({ url: url!, authToken: authToken! });
    const db = drizzle(client, { schema });
    
    // Test custom periods to ensure both have data:
    // Current: June 15 - June 30, 2026
    // Previous: May 30 - June 14, 2026 (includes June 14 seed transactions)
    const fromStr = "2026-06-15";
    const toStr = "2026-06-30";
    const storeId = "default";
    
    const { prevFrom, prevTo } = getPreviousPeriod(fromStr, toStr);
    console.log("Current Period:", fromStr, "to", toStr);
    console.log("Calculated Previous Period:", prevFrom?.toISOString(), "to", prevTo?.toISOString());
    
    if (prevFrom && prevTo) {
        const currentConditions = [
            gte(schema.journalEntries.createdAt, new Date(fromStr)),
            lte(schema.journalEntries.createdAt, new Date(toStr + "T23:59:59.999Z")),
            eq(schema.journalEntries.storeId, storeId)
        ];
        const currentJournals = await db.select().from(schema.journalEntries).where(and(...currentConditions));
        
        let currentRevenue = 0, currentCogs = 0, currentOpex = 0;
        currentJournals.forEach((entry: any) => {
            if (entry.accountName.includes("Pendapatan")) currentRevenue += entry.credit - entry.debit;
            else if (entry.accountName === "HPP") currentCogs += entry.debit - entry.credit;
            else if (entry.accountName.includes("Beban")) currentOpex += entry.debit - entry.credit;
        });
        const currentNetProfit = currentRevenue - currentCogs - currentOpex;
        
        const prevConditions = [
            gte(schema.journalEntries.createdAt, prevFrom),
            lte(schema.journalEntries.createdAt, prevTo),
            eq(schema.journalEntries.storeId, storeId)
        ];
        const prevJournals = await db.select().from(schema.journalEntries).where(and(...prevConditions));
        
        let prevRevenue = 0, prevCogs = 0, prevOpex = 0;
        prevJournals.forEach((entry: any) => {
            if (entry.accountName.includes("Pendapatan")) prevRevenue += entry.credit - entry.debit;
            else if (entry.accountName === "HPP") prevCogs += entry.debit - entry.credit;
            else if (entry.accountName.includes("Beban")) prevOpex += entry.debit - entry.credit;
        });
        const prevNetProfit = prevRevenue - prevCogs - prevOpex;
        
        const currentAssetsVal = await getAssetsAtDate(db, storeId, new Date(toStr + "T23:59:59.999Z"));
        const prevAssetsVal = await getAssetsAtDate(db, storeId, prevTo);
        
        console.log("\n=== Current Period Values ===");
        console.log("Revenue:", currentRevenue);
        console.log("Opex:", currentOpex);
        console.log("Net Profit:", currentNetProfit);
        console.log("Assets:", currentAssetsVal);
        
        console.log("\n=== Previous Period Values ===");
        console.log("Revenue:", prevRevenue);
        console.log("Opex:", prevOpex);
        console.log("Net Profit:", prevNetProfit);
        console.log("Assets:", prevAssetsVal);
        
        const calcGrowth = (current: number, previous: number) => {
            if (previous === 0) {
                return current !== 0 ? "Baru" : null;
            }
            return parseFloat((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
        };
        
        console.log("\n=== Growth ===");
        console.log("Revenue:", calcGrowth(currentRevenue, prevRevenue));
        console.log("Opex:", calcGrowth(currentOpex, prevOpex));
        console.log("Net Profit:", calcGrowth(currentNetProfit, prevNetProfit));
        console.log("Assets:", calcGrowth(currentAssetsVal, prevAssetsVal));
    }
}

main().catch(console.error);
