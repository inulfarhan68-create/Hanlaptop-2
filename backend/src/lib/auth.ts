import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "../db";
import * as schema from "../db/schema";

// Override process.env.BETTER_AUTH_URL to normalize it since Better Auth matches against request.url directly (which has Next.js basePath stripped)
if (process.env.BETTER_AUTH_URL) {
    let url = process.env.BETTER_AUTH_URL.replace(/\/$/, "");
    if (!url.endsWith("/api/auth")) {
        url += "/api/auth";
    }
    if (url.includes("/_/backend")) {
        url = url.replace("/_/backend", "");
    }
    process.env.BETTER_AUTH_URL = url;
}

let serverBaseURL = process.env.BETTER_AUTH_URL || "";
if (!serverBaseURL) {
    serverBaseURL = process.env.NODE_ENV === 'development' 
        ? "http://localhost:3000/api/auth" 
        : "https://hanlaptop.vercel.app/api/auth";
}

const authSecret = process.env.BETTER_AUTH_SECRET;
if (!authSecret && process.env.NODE_ENV === 'production') {
    const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
    const isVercel = !!process.env.VERCEL;
    
    if (isBuildPhase || !isVercel) {
        console.warn("⚠️  [WARNING] BETTER_AUTH_SECRET environment variable is missing. This is allowed during build phase or local production mode, but will cause a crash in Vercel production runtime.");
    } else {
        throw new Error("FATAL: BETTER_AUTH_SECRET environment variable is required in production runtime.");
    }
}

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
            user: schema.user,
            session: schema.session,
            account: schema.account,
            verification: schema.verification
        }
    }),
    secret: authSecret || "dev-only-secret-not-for-production",
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
