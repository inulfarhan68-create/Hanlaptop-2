import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Migrations/push must use the DIRECT connection (port 5432), NOT the
    // transaction pooler. Falls back to DATABASE_URL if DIRECT_URL is unset.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
  },
});
