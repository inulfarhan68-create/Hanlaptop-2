import { createClient } from '@libsql/client';
import { config } from 'dotenv';
config({ path: '.env' });

const db = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN!
});

async function check() {
    const invId = 'aeed0f2d-5b98-4f53-9586-f603526cea34';

    console.log('=== Checking specific inventory ID ===');
    console.log('Inventory ID:', invId);

    try {
        const result = await db.execute({
            sql: 'SELECT id, item_name, deleted_at FROM inventory WHERE id = ?',
            args: [invId]
        });
        if (result.rows.length === 0) {
            console.log('❌ Inventory ID NOT FOUND');
        } else {
            console.log('✓ Inventory found:', result.rows[0]);
        }
    } catch (e: any) {
        console.log('Error:', e.message);
    }

    console.log('\n=== Checking ALL inventory IDs in recent transactions ===');

    // Get all transaction_items and check their inventory references
    const items = await db.execute(`
        SELECT ti.id, ti.inventory_id, ti.transaction_id, ti.serial_numbers,
               i.id as inv_exists
        FROM transaction_items ti
        LEFT JOIN inventory i ON ti.inventory_id = i.id
        ORDER BY rowid DESC
        LIMIT 20
    `);

    console.log('Recent transaction_items:');
    items.rows.forEach((r: any, idx: number) => {
        const status = r.inv_exists ? '✓' : '❌ ORPHAN';
        console.log(`${idx + 1}. ${status} Item ID: ${r.id}, Inv ID: ${r.inventory_id}, SN: ${r.serial_numbers}`);
    });

    // Check if there are orphaned items
    const orphans = await db.execute(`
        SELECT COUNT(*) as cnt FROM transaction_items ti
        LEFT JOIN inventory i ON ti.inventory_id = i.id
        WHERE ti.inventory_id IS NOT NULL AND i.id IS NULL
    `);
    console.log(`\nTotal orphaned items: ${orphans.rows[0].cnt}`);

    // Check deleted items
    const deletedInv = await db.execute(`
        SELECT COUNT(*) as cnt FROM inventory WHERE deleted_at IS NOT NULL
    `);
    console.log(`Soft-deleted inventory items: ${deletedInv.rows[0].cnt}`);
}

check();
