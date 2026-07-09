import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const client = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN!,
    fetch: globalThis.fetch,
});

async function verifyMigration() {
    console.log("=========================================");
    console.log("   MIGRATION VERIFICATION SCRIPT");
    console.log("=========================================");

    try {
        // 1. Check total journal entries
        const countResult = await client.execute("SELECT COUNT(*) as total FROM journal_entries");
        const totalJournals = countResult.rows[0].total as number;
        console.log(`Total Journal Entries: ${totalJournals}`);

        // 2. Check Trial Balance (Total Debit vs Total Credit)
        const tbResult = await client.execute(`
            SELECT 
                SUM(debit) as totalDebit, 
                SUM(credit) as totalCredit 
            FROM journal_entries
        `);
        
        const totalDebit = (tbResult.rows[0].totalDebit as number) || 0;
        const totalCredit = (tbResult.rows[0].totalCredit as number) || 0;
        const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

        console.log(`Total Debit : Rp ${totalDebit.toLocaleString('id-ID')}`);
        console.log(`Total Credit: Rp ${totalCredit.toLocaleString('id-ID')}`);
        console.log(`Status: ${isBalanced ? '✅ BALANCED' : '❌ UNBALANCED'}`);

        // 3. Check for unmapped accounts (account_code IS NULL)
        const unmappedResult = await client.execute(`
            SELECT COUNT(*) as unmapped 
            FROM journal_entries 
            WHERE account_code IS NULL
        `);
        const unmappedCount = unmappedResult.rows[0].unmapped as number;
        console.log(`Unmapped Journals: ${unmappedCount === 0 ? '✅ 0' : `❌ ${unmappedCount}`}`);

        // 4. Check for invalid accounts (account_code not in chart_of_accounts)
        const invalidAccountResult = await client.execute(`
            SELECT COUNT(j.id) as invalidCount
            FROM journal_entries j
            LEFT JOIN chart_of_accounts c ON j.account_code = c.code AND j.store_id = c.store_id
            WHERE c.id IS NULL AND j.account_code IS NOT NULL
        `);
        const invalidCount = invalidAccountResult.rows[0].invalidCount as number;
        console.log(`Invalid Account References: ${invalidCount === 0 ? '✅ 0' : `❌ ${invalidCount}`}`);

        // 5. Output snapshot log to file
        const logContent = {
            timestamp: new Date().toISOString(),
            totalJournals,
            totalDebit,
            totalCredit,
            isBalanced,
            unmappedCount,
            invalidCount
        };

        const logsDir = path.join(__dirname, "..", "logs");
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        const logFilePath = path.join(logsDir, `audit_snapshot_${Date.now()}.json`);
        fs.writeFileSync(logFilePath, JSON.stringify(logContent, null, 2));
        
        console.log(`\n✅ Snapshot saved to: ${logFilePath}`);

    } catch (err: any) {
        console.error("Error verifying migration:", err.message);
    }
}

verifyMigration().catch(console.error);
