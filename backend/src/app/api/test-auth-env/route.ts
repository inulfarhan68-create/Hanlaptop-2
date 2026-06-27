import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({
        BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "NOT_SET",
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ? "SET (length: " + process.env.BETTER_AUTH_SECRET.length + ")" : "NOT_SET",
        DATABASE_URL: process.env.DATABASE_URL ? "SET" : "NOT_SET",
        VERCEL: process.env.VERCEL || "NOT_SET",
        NODE_ENV: process.env.NODE_ENV || "NOT_SET",
        BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN ? "SET" : "NOT_SET",
    });
}
