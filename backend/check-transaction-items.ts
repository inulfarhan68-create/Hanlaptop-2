import { createClient } from '@libsql/client';
import { config } from 'dotenv';
config({ path: '.env' });

const db = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN!
});

async function check() {
    console.log('=== transaction_items table ===');
    try {
        const result = await db.execute("PRAGMA table_info(transaction_items)");
        console.log('Columns:', result.rows.map((r: any) => `${r.name} (${r.type})`).join(', '));
    } catch (e: any) {
        console.log('Error:', e.message);
    }

    console.log('\n=== Testing insert ===');
    try {
        // Test inserting with serial_numbers
        await db.execute({
            sql: 'INSERT INTO transaction_items (id, transaction_id, inventory_id, quantity, unit_price, serial_numbers) VALUES (?, ?, ?, ?, ?, ?)',
            args: [
                crypto.randomUUID(),
                'test-tx-id',
                'test-inv-id',
                1,
                100000,
                '["TEST123"]'
            ]
        });
        console.log('Insert with serial_numbers SUCCESS');
    } catch (e: any) {
        console.log('Insert with serial_numbers FAILED:', e.message);
    }
}

check();
