import { db } from "./src/db/index.js";
import { sql } from "drizzle-orm";

async function run() {
    await db.run(sql`UPDATE user SET role = 'owner' WHERE role = 'kasir' OR role IS NULL`);
    console.log("Updated all users to owner");
}
run().catch(console.error);
