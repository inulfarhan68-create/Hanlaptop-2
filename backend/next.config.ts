import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/_/backend",
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: process.env.FRONTEND_URL || "http://localhost:5174" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-store-id" },
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" },
          { key: "Vary", value: "x-store-id" },
        ]
      }
    ]
  },
  serverExternalPackages: ["better-auth", "kysely", "@better-auth/core", "better-sqlite3", "@libsql/client", "drizzle-orm", "@better-auth/kysely-adapter"]
};

export default nextConfig;
