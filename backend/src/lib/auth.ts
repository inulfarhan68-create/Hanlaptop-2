import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "../db";
import * as schema from "../db/schema";

let serverBaseURL = process.env.BETTER_AUTH_URL || "";
if (serverBaseURL) {
    if (!serverBaseURL.endsWith("/api/auth") && !serverBaseURL.endsWith("/api/auth/")) {
        if (!serverBaseURL.endsWith("/")) {
            serverBaseURL += "/";
        }
        serverBaseURL += "api/auth";
    }
}

if (!serverBaseURL) {
    serverBaseURL = process.env.NODE_ENV === 'development' 
        ? "http://localhost:3000/api/auth" 
        : "https://hanlaptop.vercel.app/_/backend/api/auth";
} else {
    if (process.env.NODE_ENV === 'production' && !serverBaseURL.includes("/_/backend")) {
        serverBaseURL = serverBaseURL.replace("/api/auth", "/_/backend/api/auth");
    }
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
