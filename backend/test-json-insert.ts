import { createClient } from '@libsql/client';
import { config } from 'dotenv';
config({ path: '.env' });

const db = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN!
});

async function test() {
    console.log('Testing JSON string insert...');

    // First check what transaction_items columns exist
    try {
        const columns = await db.execute("PRAGMA table_info(transaction_items)");
        console.log('Columns:', columns.rows.map((r: any) => r.name).join(', '));
    } catch (e: any) {
        console.log('Error checking columns:', e.message);
    }

    // Try to insert with JSON string
    try {
        const result = await db.execute({
            sql: 'INSERT INTO transaction_items (id, transaction_id, inventory_id, quantity, unit_price, serial_numbers) VALUES (?, ?, ?, ?, ?, ?)',
            args: [
                crypto.randomUUID(),
                'test-tx-id',
                'test-inv-id',
                1,
                100000,
                JSON.stringify(['PF60QB1K'])
            ]
        });
        console.log('Insert result:', JSON.stringify(result));
    } catch (e: any) {
        console.log('Error inserting:', e.message);
    }
}

test();
