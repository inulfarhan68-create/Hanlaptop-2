import * as dotenv from "dotenv";
dotenv.config({ path: "./.env" });

async function fix() {
    const { db } = await import("./src/db");
    const { userStoreAccess } = await import("./src/db/schema");
    const { eq } = await import("drizzle-orm");

    await db.update(userStoreAccess)
        .set({ storeId: "b1cc1226-5098-4013-a01a-1f37e004a86f" })
        .where(eq(userStoreAccess.userId, "fd2MebHaDpujYLZW3hZ66PX3J55ZQNNU"));

    console.log("Rizaldy's store access updated successfully to Han Laptop Bekasi!");
}

fix().catch(console.error);
