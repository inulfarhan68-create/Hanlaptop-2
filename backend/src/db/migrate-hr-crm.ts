import * as dotenv from "dotenv";
import path from "path";

// Load dotenv from backend folder
dotenv.config({ path: path.join(__dirname, "../../.env") });

async function migrateHrCrm() {
    console.log("Starting HR & CRM migration...");
    
    const { db } = await import("./index");
    const { sql } = await import("drizzle-orm");
    
    // 1. Add columns to service_orders
    const columns = [
        { name: "rating", type: "INTEGER" },
        { name: "rating_comment", type: "TEXT" },
        { name: "rating_at", type: "INTEGER" }
    ];
    
    for (const col of columns) {
        try {
            console.log(`Adding '${col.name}' column to service_orders table...`);
            await db.run(sql.raw(`ALTER TABLE service_orders ADD COLUMN ${col.name} ${col.type}`));
            console.log(`Column '${col.name}' added successfully.`);
        } catch (e: any) {
            if (e.message?.includes("duplicate column") || e.message?.includes("already exists")) {
                console.log(`Column '${col.name}' already exists, skipping.`);
            } else {
                console.error(`Error adding '${col.name}' column:`, e);
            }
        }
    }
    
    // 2. Create attendances table
    try {
        console.log("Creating 'attendances' table...");
        await db.run(sql`
            CREATE TABLE IF NOT EXISTS attendances (
                id TEXT PRIMARY KEY,
                store_id TEXT NOT NULL,
                employee_id TEXT NOT NULL,
                date TEXT NOT NULL,
                clock_in INTEGER,
                clock_out INTEGER,
                status TEXT NOT NULL DEFAULT 'HADIR',
                photo_in TEXT,
                photo_out TEXT,
                location_in TEXT,
                location_out TEXT,
                notes TEXT,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
                FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
            )
        `);
        console.log("Table 'attendances' created successfully.");
        
        console.log("Creating indexes for 'attendances' table...");
        await db.run(sql`CREATE INDEX IF NOT EXISTS attendances_store_id_idx ON attendances (store_id)`);
        await db.run(sql`CREATE INDEX IF NOT EXISTS attendances_employee_id_idx ON attendances (employee_id)`);
        await db.run(sql`CREATE INDEX IF NOT EXISTS attendances_date_idx ON attendances (date)`);
        console.log("Indexes created successfully.");
    } catch (e: any) {
        console.error("Error creating 'attendances' table or indexes:", e);
        throw e;
    }
    
    console.log("HR & CRM migration completed successfully!");
}

migrateHrCrm().catch(console.error);
