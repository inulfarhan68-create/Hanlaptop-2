import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { db } from "../db";
import { sql } from "drizzle-orm";

async function main() {
    try {
        console.log("Listing all tables on Turso...");
        const result = await db.run(sql.raw(`SELECT name FROM sqlite_master WHERE type='table'`));
        console.log("Tables:", result.rows.map(r => r.name));
    } catch (err: any) {
        console.error("Query failed:", err);
    }
    process.exit(0);
}

main();
