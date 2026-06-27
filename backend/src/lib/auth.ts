import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "../db";
import * as schema from "../db/schema";

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
    baseURL: process.env.BETTER_AUTH_URL || (process.env.NODE_ENV === 'development' ? "http://localhost:3000/api/auth" : "https://hanlaptop.vercel.app/_/backend/api/auth"),
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
