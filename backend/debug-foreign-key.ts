import { createClient } from '@libsql/client';
import { config } from 'dotenv';
config({ path: '.env' });

const db = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN!
});

async function check() {
    const invId = '3c64c61a-f38f-4d8c-94b7-657b02074efd';

    console.log('=== Checking inventory exists ===');
    try {
        const result = await db.execute({
            sql: 'SELECT id, item_name FROM inventory WHERE id = ?',
            args: [invId]
        });
        if (result.rows.length === 0) {
            console.log('Inventory ID NOT FOUND:', invId);
        } else {
            console.log('Inventory found:', result.rows[0]);
        }
    } catch (e: any) {
        console.log('Error:', e.message);
    }

    console.log('\n=== Checking recent transactions ===');
    try {
        const result = await db.execute({
            sql: 'SELECT id, transaction_type, created_at FROM transactions ORDER BY created_at DESC LIMIT 5'
        });
        console.log('Recent transactions:');
        result.rows.forEach((r: any) => console.log(' -', r.id, r.transaction_type));
    } catch (e: any) {
        console.log('Error:', e.message);
    }

    console.log('\n=== Checking table structure ===');
    try {
        // Check if there's an issue with foreign keys
        const result = await db.execute("PRAGMA foreign_key_check");
        console.log('Foreign key issues:', result.rows.length === 0 ? 'None' : result.rows);
    } catch (e: any) {
        console.log('Error:', e.message);
    }
}

check();
