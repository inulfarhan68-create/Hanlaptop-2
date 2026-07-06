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
    
    // Add deleted_at columns for soft delete support
    await runSQL(`ALTER TABLE inventory ADD COLUMN deleted_at INTEGER`);
    await runSQL(`ALTER TABLE customers ADD COLUMN deleted_at INTEGER`);
    await runSQL(`ALTER TABLE suppliers ADD COLUMN deleted_at INTEGER`);

    // Add serial_numbers to transaction_items for device tracking
    await runSQL(`ALTER TABLE transaction_items ADD COLUMN serial_numbers TEXT`);

    // Add device lifecycle columns
    await runSQL(`ALTER TABLE device_passports ADD COLUMN imei TEXT`);
    await runSQL(`ALTER TABLE device_passports ADD COLUMN mac_address TEXT`);
    await runSQL(`ALTER TABLE device_passports ADD COLUMN windows_key TEXT`);
    await runSQL(`ALTER TABLE device_passports ADD COLUMN battery_serial TEXT`);
    await runSQL(`ALTER TABLE device_passports ADD COLUMN motherboard_serial TEXT`);
    await runSQL(`ALTER TABLE device_passports ADD COLUMN battery_health INTEGER`);
    await runSQL(`ALTER TABLE device_passports ADD COLUMN battery_cycle INTEGER`);
    await runSQL(`ALTER TABLE device_passports ADD COLUMN health_score INTEGER`);

    // Add passport_id to warranty_claims
    await runSQL(`ALTER TABLE warranty_claims ADD COLUMN passport_id TEXT`);

    // Add detailed QC fields
    await runSQL(`ALTER TABLE qc_inspections ADD COLUMN battery_cycle INTEGER`);
    await runSQL(`ALTER TABLE qc_inspections ADD COLUMN touchpad_status TEXT DEFAULT 'NOT_TESTED'`);
    await runSQL(`ALTER TABLE qc_inspections ADD COLUMN speaker_status TEXT DEFAULT 'NOT_TESTED'`);
    await runSQL(`ALTER TABLE qc_inspections ADD COLUMN mic_status TEXT DEFAULT 'NOT_TESTED'`);
    await runSQL(`ALTER TABLE qc_inspections ADD COLUMN bluetooth_status TEXT DEFAULT 'NOT_TESTED'`);
    await runSQL(`ALTER TABLE qc_inspections ADD COLUMN webcam_status TEXT DEFAULT 'NOT_TESTED'`);
    await runSQL(`ALTER TABLE qc_inspections ADD COLUMN hdmi_status TEXT DEFAULT 'NOT_TESTED'`);
    await runSQL(`ALTER TABLE qc_inspections ADD COLUMN charging_status TEXT DEFAULT 'NOT_TESTED'`);
    await runSQL(`ALTER TABLE qc_inspections ADD COLUMN fingerprint_status TEXT DEFAULT 'NOT_TESTED'`);
    await runSQL(`ALTER TABLE qc_inspections ADD COLUMN passport_id TEXT`);

    console.log("\n✅ Migration complete!");
    process.exit(0);
}

migrate();
