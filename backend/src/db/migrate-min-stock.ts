import * as dotenv from "dotenv";
dotenv.config();

async function migrateMinStock() {
    console.log("Starting minimum stock migration...");
    
    // Dynamically import to ensure dotenv.config() has run before db is initialized
    const { db } = await import("./index");
    const { sql } = await import("drizzle-orm");
    
    try {
        console.log("Adding 'min_stock' column to inventory table...");
        await db.run(sql`ALTER TABLE inventory ADD COLUMN min_stock INTEGER NOT NULL DEFAULT 2`);
        console.log("Column 'min_stock' added successfully.");
    } catch (e: any) {
        if (e.message?.includes("duplicate column") || e.message?.includes("already exists")) {
            console.log("Column 'min_stock' already exists, skipping.");
        } else {
            console.error("Error adding 'min_stock' column:", e);
            throw e;
        }
    }

    console.log("Minimum stock migration completed successfully!");
}

migrateMinStock().catch(console.error);
