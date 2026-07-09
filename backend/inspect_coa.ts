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

    console.log("=== CHART OF ACCOUNTS ===");
    const coas = await db.select().from(schema.chartOfAccounts);
    coas.forEach(c => {
        console.log(`Code: ${c.code} | Name: ${c.name} | Type: ${c.type} | SubType: ${c.subType}`);
    });
}

main().catch(console.error);
