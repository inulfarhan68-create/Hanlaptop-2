import { createClient } from "@libsql/client";
import path from "path";

async function checkDb(dbName: string) {
    try {
        const dbPath = path.resolve(__dirname, "../../", dbName);
        console.log(`\nChecking DB at: ${dbPath}`);
        
        const client = createClient({
            url: `file:${dbPath}`,
        });

        const tables = [
            'stores',
            'store_settings',
            'users',
            'customers',
            'suppliers',
            'inventory',
            'transactions',
            'transaction_items',
            'journal_entries',
            'cashier_shifts',
            'qc_inspections',
            'device_passports',
            'device_lifecycle_logs'
        ];

        const existingTables = [];
        for (const table of tables) {
            try {
                const result = await client.execute(`SELECT COUNT(*) as count FROM \`${table}\``);
                console.log(`Table ${table}:`, result.rows[0]?.count);
                existingTables.push(table);
            } catch (e: any) {
                // table doesn't exist
            }
        }
        if (existingTables.length === 0) {
            console.log("No tables found or empty.");
        }
    } catch (err: any) {
        console.error("Failed:", err.message);
    }
}

async function main() {
    await checkDb("sqlite.db");
    await checkDb("local.db");
    process.exit(0);
}

main();
