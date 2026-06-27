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

const columns = [
  "wa_template_service_diterima",
  "wa_template_service_dikerjakan",
  "wa_template_service_menunggu_part",
  "wa_template_service_selesai",
  "wa_template_service_batal"
];

async function main() {
  for (const col of columns) {
    try {
      console.log(`Altering table to add column: ${col}...`);
      await client.execute(`ALTER TABLE store_settings ADD COLUMN ${col} TEXT;`);
      console.log(`Column ${col} added successfully.`);
    } catch (error) {
      console.log(`Column ${col} might already exist or error occurred: ${error.message}`);
    }
  }
  console.log("Migration finished.");
}

main();
