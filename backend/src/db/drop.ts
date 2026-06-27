import { createClient } from "@libsql/client";
import { config } from "dotenv";
config();

const client = createClient({
  url: process.env.DATABASE_URL as string,
  authToken: process.env.DATABASE_AUTH_TOKEN as string,
});

async function run() {
  await client.execute("DROP TABLE IF EXISTS store_settings;");
  console.log("Dropped table");
  process.exit(0);
}

run();
