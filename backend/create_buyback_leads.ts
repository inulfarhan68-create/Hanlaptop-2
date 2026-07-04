import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const client = createClient({
  url: process.env.DATABASE_URL as string,
  authToken: process.env.DATABASE_AUTH_TOKEN as string
});

async function main() {
  try {
    console.log("Creating buyback_leads table in Turso database...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "buyback_leads" (
        "id" text PRIMARY KEY NOT NULL,
        "store_id" text DEFAULT 'default' NOT NULL,
        "customer_name" text NOT NULL,
        "customer_phone" text NOT NULL,
        "brand" text NOT NULL,
        "processor" text NOT NULL,
        "ram" text NOT NULL,
        "storage" text NOT NULL,
        "condition" text NOT NULL,
        "completeness" text NOT NULL,
        "estimated_market_price" real DEFAULT 0 NOT NULL,
        "estimated_offer_price_min" real DEFAULT 0 NOT NULL,
        "estimated_offer_price_max" real DEFAULT 0 NOT NULL,
        "status" text DEFAULT 'PENDING' NOT NULL,
        "type" text DEFAULT 'JUAL_LAPTOP' NOT NULL,
        "target_laptop_name" text,
        "target_laptop_price" real,
        "created_at" integer NOT NULL,
        FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON UPDATE no action ON DELETE cascade
      );
    `);
    
    console.log("Creating indexes for buyback_leads...");
    await client.execute(`CREATE INDEX IF NOT EXISTS "buyback_leads_store_id_idx" ON "buyback_leads" ("store_id");`);
    await client.execute(`CREATE INDEX IF NOT EXISTS "buyback_leads_status_idx" ON "buyback_leads" ("status");`);
    await client.execute(`CREATE INDEX IF NOT EXISTS "buyback_leads_type_idx" ON "buyback_leads" ("type");`);

    console.log("buyback_leads table and indexes created successfully!");
  } catch (error: any) {
    console.error("Migration failed:", error.message);
  }
}

main();
