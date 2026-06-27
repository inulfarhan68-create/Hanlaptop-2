const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

async function inspectDb(dbPath) {
  console.log(`\n========================================`);
  console.log(`INSPECTING: ${dbPath}`);
  console.log(`========================================`);
  
  if (!fs.existsSync(dbPath)) {
    console.log('File does not exist!');
    return;
  }
  
  const client = createClient({ url: `file:${dbPath}` });
  
  try {
    const tablesRes = await client.execute("SELECT name FROM sqlite_master WHERE type='table';");
    const tables = tablesRes.rows.map(r => r.name);
    console.log('Tables:', tables);

    for (const table of tables) {
      if (table.startsWith('_') || table === 'sqlite_sequence') continue;
      try {
        const countRes = await client.execute(`SELECT COUNT(*) as count FROM "${table}";`);
        console.log(`- ${table}: ${countRes.rows[0].count} rows`);
      } catch (e) {
        console.log(`- ${table}: failed to query (${e.message})`);
      }
    }
    
    // Fetch recent transactions
    try {
      const trxsRes = await client.execute(`SELECT id, amount, transaction_type, description, created_at FROM transactions ORDER BY created_at DESC LIMIT 5;`);
      console.log('\nRecent Transactions:');
      trxsRes.rows.forEach(r => {
        console.log(`  [${new Date(r.created_at * 1000).toLocaleString()}] ID: ${r.id}, Type: ${r.transaction_type}, Amount: ${r.amount}, Desc: ${r.description}`);
      });
    } catch (e) {
      console.log('No transaction data or query failed.');
    }
  } catch (e) {
    console.error('Inspection failed:', e.message);
  } finally {
    client.close();
  }
}

async function main() {
  await inspectDb(path.join(__dirname, 'local.db'));
  await inspectDb(path.join(__dirname, 'sqlite.db'));
  await inspectDb(path.join(__dirname, 'data/han-laptop.db'));
}

main().catch(console.error);
