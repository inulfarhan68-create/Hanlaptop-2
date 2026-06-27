import { db } from "./db";
import { activityLogs } from "./db/schema";
import { eq } from "drizzle-orm";

async function main() {
    const logs = await db.select().from(activityLogs).limit(20);
    console.log("Total logs fetched:", logs.length);
    console.log(JSON.stringify(logs, null, 2));
}

main().catch(console.error);
