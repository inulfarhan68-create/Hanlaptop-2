import * as dotenv from "dotenv";
import path from "path";

// Load dotenv from backend folder
dotenv.config({ path: path.join(__dirname, "../../.env") });

async function migrateErpAdvanced() {
    console.log("Starting Advanced ERP migration...");
    
    const { db } = await import("./index");
    const { sql } = await import("drizzle-orm");
    
    // 1. Create purchase_requisitions table
    try {
        console.log("Creating 'purchase_requisitions' table...");
        await db.run(sql`
            CREATE TABLE IF NOT EXISTS purchase_requisitions (
                id TEXT PRIMARY KEY,
                store_id TEXT NOT NULL,
                requester_id TEXT NOT NULL,
                item_name TEXT NOT NULL,
                quantity REAL NOT NULL,
                estimated_cost REAL NOT NULL,
                supplier_name TEXT,
                status TEXT NOT NULL DEFAULT 'PENDING',
                notes TEXT,
                approved_by TEXT,
                approved_at INTEGER,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
                FOREIGN KEY (requester_id) REFERENCES employees(id) ON DELETE CASCADE
            )
        `);
        console.log("Table 'purchase_requisitions' created successfully.");
        
        console.log("Creating indexes for 'purchase_requisitions' table...");
        await db.run(sql`CREATE INDEX IF NOT EXISTS purchase_requisitions_store_id_idx ON purchase_requisitions (store_id)`);
        await db.run(sql`CREATE INDEX IF NOT EXISTS purchase_requisitions_status_idx ON purchase_requisitions (status)`);
        console.log("Indexes for 'purchase_requisitions' created successfully.");
    } catch (e: any) {
        console.error("Error creating 'purchase_requisitions' table:", e);
        throw e;
    }

    // 2. Create membership_points table
    try {
        console.log("Creating 'membership_points' table...");
        await db.run(sql`
            CREATE TABLE IF NOT EXISTS membership_points (
                id TEXT PRIMARY KEY,
                customer_id TEXT NOT NULL UNIQUE,
                points REAL NOT NULL DEFAULT 0,
                history TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
            )
        `);
        console.log("Table 'membership_points' created successfully.");
        
        console.log("Creating indexes for 'membership_points' table...");
        await db.run(sql`CREATE INDEX IF NOT EXISTS membership_points_customer_id_idx ON membership_points (customer_id)`);
        console.log("Indexes for 'membership_points' created successfully.");
    } catch (e: any) {
        console.error("Error creating 'membership_points' table:", e);
        throw e;
    }

    // 3. Create crm_reminders table
    try {
        console.log("Creating 'crm_reminders' table...");
        await db.run(sql`
            CREATE TABLE IF NOT EXISTS crm_reminders (
                id TEXT PRIMARY KEY,
                store_id TEXT NOT NULL,
                customer_id TEXT NOT NULL,
                customer_phone TEXT,
                type TEXT NOT NULL,
                scheduled_date TEXT NOT NULL,
                sent_at INTEGER,
                status TEXT NOT NULL DEFAULT 'PENDING',
                created_at INTEGER NOT NULL,
                FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
                FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
            )
        `);
        console.log("Table 'crm_reminders' created successfully.");
        
        console.log("Creating indexes for 'crm_reminders' table...");
        await db.run(sql`CREATE INDEX IF NOT EXISTS crm_reminders_store_id_idx ON crm_reminders (store_id)`);
        await db.run(sql`CREATE INDEX IF NOT EXISTS crm_reminders_customer_id_idx ON crm_reminders (customer_id)`);
        await db.run(sql`CREATE INDEX IF NOT EXISTS crm_reminders_status_idx ON crm_reminders (status)`);
        console.log("Indexes for 'crm_reminders' created successfully.");
    } catch (e: any) {
        console.error("Error creating 'crm_reminders' table:", e);
        throw e;
    }

    // 4. Create bank_mutations table
    try {
        console.log("Creating 'bank_mutations' table...");
        await db.run(sql`
            CREATE TABLE IF NOT EXISTS bank_mutations (
                id TEXT PRIMARY KEY,
                store_id TEXT NOT NULL,
                date TEXT NOT NULL,
                description TEXT NOT NULL,
                amount REAL NOT NULL,
                type TEXT NOT NULL,
                reconciled INTEGER NOT NULL DEFAULT 0,
                reconciled_transaction_id TEXT,
                reconciled_service_order_id TEXT,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
                FOREIGN KEY (reconciled_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL,
                FOREIGN KEY (reconciled_service_order_id) REFERENCES service_orders(id) ON DELETE SET NULL
            )
        `);
        console.log("Table 'bank_mutations' created successfully.");
        
        console.log("Creating indexes for 'bank_mutations' table...");
        await db.run(sql`CREATE INDEX IF NOT EXISTS bank_mutations_store_id_idx ON bank_mutations (store_id)`);
        await db.run(sql`CREATE INDEX IF NOT EXISTS bank_mutations_reconciled_idx ON bank_mutations (reconciled)`);
        console.log("Indexes for 'bank_mutations' created successfully.");
    } catch (e: any) {
        console.error("Error creating 'bank_mutations' table:", e);
        throw e;
    }
    
    console.log("Advanced ERP migration completed successfully!");
}

migrateErpAdvanced().catch(console.error);
