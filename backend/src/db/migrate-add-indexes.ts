/**
 * SaaS Performance Optimization: Add Missing Database Indexes
 *
 * This migration adds critical indexes to improve query performance
 * for multi-tenant SaaS workloads.
 *
 * Run with: npx tsx src/db/migrate-add-indexes.ts
 */

import { createClient } from "@libsql/client";

// Configuration - adjust for your environment
const DATABASE_URL = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:local.db";
const AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || undefined;

async function runSQL(sql: string, description: string): Promise<void> {
    console.log(`\n📊 ${description}...`);
    try {
        const client = createClient({
            url: DATABASE_URL,
            authToken: AUTH_TOKEN,
        });

        await client.executeMultiple(sql);
        console.log(`   ✅ ${description} - DONE`);
        client.close();
    } catch (error: any) {
        console.error(`   ❌ ${description} - FAILED: ${error.message}`);
        throw error;
    }
}

async function indexExists(tableName: string, indexName: string): Promise<boolean> {
    try {
        const client = createClient({
            url: DATABASE_URL,
            authToken: AUTH_TOKEN,
        });

        const result = await client.execute({
            sql: `SELECT name FROM sqlite_master WHERE type='index' AND name=?`,
            args: [indexName]
        });

        client.close();
        return result.rows.length > 0;
    } catch {
        return false;
    }
}

async function tableExists(tableName: string): Promise<boolean> {
    try {
        const client = createClient({
            url: DATABASE_URL,
            authToken: AUTH_TOKEN,
        });

        const result = await client.execute({
            sql: `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
            args: [tableName]
        });

        client.close();
        return result.rows.length > 0;
    } catch {
        return false;
    }
}

async function main() {
    console.log("🚀 Starting Database Index Migration...");
    console.log(`   Database URL: ${DATABASE_URL.replace(/\/\/.*@/, "//***@")}`);

    // Track migrations
    let migrationsRun = 0;
    let migrationsSkipped = 0;

    // ============================================
    // CRITICAL: audit_logs - NO INDEXES AT ALL
    // ============================================
    if (await tableExists("audit_logs")) {
        const indexes = [
            {
                name: "audit_logs_store_id_idx",
                sql: "CREATE INDEX IF NOT EXISTS audit_logs_store_id_idx ON audit_logs(store_id)",
                desc: "Index on store_id for multi-tenant queries"
            },
            {
                name: "audit_logs_user_id_idx",
                sql: "CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON audit_logs(user_id)",
                desc: "Index on user_id for user activity lookups"
            },
            {
                name: "audit_logs_entity_idx",
                sql: "CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs(entity)",
                desc: "Index on entity for filtering by entity type"
            },
            {
                name: "audit_logs_created_at_idx",
                sql: "CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at)",
                desc: "Index on created_at for time-based queries"
            },
            {
                name: "audit_logs_store_created_idx",
                sql: "CREATE INDEX IF NOT EXISTS audit_logs_store_created_idx ON audit_logs(store_id, created_at)",
                desc: "Composite index for store + time queries"
            }
        ];

        for (const idx of indexes) {
            if (await indexExists("audit_logs", idx.name)) {
                console.log(`   ⏭️  ${idx.name} - already exists, skipping`);
                migrationsSkipped++;
            } else {
                await runSQL(idx.sql, idx.desc);
                migrationsRun++;
            }
        }
    } else {
        console.log("\n⚠️  Table audit_logs does not exist, skipping");
    }

    // ============================================
    // HIGH: inventory - missing critical indexes
    // ============================================
    if (await tableExists("inventory")) {
        const indexes = [
            {
                name: "inventory_deleted_at_idx",
                sql: "CREATE INDEX IF NOT EXISTS inventory_deleted_at_idx ON inventory(deleted_at)",
                desc: "Index on deleted_at for soft delete queries"
            },
            {
                name: "inventory_barcode_idx",
                sql: "CREATE INDEX IF NOT EXISTS inventory_barcode_idx ON inventory(barcode)",
                desc: "Index on barcode for SKU/serial lookups"
            },
            {
                name: "inventory_condition_idx",
                sql: "CREATE INDEX IF NOT EXISTS inventory_condition_idx ON inventory(condition)",
                desc: "Index on condition for filtering by item condition"
            },
            {
                name: "inventory_published_idx",
                sql: "CREATE INDEX IF NOT EXISTS inventory_published_idx ON inventory(is_published)",
                desc: "Index on is_published for catalog filtering"
            },
            {
                name: "inventory_store_active_idx",
                sql: "CREATE INDEX IF NOT EXISTS inventory_store_active_idx ON inventory(store_id, deleted_at)",
                desc: "Composite index for store + active items"
            }
        ];

        for (const idx of indexes) {
            if (await indexExists("inventory", idx.name)) {
                console.log(`   ⏭️  ${idx.name} - already exists, skipping`);
                migrationsSkipped++;
            } else {
                await runSQL(idx.sql, idx.desc);
                migrationsRun++;
            }
        }
    }

    // ============================================
    // CRITICAL: customers - missing deletedAt
    // ============================================
    if (await tableExists("customers")) {
        const idx = {
            name: "customers_deleted_at_idx",
            sql: "CREATE INDEX IF NOT EXISTS customers_deleted_at_idx ON customers(deleted_at)",
            desc: "Index on deleted_at for customers soft delete"
        };

        if (await indexExists("customers", idx.name)) {
            console.log(`   ⏭️  ${idx.name} - already exists, skipping`);
            migrationsSkipped++;
        } else {
            await runSQL(idx.sql, idx.desc);
            migrationsRun++;
        }
    }

    // ============================================
    // CRITICAL: suppliers - missing deletedAt
    // ============================================
    if (await tableExists("suppliers")) {
        const idx = {
            name: "suppliers_deleted_at_idx",
            sql: "CREATE INDEX IF NOT EXISTS suppliers_deleted_at_idx ON suppliers(deleted_at)",
            desc: "Index on deleted_at for suppliers soft delete"
        };

        if (await indexExists("suppliers", idx.name)) {
            console.log(`   ⏭️  ${idx.name} - already exists, skipping`);
            migrationsSkipped++;
        } else {
            await runSQL(idx.sql, idx.desc);
            migrationsRun++;
        }
    }

    // ============================================
    // HIGH: transactions - missing common filter indexes
    // ============================================
    if (await tableExists("transactions")) {
        const indexes = [
            {
                name: "transaction_is_voided_idx",
                sql: "CREATE INDEX IF NOT EXISTS transaction_is_voided_idx ON transactions(is_voided)",
                desc: "Index on is_voided for filtering active/voided"
            },
            {
                name: "transaction_type_idx",
                sql: "CREATE INDEX IF NOT EXISTS transaction_type_idx ON transactions(transaction_type)",
                desc: "Index on transaction_type for type filtering"
            },
            {
                name: "transaction_payment_status_idx",
                sql: "CREATE INDEX IF NOT EXISTS transaction_payment_status_idx ON transactions(payment_status)",
                desc: "Index on payment_status for Lunas/Belum Lunas"
            },
            {
                name: "transaction_user_id_idx",
                sql: "CREATE INDEX IF NOT EXISTS transaction_user_id_idx ON transactions(user_id)",
                desc: "Index on user_id for cashier performance"
            }
        ];

        for (const idx of indexes) {
            if (await indexExists("transactions", idx.name)) {
                console.log(`   ⏭️  ${idx.name} - already exists, skipping`);
                migrationsSkipped++;
            } else {
                await runSQL(idx.sql, idx.desc);
                migrationsRun++;
            }
        }
    }

    // ============================================
    // HIGH: warranty_claims - missing status/customerId
    // ============================================
    if (await tableExists("warranty_claims")) {
        const indexes = [
            {
                name: "warranty_claims_status_idx",
                sql: "CREATE INDEX IF NOT EXISTS warranty_claims_status_idx ON warranty_claims(status)",
                desc: "Index on status for claim workflow"
            },
            {
                name: "warranty_claims_customer_id_idx",
                sql: "CREATE INDEX IF NOT EXISTS warranty_claims_customer_id_idx ON warranty_claims(customer_id)",
                desc: "Index on customer_id for customer history"
            }
        ];

        for (const idx of indexes) {
            if (await indexExists("warranty_claims", idx.name)) {
                console.log(`   ⏭️  ${idx.name} - already exists, skipping`);
                migrationsSkipped++;
            } else {
                await runSQL(idx.sql, idx.desc);
                migrationsRun++;
            }
        }
    }

    // ============================================
    // MEDIUM: session cleanup indexes
    // ============================================
    if (await tableExists("session")) {
        const indexes = [
            {
                name: "session_expires_at_idx",
                sql: "CREATE INDEX IF NOT EXISTS session_expires_at_idx ON session(expires_at)",
                desc: "Index on expires_at for session cleanup"
            },
            {
                name: "session_user_id_idx",
                sql: "CREATE INDEX IF NOT EXISTS session_user_id_idx ON session(user_id)",
                desc: "Index on user_id for user sessions"
            }
        ];

        for (const idx of indexes) {
            if (await indexExists("session", idx.name)) {
                console.log(`   ⏭️  ${idx.name} - already exists, skipping`);
                migrationsSkipped++;
            } else {
                await runSQL(idx.sql, idx.desc);
                migrationsRun++;
            }
        }
    }

    // ============================================
    // MEDIUM: qc_inspections indexes
    // ============================================
    if (await tableExists("qc_inspections")) {
        const indexes = [
            {
                name: "qc_inspections_technician_id_idx",
                sql: "CREATE INDEX IF NOT EXISTS qc_inspections_technician_id_idx ON qc_inspections(technician_id)",
                desc: "Index on technician_id for technician history"
            },
            {
                name: "qc_inspections_created_at_idx",
                sql: "CREATE INDEX IF NOT EXISTS qc_inspections_created_at_idx ON qc_inspections(created_at)",
                desc: "Index on created_at for timeline ordering"
            }
        ];

        for (const idx of indexes) {
            if (await indexExists("qc_inspections", idx.name)) {
                console.log(`   ⏭️  ${idx.name} - already exists, skipping`);
                migrationsSkipped++;
            } else {
                await runSQL(idx.sql, idx.desc);
                migrationsRun++;
            }
        }
    }

    // ============================================
    // Summary
    // ============================================
    console.log("\n" + "=".repeat(50));
    console.log("📈 Migration Summary:");
    console.log(`   ✅ Indexes created: ${migrationsRun}`);
    console.log(`   ⏭️  Indexes skipped (already exist): ${migrationsSkipped}`);
    console.log("=".repeat(50));

    if (migrationsRun > 0) {
        console.log("\n🎉 Database optimization complete!");
        console.log("   These indexes will significantly improve:");
        console.log("   - Dashboard load times");
        console.log("   - Transaction history pagination");
        console.log("   - Inventory search performance");
        console.log("   - Audit log queries");
        console.log("   - Multi-tenant isolation checks");
    } else {
        console.log("\nℹ️  All indexes already exist. Database is optimized!");
    }
}

main().catch((error) => {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
});
