import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "../db";
import * as schema from "../db/schema";

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
        console.warn("BETTER_AUTH_SECRET is not set. Auth might fail in production.");
    } else {
        throw new Error("BETTER_AUTH_SECRET is required in production");
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
    advanced: {
        defaultCookieAttributes: {
            path: "/"
        }
    },
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
            },
            // Tenant the user belongs to. Set during onboarding (Phase 3); NULL for
            // platform_admin. Persisted/read by Better-Auth so it rides on the session.
            organizationId: {
                type: "string",
                required: false,
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
        // VERCEL_URL is the deployment-hash URL; VERCEL_BRANCH_URL is the stable
        // branch-alias URL users actually open on a preview. Trust both so preview
        // deployments are login-testable (production uses its own domain above).
        ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
        ...(process.env.VERCEL_BRANCH_URL ? [`https://${process.env.VERCEL_BRANCH_URL}`] : [])
    ],
});
