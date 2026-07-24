import { NextResponse } from "next/server";
import { requireAuth, requireWritable } from "@/lib/auth-guard";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { put } from "@vercel/blob";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const demoBlock = requireWritable(authResult);
    if (demoBlock) return demoBlock;

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        // ── Security: File Size Limit (10MB) ──
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: "Ukuran file terlalu besar. Maksimal 10MB." }, { status: 400 });
        }

        // ── Security: MIME Type Whitelist ──
        const ALLOWED_MIME_TYPES = [
            "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"
        ];
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json({ error: `Tipe file '${file.type}' tidak diizinkan. Hanya gambar (JPEG, PNG, WebP, GIF, SVG).` }, { status: 400 });
        }

        // ── Security: Extension Whitelist ──
        const filename = file.name || "upload.png";
        const ext = path.extname(filename).toLowerCase();
        const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"];
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            return NextResponse.json({ error: `Ekstensi file '${ext}' tidak diizinkan.` }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // ── Security: Magic Byte Validation ──
        // Check the first bytes of the file match expected image formats
        const magicBytes: Record<string, number[][]> = {
            ".jpg":  [[0xFF, 0xD8, 0xFF]],
            ".jpeg": [[0xFF, 0xD8, 0xFF]],
            ".png":  [[0x89, 0x50, 0x4E, 0x47]],
            ".webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF header
            ".gif":  [[0x47, 0x49, 0x46, 0x38]], // GIF8
        };
        const expectedMagic = magicBytes[ext];
        if (expectedMagic && buffer.length >= 4) {
            const matchesMagic = expectedMagic.some(magic => 
                magic.every((byte, i) => buffer[i] === byte)
            );
            if (!matchesMagic) {
                return NextResponse.json({ error: "File content tidak sesuai dengan tipe yang diklaim. File mungkin corrupt atau palsu." }, { status: 400 });
            }
        }

        // Generate a clean secure random filename (preserve validated extension)
        const randomName = `${crypto.randomUUID()}${ext}`;

        // 1. Production Mode: Upload to Vercel Blob if connected (supports OIDC & token modes)
        const hasBlob = !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID || process.env.blob_READ_WRITE_TOKEN || process.env.blob_STORE_ID);
        if (hasBlob) {
            console.log("[Upload API] Uploading to Vercel Blob:", randomName);
            
            // Map lower-case variables if present to ensure SDK compatibility
            if (process.env.blob_STORE_ID && !process.env.BLOB_STORE_ID) {
                process.env.BLOB_STORE_ID = process.env.blob_STORE_ID;
            }
            if (process.env.blob_WEBHOOK_PUBLIC_KEY && !process.env.BLOB_WEBHOOK_PUBLIC_KEY) {
                process.env.BLOB_WEBHOOK_PUBLIC_KEY = process.env.blob_WEBHOOK_PUBLIC_KEY;
            }

            const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.blob_READ_WRITE_TOKEN;
            const putOptions: any = { access: "public" };
            if (token) {
                putOptions.token = token;
            }

            const blob = await put(randomName, buffer, putOptions);
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

        // Post-cutover the Next app serves at root, so /public files (and these
        // uploads) are served from the root URL.
        const host = request.headers.get("host") || "localhost:3000";
        const protocol = request.headers.get("x-forwarded-proto") || "http";
        const localUrl = `${protocol}://${host}/uploads/${randomName}`;
        console.log("[Upload API] Local upload success:", localUrl);

        return NextResponse.json({ url: localUrl });

    } catch (error: any) {
        console.error("Upload API error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
