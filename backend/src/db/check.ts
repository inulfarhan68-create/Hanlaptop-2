import * as dotenv from "dotenv";
dotenv.config();
import { db } from "./index";
import { desc } from "drizzle-orm";
import { createClient } from "@libsql/client";

const client = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN
});

async function main() {
    const res = await client.execute("SELECT id, payment_status, due_date FROM transactions ORDER BY created_at DESC LIMIT 5");
    console.log("Recent transactions:");
    res.rows.forEach(r => console.log(`- ${r.id} | ${r.payment_status} | Due: ${r.due_date}`));
    process.exit(0);
}
main().catch(console.error);
