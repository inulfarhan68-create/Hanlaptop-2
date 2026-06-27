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

  console.log("Mencari log aktivitas yang lebih detail untuk barang-barang ini...");

  for (const id of zeroIds) {
    console.log(`\n==========================================`);
    console.log(`ID: ${id}`);
    
    // 1. Cari berdasarkan entity_id
    const res1 = await client.execute({
      sql: "SELECT id, action, details, created_at FROM activity_logs WHERE entity_id = ? ORDER BY created_at ASC;",
      args: [id]
    });
    console.log(`Berdasarkan entity_id (${res1.rows.length} log):`);
    res1.rows.forEach(log => {
      console.log(`- [${new Date(log.created_at).toISOString()}] ${log.action}: ${log.details}`);
    });

    // 2. Cari berdasarkan string matching pada kolom details
    const res2 = await client.execute({
      sql: "SELECT id, action, details, created_at FROM activity_logs WHERE details LIKE ? ORDER BY created_at ASC;",
      args: [`%${id}%`]
    });
    console.log(`Berdasarkan ID di dalam details (${res2.rows.length} log):`);
    res2.rows.forEach(log => {
      console.log(`- [${new Date(log.created_at).toISOString()}] ${log.action}: ${log.details}`);
    });
  }
}

run().catch(console.error);
