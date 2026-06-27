const { createClient } = require('@libsql/client');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;

const client = createClient({ url, authToken });

async function run() {
  const res = await client.execute(`SELECT * FROM "user";`);
  console.log('\nUser details in Turso:');
  res.rows.forEach(r => {
    console.log(JSON.stringify(r, null, 2));
  });
}

run().catch(console.error);
