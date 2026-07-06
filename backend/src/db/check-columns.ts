import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function main() {
    const url = process.env.DATABASE_URL!;
    const token = process.env.DATABASE_AUTH_TOKEN!;
    console.log("Checking transaction_items columns on Turso:", url);
    
    const client = createClient({ url, authToken: token });
    try {
        const info = await client.execute("PRAGMA table_info(transaction_items);");
        console.log("Columns of transaction_items:");
        info.rows.forEach(r => {
            console.log(`- ${r.name} (${r.type})`);
        });
    } catch (e: any) {
        console.error("Failed:", e.message);
    }
    client.close();
    process.exit(0);
}

main();
