import * as dotenv from "dotenv";
dotenv.config({ path: "./.env" });

async function inspect() {
    const { db } = await import("./src/db");
    const { user, userStoreAccess, stores } = await import("./src/db/schema");

    console.log("=== USERS ===");
    const allUsers = await db.select().from(user);
    console.log(allUsers);

    console.log("\n=== USER STORE ACCESS ===");
    const allAccess = await db.select().from(userStoreAccess);
    console.log(allAccess);

    console.log("\n=== STORES ===");
    const allStores = await db.select().from(stores);
    console.log(allStores);
}

inspect().catch(console.error);
