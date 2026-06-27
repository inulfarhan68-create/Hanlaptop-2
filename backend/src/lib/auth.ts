import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "../db";
import * as schema from "../db/schema";

// Override process.env.BETTER_AUTH_URL to inject Next.js basePath in production since Better Auth matches against request.url directly
if (process.env.BETTER_AUTH_URL) {
    let url = process.env.BETTER_AUTH_URL.replace(/\/$/, "");
    if (!url.endsWith("/api/auth")) {
        url += "/api/auth";
    }
    if (process.env.NODE_ENV === 'production' && !url.includes("/_/backend")) {
        url = url.replace("/api/auth", "/_/backend/api/auth");
    }
    process.env.BETTER_AUTH_URL = url;
}

let serverBaseURL = process.env.BETTER_AUTH_URL || "";
if (!serverBaseURL) {
    serverBaseURL = process.env.NODE_ENV === 'development' 
        ? "http://localhost:3000/api/auth" 
        : "https://hanlaptop.vercel.app/_/backend/api/auth";
}

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "sqlite",
        schema: {
            user: schema.user,
            session: schema.session,
            account: schema.account,
            verification: schema.verification
        }
    }),
    secret: process.env.BETTER_AUTH_SECRET || "SUPER_SECRET_KEY_HANLAPTOP_2026",
    baseURL: serverBaseURL,
    emailAndPassword: {
        enabled: true,
    },
    user: {
        additionalFields: {
            role: {
                type: "string",
                required: false,
                defaultValue: "kasir",
                input: true,
            }
        }
    },
    trustedOrigins: [
        "http://localhost:5173", 
        "http://localhost:5174", 
        "http://localhost:3000",
        "https://hanlaptop.vercel.app",
        "https://hanlaptop-front.vercel.app",
        ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
        ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : [])
    ],
});
