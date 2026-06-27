import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
dotenv.config();

const client = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN!,
    fetch: globalThis.fetch,
});

async function runSQL(sql: string) {
    try {
        await client.execute(sql);
        console.log(`✓ ${sql.substring(0, 70)}...`);
    } catch (err: any) {
        const msg = err.message || '';
        if (msg.includes("duplicate column") || msg.includes("already exists") || msg.includes("table already")) {
            console.log(`⏭ Already exists: ${sql.substring(0, 55)}...`);
        } else {
            console.error(`✗ Error: ${msg} | SQL: ${sql.substring(0, 55)}...`);
        }
    }
}

async function migrate() {
    console.log("DB URL:", process.env.DATABASE_URL);
    console.log("Token present:", !!process.env.DATABASE_AUTH_TOKEN);
    
    // Test connection first
    try {
        const test = await client.execute("SELECT 1 as ok");
        console.log("Connection OK:", test.rows[0]);
    } catch (e: any) {
        console.error("Connection FAILED:", e.message);
        process.exit(1);
    }

    console.log("\nRunning migrations...\n");

    await runSQL(`ALTER TABLE inventory ADD COLUMN consignment_commission_rate REAL DEFAULT 10`);
    await runSQL(`ALTER TABLE qc_inspections ADD COLUMN screen_score INTEGER DEFAULT 100`);
    await runSQL(`ALTER TABLE qc_inspections ADD COLUMN battery_health INTEGER DEFAULT 100`);
    await runSQL(`ALTER TABLE qc_inspections ADD COLUMN keyboard_score INTEGER DEFAULT 100`);
    await runSQL(`ALTER TABLE qc_inspections ADD COLUMN usb_ports_score INTEGER DEFAULT 100`);
    await runSQL(`ALTER TABLE qc_inspections ADD COLUMN hinge_score INTEGER DEFAULT 100`);
    await runSQL(`ALTER TABLE qc_inspections ADD COLUMN wifi_score INTEGER DEFAULT 100`);
    await runSQL(`ALTER TABLE qc_inspections ADD COLUMN body_score INTEGER DEFAULT 100`);
    await runSQL(`ALTER TABLE qc_inspections ADD COLUMN max_selling_price REAL`);
    await runSQL(`ALTER TABLE qc_inspections ADD COLUMN warranty_days INTEGER`);
    await runSQL(`ALTER TABLE warranty_claims ADD COLUMN technician_id TEXT`);
    await runSQL(`ALTER TABLE warranty_claims ADD COLUMN service_order_id TEXT`);
    await runSQL(`CREATE INDEX IF NOT EXISTS warranty_claims_technician_id_idx ON warranty_claims(technician_id)`);

    console.log("\n✅ Migration complete!");
    process.exit(0);
}

migrate();
