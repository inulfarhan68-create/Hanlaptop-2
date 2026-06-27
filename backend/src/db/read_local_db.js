const { createClient } = require('@libsql/client');
const path = require('path');

const dbPath = path.join(__dirname, '../../../data/han-laptop.db');
console.log("Membuka database lokal via libsql:", dbPath);

const client = createClient({
  url: `file:${dbPath}`
});

async function run() {
  const rowsRes = await client.execute("SELECT id, item_name, quantity, cost_price, selling_price FROM inventory;");
  const rows = rowsRes.rows;
  console.log(`Ditemukan ${rows.length} item di database lokal:`);
  rows.forEach(row => {
    console.log(`- [${row.id}] ${row.item_name} | Qty: ${row.quantity} | HPP: Rp ${row.cost_price.toLocaleString('id-ID')} | Jual: Rp ${row.selling_price.toLocaleString('id-ID')}`);
  });
}

run().catch(console.error);
