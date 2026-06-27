const { createClient } = require('@libsql/client');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;

const client = createClient({ url, authToken });

async function run() {
  const res = await client.execute(`SELECT id, name, slug FROM stores;`);
  console.log('\nBranches and their Slugs:');
  res.rows.forEach(r => {
    console.log(`- Cabang: "${r.name}", Slug: "${r.slug || 'null'}", ID: "${r.id}"`);
  });
}

run().catch(console.error);
