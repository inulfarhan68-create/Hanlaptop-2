const { createClient } = require('@libsql/client');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '../../../backend/.env');
dotenv.config({ path: envPath });

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;

const client = createClient({ url, authToken });

async function run() {
  console.log("Membaca data service orders dari database Turso...");
  const res = await client.execute("SELECT id, customer_name, device_name, status, estimated_cost, final_cost, created_at FROM service_orders ORDER BY created_at DESC LIMIT 10;");
  console.log(`Ditemukan ${res.rows.length} service orders terbaru:`);
  res.rows.forEach(row => {
    console.log(`- [${row.id}] Customer: ${row.customer_name} | Unit: ${row.device_name} | Status: ${row.status}`);
  });

  console.log("\nMembaca log aktivitas terkait service_orders...");
  const logsRes = await client.execute("SELECT id, action, entity_id, details, created_at FROM activity_logs WHERE entity_type = 'service_orders' ORDER BY created_at DESC LIMIT 10;");
  console.log(`Ditemukan ${logsRes.rows.length} log aktivitas servis:`);
  logsRes.rows.forEach(log => {
    console.log(`- [${new Date(log.created_at).toISOString()}] Action: ${log.action} | ID: ${log.entity_id} | Details: ${log.details}`);
  });
}

run().catch(console.error);
