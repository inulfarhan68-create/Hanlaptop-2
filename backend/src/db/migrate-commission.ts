import * as dotenv from "dotenv";
dotenv.config();

async function migrateCommission() {
    console.log("Starting technician commission migration...");
    
    // Dynamically import to ensure dotenv.config() has run before db is initialized
    const { db } = await import("./index");
    const { sql } = await import("drizzle-orm");
    
    // 1. Add commission_type column to technicians table
    try {
        console.log("Adding 'commission_type' column to technicians table...");
        await db.run(sql`ALTER TABLE technicians ADD COLUMN commission_type TEXT NOT NULL DEFAULT 'percentage'`);
        console.log("Column 'commission_type' added successfully.");
    } catch (e: any) {
        if (e.message?.includes("duplicate column") || e.message?.includes("already exists")) {
            console.log("Column 'commission_type' already exists, skipping.");
        } else {
            console.error("Error adding 'commission_type' column:", e);
            throw e;
        }
    }

    // 2. Add commission_value column to technicians table
    try {
        console.log("Adding 'commission_value' column to technicians table...");
        await db.run(sql`ALTER TABLE technicians ADD COLUMN commission_value REAL NOT NULL DEFAULT 0`);
        console.log("Column 'commission_value' added successfully.");
    } catch (e: any) {
        if (e.message?.includes("duplicate column") || e.message?.includes("already exists")) {
            console.log("Column 'commission_value' already exists, skipping.");
        } else {
            console.error("Error adding 'commission_value' column:", e);
            throw e;
        }
    }

    // 3. Create technician_commissions table
    try {
        console.log("Creating 'technician_commissions' table...");
        await db.run(sql`
            CREATE TABLE IF NOT EXISTS \`technician_commissions\` (
                \`id\` text PRIMARY KEY NOT NULL,
                \`store_id\` text NOT NULL DEFAULT 'default' REFERENCES \`stores\`(\`id\`) ON DELETE cascade,
                \`technician_id\` text NOT NULL REFERENCES \`technicians\`(\`id\`) ON DELETE cascade,
                \`service_order_id\` text NOT NULL REFERENCES \`service_orders\`(\`id\`) ON DELETE cascade,
                \`transaction_id\` text REFERENCES \`transactions\`(\`id\`) ON DELETE set null,
                \`service_amount\` real NOT NULL DEFAULT 0,
                \`parts_amount\` real NOT NULL DEFAULT 0,
                \`commission_amount\` real NOT NULL DEFAULT 0,
                \`status\` text NOT NULL DEFAULT 'UNPAID',
                \`paid_at\` integer,
                \`payout_transaction_id\` text REFERENCES \`transactions\`(\`id\`) ON DELETE set null,
                \`created_at\` integer NOT NULL
            )
        `);
        console.log("Table 'technician_commissions' created successfully.");
    } catch (e: any) {
        console.error("Error creating 'technician_commissions' table:", e);
        throw e;
    }

    // 4. Create indexes for technician_commissions table
    try {
        console.log("Creating indexes for 'technician_commissions' table...");
        await db.run(sql`CREATE INDEX IF NOT EXISTS \`technician_commission_store_id_idx\` ON \`technician_commissions\` (\`store_id\`)`);
        await db.run(sql`CREATE INDEX IF NOT EXISTS \`technician_commission_tech_id_idx\` ON \`technician_commissions\` (\`technician_id\`)`);
        await db.run(sql`CREATE INDEX IF NOT EXISTS \`technician_commission_so_id_idx\` ON \`technician_commissions\` (\`service_order_id\`)`);
        console.log("Indexes created successfully.");
    } catch (e: any) {
        console.error("Error creating indexes:", e);
        throw e;
    }

    console.log("Technician commission migration completed successfully!");
}

migrateCommission().catch(console.error);
