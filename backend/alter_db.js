import { createClient } from "@libsql/client";

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, ".env") });

const client = createClient({
  url: process.env.DATABASE_URL || "libsql://hanlatopbase11v2-farhan11.aws-ap-northeast-1.turso.io",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

async function main() {
  try {
    await client.execute("ALTER TABLE service_orders ADD COLUMN customer_address TEXT;");
    console.log("Column customer_address added successfully.");
  } catch (error) {
    console.error("Error or already exists:", error.message);
  }
}

main();
