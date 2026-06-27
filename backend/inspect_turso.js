const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;

console.log('Connecting to Turso:', url);

const client = createClient({ url, authToken });

async function run() {
  // List all tables
  const tablesRes = await client.execute("SELECT name FROM sqlite_master WHERE type='table';");
  const tables = tablesRes.rows.map(r => r.name);
  console.log('\nTables in database:', tables);

  // Count rows in each table
  for (const table of tables) {
    if (table.startsWith('_') || table === 'sqlite_sequence') continue;
    try {
      const countRes = await client.execute(`SELECT COUNT(*) as count FROM "${table}";`);
      console.log(`- ${table}: ${countRes.rows[0].count} rows`);
    } catch (e) {
      console.log(`- ${table}: failed to query (${e.message})`);
    }
  }

  // Fetch recent transactions
  try {
    const trxsRes = await client.execute(`SELECT id, amount, transaction_type, description, created_at FROM transactions ORDER BY created_at DESC LIMIT 5;`);
    console.log('\nRecent Transactions:');
    trxsRes.rows.forEach(r => {
      console.log(`  [${new Date(r.created_at * 1000).toLocaleString()}] ID: ${r.id}, Type: ${r.transaction_type}, Amount: ${r.amount}, Desc: ${r.description}`);
    });
  } catch (e) {
    console.log('Failed to fetch recent transactions:', e.message);
  }

  // Fetch recent store settings / stores
  try {
    const storesRes = await client.execute(`SELECT id, name FROM stores;`);
    console.log('\nStores:');
    storesRes.rows.forEach(r => {
      console.log(`  ID: ${r.id}, Name: ${r.name}`);
    });
  } catch (e) {
    console.log('Failed to fetch stores:', e.message);
  }
}

run().catch(console.error);
