// Migration script to add 'role' column to user table
// Run this once: npx tsx src/db/migrate-role.ts

import { db } from "./index";
import { sql } from "drizzle-orm";

async function migrateRole() {
    console.log("Adding 'role' column to user table...");
    
    try {
        // Add the column if it doesn't exist
        await db.run(sql`ALTER TABLE user ADD COLUMN role TEXT NOT NULL DEFAULT 'owner'`);
        console.log("Column 'role' added successfully.");
    } catch (e: any) {
        if (e.message?.includes("duplicate column")) {
            console.log("Column 'role' already exists, skipping.");
        } else {
            console.error("Migration error:", e);
            throw e;
        }
    }
    
    // Set all existing users to 'owner' (they were created before roles existed)
    await db.run(sql`UPDATE user SET role = 'owner' WHERE role = 'kasir' OR role IS NULL`);
    console.log("All existing users set to 'owner' role.");
    
    console.log("Migration complete!");
}

migrateRole().catch(console.error);
