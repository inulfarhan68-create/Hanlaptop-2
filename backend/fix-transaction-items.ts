import { createClient } from '@libsql/client';
import { config } from 'dotenv';
config({ path: '.env' });

const db = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN!
});

async function migrate() {
    console.log('Adding serial_numbers column to transaction_items...');
    try {
        await db.execute('ALTER TABLE transaction_items ADD COLUMN serial_numbers TEXT');
        console.log('✓ Added serial_numbers column');
    } catch (e: any) {
        if (e.message?.includes('duplicate column') || e.message?.includes('already exists')) {
            console.log('○ Column already exists');
        } else {
            console.log('✗ Error:', e.message);
        }
    }

    // Verify column exists
    try {
        const result = await db.execute("PRAGMA table_info(transaction_items)");
        const columns = result.rows.map((row: any) => row.name);
        console.log('Current columns:', columns.join(', '));
        if (columns.includes('serial_numbers')) {
            console.log('✓ serial_numbers column verified');
        } else {
            console.log('✗ serial_numbers column NOT found!');
        }
    } catch (e: any) {
        console.log('✗ Error verifying:', e.message);
    }
}

migrate();
