/**
 * Device Lifecycle Migration Script
 *
 * This migration adds:
 * 1. Hardware identification fields to device_passports (imei, mac_address, windows_key, etc.)
 * 2. passport_id to warranty_claims for device-specific warranty tracking
 * 3. Detailed QC fields to qc_inspections (component checks)
 * 4. device_refurbishments table for tracking repairs/upgrades
 */

import { createClient } from '@libsql/client';
import { config } from 'dotenv';

config({ path: '.env' });

const dbUrl = process.env.DATABASE_URL;
const dbToken = process.env.DATABASE_AUTH_TOKEN;

if (!dbUrl) {
    console.error("❌ Database URL not found in environment variables");
    process.exit(1);
}

const db = createClient({
    url: dbUrl,
    authToken: dbToken
});

async function runMigration() {
    console.log("📦 Running Device Lifecycle Migration...\n");

    try {
        // 1. Add hardware identification fields to device_passports
        console.log("📋 Adding hardware fields to device_passports...");

        const hardwareFields = [
            { name: "imei", type: "TEXT" },
            { name: "mac_address", type: "TEXT" },
            { name: "windows_key", type: "TEXT" },
            { name: "battery_serial", type: "TEXT" },
            { name: "motherboard_serial", type: "TEXT" },
            { name: "battery_health", type: "INTEGER" },
            { name: "battery_cycle", type: "INTEGER" },
            { name: "health_score", type: "INTEGER" }
        ];

        for (const field of hardwareFields) {
            try {
                await db.execute(`ALTER TABLE device_passports ADD COLUMN ${field.name} ${field.type}`);
                console.log(`✓ Added: ${field.name}`);
            } catch (e: any) {
                if (e.message?.includes("duplicate column")) {
                    console.log(`○ Already exists: ${field.name}`);
                } else {
                    console.log(`✗ Error adding ${field.name}: ${e.message}`);
                }
            }
        }

        // 2. Add passport_id to warranty_claims
        console.log("\n📋 Adding passport_id to warranty_claims...");
        try {
            await db.execute(`ALTER TABLE warranty_claims ADD COLUMN passport_id TEXT`);
            console.log("✓ Added: passport_id");

            // Create index
            try {
                await db.execute(`CREATE INDEX IF NOT EXISTS warranty_claims_passport_id_idx ON warranty_claims (passport_id)`);
                console.log("✓ Created index: warranty_claims_passport_id_idx");
            } catch (e: any) {
                if (!e.message?.includes("already exists")) {
                    console.log(`✗ Error creating index: ${e.message}`);
                }
            }
        } catch (e: any) {
            if (e.message?.includes("duplicate column")) {
                console.log("○ Already exists: passport_id");
            } else {
                console.log(`✗ Error: ${e.message}`);
            }
        }

        // 3. Add detailed QC fields to qc_inspections
        console.log("\n📋 Adding detailed QC fields to qc_inspections...");

        const qcFields = [
            { name: "battery_cycle", type: "INTEGER" },
            { name: "touchpad_status", type: "TEXT DEFAULT 'NOT_TESTED'" },
            { name: "speaker_status", type: "TEXT DEFAULT 'NOT_TESTED'" },
            { name: "mic_status", type: "TEXT DEFAULT 'NOT_TESTED'" },
            { name: "bluetooth_status", type: "TEXT DEFAULT 'NOT_TESTED'" },
            { name: "webcam_status", type: "TEXT DEFAULT 'NOT_TESTED'" },
            { name: "hdmi_status", type: "TEXT DEFAULT 'NOT_TESTED'" },
            { name: "charging_status", type: "TEXT DEFAULT 'NOT_TESTED'" },
            { name: "fingerprint_status", type: "TEXT DEFAULT 'NOT_TESTED'" },
            { name: "passport_id", type: "TEXT" }
        ];

        for (const field of qcFields) {
            try {
                await db.execute(`ALTER TABLE qc_inspections ADD COLUMN ${field.name} ${field.type}`);
                console.log(`✓ Added: ${field.name}`);
            } catch (e: any) {
                if (e.message?.includes("duplicate column")) {
                    console.log(`○ Already exists: ${field.name}`);
                } else {
                    console.log(`✗ Error adding ${field.name}: ${e.message}`);
                }
            }
        }

        // Create passport_id index
        try {
            await db.execute(`CREATE INDEX IF NOT EXISTS qc_inspections_passport_id_idx ON qc_inspections (passport_id)`);
            console.log("✓ Created index: qc_inspections_passport_id_idx");
        } catch (e: any) {
            if (!e.message?.includes("already exists")) {
                console.log(`✗ Error creating index: ${e.message}`);
            }
        }

        // 4. Create device_refurbishments table
        console.log("\n📋 Creating device_refurbishments table...");

        try {
            await db.execute(`
                CREATE TABLE IF NOT EXISTS device_refurbishments (
                    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
                    passport_id TEXT NOT NULL REFERENCES device_passports(id) ON DELETE CASCADE,
                    store_id TEXT NOT NULL DEFAULT 'default' REFERENCES stores(id) ON DELETE CASCADE,
                    technician_id TEXT REFERENCES technicians(id) ON DELETE SET NULL,
                    activity_type TEXT NOT NULL,
                    description TEXT NOT NULL,
                    cost REAL DEFAULT 0,
                    component_replaced TEXT,
                    old_spec TEXT,
                    new_spec TEXT,
                    notes TEXT,
                    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
                )
            `);
            console.log("✓ Created table: device_refurbishments");

            // Create indexes
            const refurbIndexes = [
                { name: "device_refurbishments_passport_idx", col: "passport_id" },
                { name: "device_refurbishments_store_idx", col: "store_id" },
                { name: "device_refurbishments_technician_idx", col: "technician_id" },
                { name: "device_refurbishments_activity_idx", col: "activity_type" }
            ];

            for (const idx of refurbIndexes) {
                try {
                    await db.execute(`CREATE INDEX IF NOT EXISTS ${idx.name} ON device_refurbishments (${idx.col})`);
                    console.log(`✓ Created index: ${idx.name}`);
                } catch (e: any) {
                    if (!e.message?.includes("already exists")) {
                        console.log(`✗ Error creating index ${idx.name}: ${e.message}`);
                    }
                }
            }
        } catch (e: any) {
            if (e.message?.includes("already exists")) {
                console.log("○ Already exists: device_refurbishments table");
            } else {
                console.log(`✗ Error creating table: ${e.message}`);
            }
        }

        console.log("\n✅ Device Lifecycle Migration Complete!");
        console.log("\n📊 Summary:");
        console.log("   - Added hardware ID fields to device_passports (imei, mac_address, windows_key, etc.)");
        console.log("   - Added passport_id to warranty_claims for device-specific warranty tracking");
        console.log("   - Added detailed QC component checks to qc_inspections");
        console.log("   - Created device_refurbishments table for tracking repairs/upgrades");

    } catch (error: any) {
        console.error("\n❌ Migration failed:", error.message);
        process.exit(1);
    }
}

runMigration();
