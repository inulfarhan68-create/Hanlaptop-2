import { NextResponse } from "next/server";
import { db as drizzleDb } from "@/db";
import { requireOwnerOnly } from "@/lib/auth-guard";
import { createClient } from "@libsql/client";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const authResult = await requireOwnerOnly();
    if (authResult instanceof NextResponse) return authResult;

    const client = createClient({
        url: process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || "",
        authToken: process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || "",
    });

    const results: string[] = [];

    const statements = [
        `ALTER TABLE inventory ADD COLUMN consignment_commission_rate REAL DEFAULT 10`,
        `ALTER TABLE qc_inspections ADD COLUMN screen_score INTEGER DEFAULT 100`,
        `ALTER TABLE qc_inspections ADD COLUMN battery_health INTEGER DEFAULT 100`,
        `ALTER TABLE qc_inspections ADD COLUMN keyboard_score INTEGER DEFAULT 100`,
        `ALTER TABLE qc_inspections ADD COLUMN usb_ports_score INTEGER DEFAULT 100`,
        `ALTER TABLE qc_inspections ADD COLUMN hinge_score INTEGER DEFAULT 100`,
        `ALTER TABLE qc_inspections ADD COLUMN wifi_score INTEGER DEFAULT 100`,
        `ALTER TABLE qc_inspections ADD COLUMN body_score INTEGER DEFAULT 100`,
        `ALTER TABLE qc_inspections ADD COLUMN max_selling_price REAL`,
        `ALTER TABLE qc_inspections ADD COLUMN warranty_days INTEGER`,
        `ALTER TABLE warranty_claims ADD COLUMN technician_id TEXT`,
        `ALTER TABLE warranty_claims ADD COLUMN service_order_id TEXT`,
        `CREATE INDEX IF NOT EXISTS warranty_claims_technician_id_idx ON warranty_claims(technician_id)`,
    ];

    for (const sql of statements) {
        try {
            await client.execute(sql);
            results.push(`✓ ${sql.substring(0, 70)}`);
        } catch (err: any) {
            const msg = err.message || '';
            if (msg.includes("duplicate column") || msg.includes("already exists")) {
                results.push(`⏭ Already exists: ${sql.substring(0, 55)}`);
            } else {
                results.push(`✗ Error: ${msg.substring(0, 80)} | ${sql.substring(0, 40)}`);
            }
        }
    }

    return NextResponse.json({ success: true, results });
}
