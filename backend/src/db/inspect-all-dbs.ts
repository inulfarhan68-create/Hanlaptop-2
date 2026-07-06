import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import path from "path";

// Load backend env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function inspect(url: string, token?: string, name?: string) {
    console.log(`\n========================================`);
    console.log(`INSPECTING DB: ${name} (${url})`);
    console.log(`========================================`);
    try {
        const client = createClient({ url, authToken: token });
        const tablesRes = await client.execute("SELECT name FROM sqlite_master WHERE type='table';");
        const tables = tablesRes.rows.map(r => r.name);
        console.log("Tables:", tables);

        for (const table of tables) {
            try {
                const countRes = await client.execute(`SELECT COUNT(*) as count FROM \`${table}\``);
                console.log(`- ${table}: ${countRes.rows[0].count} rows`);
            } catch (e: any) {
                console.log(`- ${table}: ERROR ${e.message}`);
            }
        }
        client.close();
    } catch (e: any) {
        console.error("Inspection failed:", e.message);
    }
}

async function main() {
    // 1. Local SQLite inside backend/data/han-laptop.db
    const localPath = path.resolve(__dirname, "../../data/han-laptop.db");
    await inspect(`file:${localPath}`, undefined, "Local SQLite (backend/data)");

    // 2. Local SQLite inside root/data/han-laptop.db
    const rootPath = path.resolve(__dirname, "../../../data/han-laptop.db");
    await inspect(`file:${rootPath}`, undefined, "Local SQLite (root/data)");

    // 3. Turso Production DB
    const tursoUrl = process.env.DATABASE_URL;
    const tursoToken = process.env.DATABASE_AUTH_TOKEN;
    if (tursoUrl) {
        await inspect(tursoUrl, tursoToken, "Turso Cloud DB");
    } else {
        console.log("Turso URL not found in env.");
    }
    process.exit(0);
}

main();
