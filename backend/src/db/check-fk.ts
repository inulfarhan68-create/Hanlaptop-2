import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function main() {
    const url = process.env.DATABASE_URL!;
    const token = process.env.DATABASE_AUTH_TOKEN!;
    
    const client = createClient({ url, authToken: token });
    try {
        const invId = "3c64c61a-f38f-4d8c-94b7-657b02074efd";

        const invRes = await client.execute({
            sql: "SELECT id, item_name FROM inventory WHERE id = ?",
            args: [invId]
        });
        console.log(`Inventory ${invId} exists:`, invRes.rows.length > 0 ? invRes.rows[0] : false);

    } catch (e: any) {
        console.error("Failed:", e.message);
    }
    client.close();
    process.exit(0);
}

main();
