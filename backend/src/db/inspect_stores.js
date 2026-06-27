const { createClient } = require('@libsql/client');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '../../../backend/.env');
dotenv.config({ path: envPath });

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;

const client = createClient({ url, authToken });

async function run() {
  const storesRes = await client.execute("SELECT id, name FROM stores;");
  console.log("Stores in database:");
  storesRes.rows.forEach(row => {
    console.log(`- ID: ${row.id}, Name: ${row.name}`);
  });
}

run().catch(console.error);
