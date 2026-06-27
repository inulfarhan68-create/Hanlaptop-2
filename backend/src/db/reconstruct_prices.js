const { createClient } = require('@libsql/client');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '../../../backend/.env');
dotenv.config({ path: envPath });

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;

const client = createClient({ url, authToken });

async function run() {
  const zeroIds = [
    '9330db9f-8399-44d2-89d5-e8e4502b8842', // ASUS VivoBook 14
    'daf2ca14-565e-42eb-af93-b22caaa59097', // Keyboard ASUS VivoBook
    '8bc738b0-481c-4b0a-b0f7-1a92e0959277', // RAM DDR4 8GB
    '2d526a50-803d-445e-ac02-1a555b6b4bc9', // MSI Modern 14
    '0a8ca82b-f221-4422-839c-cdb4acc1c06d', // Dell Latitude 5420
    '35e500bf-51eb-4f8b-a398-c83c234b4b21', // Dell Latitude 3540
    'd835b13c-512c-496a-991e-1de260ed2131'  // HP ProBook 440 G8
  ];

  console.log("Mencari transaksi penjualan/pembelian untuk merekonstruksi harga...");

  for (const id of zeroIds) {
    console.log(`\n==========================================`);
    
    // Ambil nama barang dulu
    const itemRes = await client.execute({
      sql: "SELECT item_name FROM inventory WHERE id = ?;",
      args: [id]
    });
    const itemName = itemRes.rows[0]?.item_name || id;
    console.log(`Barang: ${itemName} (${id})`);

    // Cari di transaction_items joined with transactions
    const txItemsRes = await client.execute({
      sql: `
        SELECT ti.quantity, ti.unit_price, t.transaction_type, t.transaction_date 
        FROM transaction_items ti
        JOIN transactions t ON ti.transaction_id = t.id
        WHERE ti.inventory_id = ?
        ORDER BY t.transaction_date DESC;
      `,
      args: [id]
    });

    console.log(`Ditemukan ${txItemsRes.rows.length} transaksi di transaction_items:`);
    txItemsRes.rows.forEach(row => {
      console.log(`- [${new Date(row.transaction_date).toISOString()}] ${row.transaction_type} | Qty: ${row.quantity} | Harga/Unit: Rp ${row.unit_price.toLocaleString('id-ID')}`);
    });
  }
}

run().catch(console.error);
