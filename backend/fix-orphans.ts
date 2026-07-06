import { createClient } from '@libsql/client';
import { config } from 'dotenv';
config({ path: '.env' });

const db = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN!
});

async function fixOrphans() {
    console.log('=== Finding orphaned transaction_items ===');

    // Find transaction_items with invalid inventory_id
    const orphanItems = await db.execute(`
        SELECT ti.id, ti.inventory_id, ti.transaction_id
        FROM transaction_items ti
        LEFT JOIN inventory i ON ti.inventory_id = i.id
        WHERE ti.inventory_id IS NOT NULL AND i.id IS NULL
    `);

    console.log(`Found ${orphanItems.rows.length} orphaned transaction_items`);
    if (orphanItems.rows.length > 0) {
        console.log('Sample orphaned IDs:', orphanItems.rows.slice(0, 5));
    }

    // Find orphaned qc_inspections
    const orphanQC = await db.execute(`
        SELECT qi.id, qi.inventory_id
        FROM qc_inspections qi
        LEFT JOIN inventory i ON qi.inventory_id = i.id
        WHERE qi.inventory_id IS NOT NULL AND i.id IS NULL
    `);

    console.log(`Found ${orphanQC.rows.length} orphaned qc_inspections`);

    console.log('\n=== Fixing orphaned records ===');

    // Option 1: Set inventory_id to NULL for orphaned items (preserves transaction history)
    if (orphanItems.rows.length > 0) {
        const result = await db.execute(`
            UPDATE transaction_items
            SET inventory_id = NULL
            WHERE id IN (
                SELECT ti.id
                FROM transaction_items ti
                LEFT JOIN inventory i ON ti.inventory_id = i.id
                WHERE ti.inventory_id IS NOT NULL AND i.id IS NULL
            )
        `);
        console.log(`Fixed ${orphanItems.rows.length} orphaned transaction_items (set inventory_id to NULL)`);
    }

    // Option 2: Set inventory_id to NULL for orphaned QC
    if (orphanQC.rows.length > 0) {
        const result = await db.execute(`
            UPDATE qc_inspections
            SET inventory_id = NULL
            WHERE id IN (
                SELECT qi.id
                FROM qc_inspections qi
                LEFT JOIN inventory i ON qi.inventory_id = i.id
                WHERE qi.inventory_id IS NOT NULL AND i.id IS NULL
            )
        `);
        console.log(`Fixed ${orphanQC.rows.length} orphaned qc_inspections (set inventory_id to NULL)`);
    }

    console.log('\n=== Verifying fix ===');
    const remaining = await db.execute(`
        SELECT COUNT(*) as cnt FROM transaction_items ti
        LEFT JOIN inventory i ON ti.inventory_id = i.id
        WHERE ti.inventory_id IS NOT NULL AND i.id IS NULL
    `);
    console.log(`Remaining orphaned transaction_items: ${remaining.rows[0].cnt}`);

    const remainingQC = await db.execute(`
        SELECT COUNT(*) as cnt FROM qc_inspections qi
        LEFT JOIN inventory i ON qi.inventory_id = i.id
        WHERE qi.inventory_id IS NOT NULL AND i.id IS NULL
    `);
    console.log(`Remaining orphaned qc_inspections: ${remainingQC.rows[0].cnt}`);
}

fixOrphans();
