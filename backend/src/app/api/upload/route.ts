import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { put } from "@vercel/blob";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = file.name || "upload.png";
        
        // Generate a clean secure random filename
        const ext = path.extname(filename) || ".png";
        const randomName = `${crypto.randomUUID()}${ext}`;

        // 1. Production Mode: Upload to Vercel Blob if token is set
        const token = process.env.BLOB_READ_WRITE_TOKEN;
        if (token) {
            console.log("[Upload API] Uploading to Vercel Blob:", randomName);
            const blob = await put(randomName, buffer, {
                access: "public",
                token: token,
            });
            console.log("[Upload API] Vercel Blob upload success:", blob.url);
            return NextResponse.json({ url: blob.url });
        }

        // Prevent write crash in read-only Vercel environment
        if (process.env.VERCEL === "1") {
            return NextResponse.json({ 
                error: "Vercel Blob belum terdeteksi. Pastikan Anda sudah menghubungkan Vercel Blob ke proyek 'backend' di dashboard Vercel, kemudian lakukan Deploy ulang agar variabel token aktif." 
            }, { status: 500 });
        }

        // 2. Development Mode: Fallback to local file storage
        console.log("[Upload API] Falling back to local storage:", randomName);
        
        // Target directory in backend public folder
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, randomName);
        fs.writeFileSync(filePath, buffer);

        // Construct local URL with basePath (/_/backend)
        const host = request.headers.get("host") || "localhost:3000";
        const protocol = request.headers.get("x-forwarded-proto") || "http";
        
        // Next.js static files in /public are served from root URL. 
        // With basePath "/_/backend", they are served under "/_/backend/uploads/..."
        const localUrl = `${protocol}://${host}/_/backend/uploads/${randomName}`;
        console.log("[Upload API] Local upload success:", localUrl);

        return NextResponse.json({ url: localUrl });

    } catch (error: any) {
        console.error("Upload API error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
