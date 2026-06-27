const { createClient } = require('@libsql/client');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'han-laptop.db');
const client = createClient({
  url: `file:${dbPath}`,
});

async function run() {
  try {
    const res = await client.execute(`SELECT COUNT(*) as count FROM inventory;`);
    console.log(`\nFound ${res.rows[0].count} inventory items in local SQLite file.`);
    
    const sample = await client.execute(`SELECT id, item_name, category, quantity, selling_price FROM inventory LIMIT 5;`);
    console.log('Sample items:');
    sample.rows.forEach(r => {
      console.log(`- ${r.item_name} (${r.category}) | Qty: ${r.quantity} | Jual: ${r.selling_price}`);
    });
  } catch (e) {
    console.error("Error reading local db:", e);
  }
}

run().catch(console.error);
