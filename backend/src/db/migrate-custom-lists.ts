import * as dotenv from "dotenv";
dotenv.config();

async function migrateCustomLists() {
    console.log("Starting custom lists migration...");
    
    // Dynamically import to ensure dotenv.config() has run before db is initialized
    const { db } = await import("./index");
    const { sql } = await import("drizzle-orm");
    
    // 1. Add expense_categories column to store_settings table
    try {
        console.log("Adding 'expense_categories' column to store_settings table...");
        await db.run(sql`ALTER TABLE store_settings ADD COLUMN expense_categories TEXT`);
        console.log("Column 'expense_categories' added successfully.");
    } catch (e: any) {
        if (e.message?.includes("duplicate column") || e.message?.includes("already exists")) {
            console.log("Column 'expense_categories' already exists, skipping.");
        } else {
            console.error("Error adding 'expense_categories' column:", e);
            throw e;
        }
    }

    // 2. Add service_issues column to store_settings table
    try {
        console.log("Adding 'service_issues' column to store_settings table...");
        await db.run(sql`ALTER TABLE store_settings ADD COLUMN service_issues TEXT`);
        console.log("Column 'service_issues' added successfully.");
    } catch (e: any) {
        if (e.message?.includes("duplicate column") || e.message?.includes("already exists")) {
            console.log("Column 'service_issues' already exists, skipping.");
        } else {
            console.error("Error adding 'service_issues' column:", e);
            throw e;
        }
    }

    console.log("Custom lists migration completed successfully!");
}

migrateCustomLists().catch(console.error);
