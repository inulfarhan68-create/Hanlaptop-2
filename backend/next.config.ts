import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack workspace root is auto-detected from backend/'s lockfile now that
  // the Vite frontend (and its root lockfile) is gone — no explicit `root` pin
  // needed anymore.
  // Cutover: the Next app is now the primary surface served at root. The
  // transitional basePath "/_/backend" is removed. Client-side callers
  // (apiFetch, assetUrl, auth-client) were updated to root-relative paths.
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
  serverExternalPackages: ["better-auth", "kysely", "@better-auth/core", "drizzle-orm", "@better-auth/kysely-adapter"]
};

export default nextConfig;
