import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: "./backend/.env" });

const client = createClient({
  url: process.env.DATABASE_URL as string,
  authToken: process.env.DATABASE_AUTH_TOKEN as string
});

async function main() {
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "user" (
        "id" text PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "email" text NOT NULL,
        "email_verified" integer NOT NULL,
        "image" text,
        "role" text DEFAULT 'kasir' NOT NULL,
        "created_at" integer NOT NULL,
        "updated_at" integer NOT NULL
      );
    `);
    await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS "user_email_unique" ON "user" ("email");`);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS "session" (
        "id" text PRIMARY KEY NOT NULL,
        "expires_at" integer NOT NULL,
        "token" text NOT NULL,
        "created_at" integer NOT NULL,
        "updated_at" integer NOT NULL,
        "ip_address" text,
        "user_agent" text,
        "user_id" text NOT NULL,
        FOREIGN KEY ("user_id") REFERENCES "user"("id") ON UPDATE no action ON DELETE no action
      );
    `);
    await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS "session_token_unique" ON "session" ("token");`);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS "account" (
        "id" text PRIMARY KEY NOT NULL,
        "account_id" text NOT NULL,
        "provider_id" text NOT NULL,
        "user_id" text NOT NULL,
        "access_token" text,
        "refresh_token" text,
        "id_token" text,
        "access_token_expires_at" integer,
        "refresh_token_expires_at" integer,
        "scope" text,
        "password" text,
        "created_at" integer NOT NULL,
        "updated_at" integer NOT NULL,
        FOREIGN KEY ("user_id") REFERENCES "user"("id") ON UPDATE no action ON DELETE no action
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS "verification" (
        "id" text PRIMARY KEY NOT NULL,
        "identifier" text NOT NULL,
        "value" text NOT NULL,
        "expires_at" integer NOT NULL,
        "created_at" integer,
        "updated_at" integer
      );
    `);

    console.log("Auth tables created successfully!");
  } catch (error) {
    console.error("Error creating tables:", error);
  } finally {
    process.exit(0);
  }
}

main();
