import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { db } from "../db";
import { sql } from "drizzle-orm";

async function main() {
    try {
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

        console.log("Checking table counts on Turso...");
        for (const table of tables) {
            try {
                const result = await db.run(sql.raw(`SELECT COUNT(*) as count FROM \`${table}\``));
                console.log(`Table ${table}:`, result.rows[0]?.count);
            } catch (e: any) {
                console.log(`Table ${table}: ERROR -`, e);
            }
        }
    } catch (err: any) {
        console.error("Connection failed:", err);
    }
    process.exit(0);
}

main();
