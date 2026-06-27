const { createClient } = require('@libsql/client');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '../../../backend/.env');
dotenv.config({ path: envPath });

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;

if (!url) {
  console.error("DATABASE_URL is not defined in .env!");
  process.exit(1);
}

const client = createClient({ url, authToken });

async function run() {
  console.log("Mencari data inventori yang mencurigakan (stok/harga = 0)...");
  
  const itemsRes = await client.execute("SELECT id, item_name, category, quantity, cost_price, selling_price, barcode FROM inventory;");
  const items = itemsRes.rows;
  console.log(`Total item di inventori: ${items.length}`);

  const zeroItems = items.filter(item => item.quantity === 0 && item.cost_price === 0 && item.selling_price === 0);
  console.log(`Item yang memiliki stok, HPP, dan Harga Jual = 0: ${zeroItems.length}`);
  
  for (const item of zeroItems) {
    console.log(`- [${item.id}] ${item.item_name} | Barcode: ${item.barcode}`);
    
    // Cari log aktivitas untuk item ini
    const logsRes = await client.execute({
      sql: "SELECT id, action, details, created_at FROM activity_logs WHERE entity_id = ? ORDER BY created_at DESC LIMIT 10;",
      args: [item.id]
    });
    
    console.log(`  Log aktivitas terdeteksi (${logsRes.rows.length}):`);
    logsRes.rows.forEach(log => {
      console.log(`    * [${new Date(log.created_at).toISOString()}] ${log.action}: ${log.details}`);
    });
  }
}

run().catch(console.error);
