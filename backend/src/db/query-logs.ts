import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function main() {
    const url = process.env.DATABASE_URL!;
    const token = process.env.DATABASE_AUTH_TOKEN!;
    
    const client = createClient({ url, authToken: token });
    try {
        const res = await client.execute("SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 10;");
        console.log("Recent Activity Logs:");
        res.rows.forEach(r => {
            console.log(`[${new Date(r.created_at as number * 1000).toISOString()}] Action: ${r.action}, Entity: ${r.entity_type}, Details: ${r.details}`);
        });
    } catch (e: any) {
        console.error("Failed:", e.message);
    }
    client.close();
    process.exit(0);
}

main();
