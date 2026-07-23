import { NextResponse } from "next/server";
import { db } from "@/db";
import { stores, activityLogs, userStoreAccess, organizations } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireOwner, checkQuota, storeScope } from "@/lib/auth-guard";
import { createStoreSchema } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeInput } from "@/lib/sanitize";
import { seedStoreCoa } from "@/db/seed-coa";
// using global crypto for randomUUID() instead of importing Node's crypto

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

// GET /api/stores - Fetch all stores (tenant-scoped)
export async function GET(request: Request) {
    const authResult = await requireOwner();
    if (authResult instanceof NextResponse) return authResult;

    try {
        // 🔒 Tenant isolation: platform_admin sees all; owner sees only their org's stores.
        const scope = storeScope(authResult, stores.id);
        const data = await db.query.stores.findMany({
            where: scope,
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

    const quotaCheck = await checkQuota(authResult, "stores");
    if (quotaCheck instanceof NextResponse) return quotaCheck;

    try {
        const rawBody = await request.json();
        const body = sanitizeInput(rawBody);
        const parsed = createStoreSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }

        const { name, address, phone } = parsed.data;
        const id = crypto.randomUUID();
        
        // The new store belongs to the caller's tenant (org). Fall back to the legacy
        // 'org-default' only for pre-migration accounts whose org isn't resolved yet.
        const targetOrgId = authResult.organizationId ?? 'org-default';
        await db.insert(organizations).values({
            id: targetOrgId,
            name: targetOrgId === 'org-default' ? 'Default Organization' : 'Organization',
            createdAt: new Date(),
            updatedAt: new Date(),
        }).onConflictDoNothing();

        const [newStore] = await db.insert(stores).values({
            id,
            organizationId: targetOrgId,
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

        // Seed the default Chart of Accounts + current fiscal period so accounting
        // works out-of-the-box. Best-effort: never block store creation on this.
        try {
            await seedStoreCoa(newStore.id);
        } catch (coaErr: any) {
            console.error("Failed to seed default COA for new store:", coaErr?.message);
        }

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
