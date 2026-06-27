import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;

let client;

if (url && url.startsWith("libsql://")) {
  console.log("Connecting to production Turso database...");
  client = createClient({
    url: url,
    authToken: authToken,
  });
} else {
  console.log("DATABASE_URL is not set to Turso. Checking local SQLite db...");
  const dbPath = path.join(process.cwd(), "data", "han-laptop.db");
  console.log(`Local DB Path: ${dbPath}`);
  
  // Make sure directory exists
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
  }
  
  client = createClient({
    url: `file:${dbPath}`,
  });
}

async function main() {
  try {
    console.log("Creating table: suppliers...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        notes TEXT,
        created_at INTEGER NOT NULL
      );
    `);
    console.log("Table suppliers created successfully.");
  } catch (error) {
    console.error("Error creating suppliers table:", error.message);
  }

  try {
    console.log("Creating table: technicians...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS technicians (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        phone TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL
      );
    `);
    console.log("Table technicians created successfully.");
  } catch (error) {
    console.error("Error creating technicians table:", error.message);
  }

  try {
    console.log("Adding column supplier_id to transactions...");
    await client.execute(`
      ALTER TABLE transactions ADD COLUMN supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL;
    `);
    console.log("Column supplier_id added to transactions.");
  } catch (error) {
    console.log("Column supplier_id might already exist or error occurred:", error.message);
  }

  try {
    console.log("Adding column technician_id to service_orders...");
    await client.execute(`
      ALTER TABLE service_orders ADD COLUMN technician_id TEXT REFERENCES technicians(id) ON DELETE SET NULL;
    `);
    console.log("Column technician_id added to service_orders.");
  } catch (error) {
    console.log("Column technician_id might already exist or error occurred:", error.message);
  }

  console.log("Migration finished.");
}

main();
