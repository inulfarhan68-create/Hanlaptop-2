const { createClient } = require('@libsql/client');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;

const client = createClient({ url, authToken });

async function run() {
  const res = await client.execute(`SELECT id, name, email, role FROM "user";`);
  console.log('\nRegistered Users in Turso:');
  res.rows.forEach(r => {
    console.log(`- Name: ${r.name}, Email: ${r.email}, Role: ${r.role}`);
  });
}

run().catch(console.error);
