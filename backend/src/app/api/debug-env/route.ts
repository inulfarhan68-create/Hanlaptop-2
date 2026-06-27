import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
    const keys = Object.keys(process.env).sort();
    const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;
    const blobTokenLength = process.env.BLOB_READ_WRITE_TOKEN ? process.env.BLOB_READ_WRITE_TOKEN.length : 0;
    
    return NextResponse.json({
        keys,
        hasBlobToken,
        blobTokenLength,
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL
    });
}
