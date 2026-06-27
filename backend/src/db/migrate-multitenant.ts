import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;

let client: any;

if (url && url.startsWith("libsql://")) {
  client = createClient({ url, authToken });
} else {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  client = createClient({ url: `file:${path.join(dataDir, "han-laptop.db")}` });
}

async function runMigration() {
  try {
    console.log("Starting Multi-Tenancy Migration...");

    // 1. Create new tables
    await client.execute(`
      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    console.log("Created organizations table");

    await client.execute(`
      CREATE TABLE IF NOT EXISTS stores (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    console.log("Created stores table");

    await client.execute(`
      CREATE TABLE IF NOT EXISTS user_store_access (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'kasir',
        created_at INTEGER NOT NULL
      )
    `);
    console.log("Created user_store_access table");

    // 2. Insert Default Organization & Store
    const now = Date.now();
    await client.execute({
      sql: `INSERT INTO organizations (id, name, created_at, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`,
      args: ['org-default', 'HanLaptop Organization', now, now]
    });
    
    await client.execute({
      sql: `INSERT INTO stores (id, organization_id, name, address, phone, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`,
      args: ['default', 'org-default', 'Cabang Utama', 'Jl. Komputer Raya No.123', '0812-3456-7890', 1, now, now]
    });
    console.log("Inserted default organization and store");

    // 3. Add store_id to existing tables (ignoring errors if columns already exist)
    const tablesToAlter = [
      'inventory',
      'customers',
      'transactions',
      'journal_entries',
      'activity_logs',
      'service_orders'
    ];

    for (const table of tablesToAlter) {
      try {
        await client.execute(`ALTER TABLE ${table} ADD COLUMN store_id TEXT NOT NULL DEFAULT 'default'`);
        console.log(`Added store_id to ${table}`);
      } catch (err: any) {
        if (err.message.includes('duplicate column name')) {
          console.log(`Column store_id already exists in ${table}, skipping.`);
        } else {
          console.error(`Error adding store_id to ${table}:`, err.message);
        }
      }
    }

    // 4. Drop and recreate store_settings to change primary key
    try {
      await client.execute(`DROP TABLE IF EXISTS store_settings`);
      await client.execute(`
        CREATE TABLE store_settings (
          store_id TEXT PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
          store_name TEXT NOT NULL DEFAULT 'HanLaptop',
          store_address TEXT NOT NULL DEFAULT 'Jl. Komputer Raya No.123',
          store_phone TEXT NOT NULL DEFAULT '0812-3456-7890',
          store_logo TEXT,
          store_signature TEXT,
          store_footer TEXT DEFAULT 'Terima kasih atas kunjungan Anda.\nBarang yang sudah dibeli\ntidak dapat ditukar/dikembalikan.',
          wa_template_piutang TEXT DEFAULT 'Halo Kak {nama}, sekadar mengingatkan bahwa ada tagihan dari *{toko}* untuk nota *{nota}* senilai *{sisa}* yang jatuh tempo pada *{tempo}*. Terima kasih.',
          wa_template_umum TEXT DEFAULT 'Halo Kak {nama}, ini dengan *{toko}*. ',
          wa_template_nota TEXT,
          store_banks TEXT,
          updated_at INTEGER NOT NULL
        )
      `);
      await client.execute({
        sql: `INSERT INTO store_settings (store_id, updated_at) VALUES (?, ?)`,
        args: ['default', now]
      });
      console.log("Recreated store_settings with store_id primary key");
    } catch (err: any) {
      console.error("Error recreating store_settings:", err.message);
    }

    // 5. Assign all existing users to the default store as 'owner'
    // First get all users
    try {
      const users = await client.execute(`SELECT id FROM user`);
      for (const u of users.rows) {
        await client.execute({
          sql: `INSERT INTO user_store_access (id, user_id, store_id, role, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
          args: [crypto.randomUUID(), u.id, 'default', 'owner', now]
        });
      }
      console.log(`Assigned ${users.rows.length} existing users to default store as owner`);
    } catch (err: any) {
      console.error("Error assigning users to default store:", err.message);
    }

    console.log("Migration Complete! 🎉");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

runMigration();
