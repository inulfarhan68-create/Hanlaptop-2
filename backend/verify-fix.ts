import { createClient } from '@libsql/client';
import { config } from 'dotenv';
config({ path: '.env' });

const db = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN!
});

async function verify() {
    console.log('=== Verifying transaction_items foreign keys ===');

    const remaining = await db.execute(`
        SELECT COUNT(*) as cnt FROM transaction_items ti
        LEFT JOIN inventory i ON ti.inventory_id = i.id
        WHERE ti.inventory_id IS NOT NULL AND i.id IS NULL
    `);
    console.log(`Orphaned transaction_items (should be 0): ${remaining.rows[0].cnt}`);

    // Test if we can insert now
    console.log('\n=== Testing insert capability ===');
    try {
        // Get a valid inventory ID
        const inv = await db.execute('SELECT id FROM inventory LIMIT 1');
        if (inv.rows.length === 0) {
            console.log('No inventory items found for testing');
            return;
        }
        const validInvId = inv.rows[0].id as string;

        // Get a valid transaction ID
        const tx = await db.execute('SELECT id FROM transactions LIMIT 1');
        const validTxId = tx.rows[0].id as string;

        // Test insert
        await db.execute({
            sql: 'INSERT INTO transaction_items (id, transaction_id, inventory_id, quantity, unit_price, serial_numbers) VALUES (?, ?, ?, ?, ?, ?)',
            args: [
                crypto.randomUUID(),
                validTxId,
                validInvId,
                1,
                100000,
                '["TEST-SERIAL"]'
            ]
        });
        console.log('✓ Test insert with serial_numbers SUCCESS');
    } catch (e: any) {
        console.log('✗ Test insert FAILED:', e.message);
    }

    console.log('\n=== Done ===');
}

verify();
