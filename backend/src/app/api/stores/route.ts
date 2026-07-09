import { NextResponse } from "next/server";
import { db } from "@/db";
import { stores, activityLogs, userStoreAccess, organizations } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireOwner } from "@/lib/auth-guard";
import { createStoreSchema } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeInput } from "@/lib/sanitize";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

function slugify(text: string) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

// GET /api/stores - Fetch all stores
export async function GET(request: Request) {
    const authResult = await requireOwner();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const data = await db.query.stores.findMany({
            orderBy: [desc(stores.createdAt)]
        });
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Failed to fetch stores:", error);
        return NextResponse.json({ error: "Failed to fetch stores: " + error.message }, { status: 500 });
    }
}

// POST /api/stores - Create a new store
export async function POST(request: Request) {
    const rateLimitResponse = await checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const authResult = await requireOwner();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const rawBody = await request.json();
        const body = sanitizeInput(rawBody);
        const parsed = createStoreSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }

        const { name, address, phone } = parsed.data;
        const id = crypto.randomUUID();
        
        // Ensure 'org-default' exists before creating a store to prevent FK errors on new databases
        await db.insert(organizations).values({
            id: 'org-default',
            name: 'Default Organization',
            createdAt: new Date(),
            updatedAt: new Date(),
        }).onConflictDoNothing();

        // We assume 'org-default' is the main organization as per our seed
        const [newStore] = await db.insert(stores).values({
            id,
            organizationId: 'org-default',
            name,
            slug: slugify(name),
            address: address || null,
            phone: phone || null,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        }).returning();

        // Automatically give the owner access to this new store
        await db.insert(userStoreAccess).values({
            userId: authResult.user.id,
            storeId: newStore.id,
            role: 'owner',
            createdAt: new Date(),
        });

        // Log activity
        await db.insert(activityLogs).values({
            storeId: newStore.id,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "CREATE_STORE",
            entityType: "stores",
            entityId: newStore.id,
            details: JSON.stringify({ name, address, phone })
        });

        return NextResponse.json(newStore, { status: 201 });
    } catch (error: any) {
        console.error("Failed to create store:", error);
        return NextResponse.json({ error: "Gagal membuat cabang: " + error.message }, { status: 500 });
    }
}
