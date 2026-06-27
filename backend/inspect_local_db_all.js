const { createClient } = require('@libsql/client');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'han-laptop.db');
const client = createClient({
  url: `file:${dbPath}`,
});

async function run() {
  try {
    const tablesRes = await client.execute(`SELECT name FROM sqlite_master WHERE type='table';`);
    console.log('\nTables in local SQLite:');
    for (const row of tablesRes.rows) {
      const tableName = row.name;
      if (tableName.startsWith('_')) continue;
      const countRes = await client.execute(`SELECT COUNT(*) as count FROM "${tableName}";`);
      console.log(`- Table: ${tableName} | Rows: ${countRes.rows[0].count}`);
    }
  } catch (e) {
    console.error("Error reading local db tables:", e);
  }
}

run().catch(console.error);
