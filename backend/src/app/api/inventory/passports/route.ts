import { NextResponse } from "next/server";
import { db } from "@/db";
import { devicePassports, inventory } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth, storeScope, requireFeature } from "@/lib/auth-guard";
import { registerDevicePassport } from "@/lib/digital-passport";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const featureCheck = await requireFeature("devicePassport");
    if (featureCheck instanceof NextResponse) return featureCheck;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const inventoryId = searchParams.get("inventoryId");

    try {
        let conditions = [];
        const scope = storeScope(authResult, devicePassports.storeId);
        if (scope) conditions.push(scope);
        
        if (status) {
            conditions.push(eq(devicePassports.status, status as any));
        }

        if (inventoryId) {
            conditions.push(eq(devicePassports.inventoryId, inventoryId));
        }

        const passports = await db.query.devicePassports.findMany({
            where: conditions.length > 0 ? and(...conditions) : undefined,
            with: {
                inventory: {
                    columns: {
                        itemName: true,
                        category: true
                    }
                }
            },
            orderBy: [desc(devicePassports.createdAt)],
            limit: 100
        });

        return NextResponse.json(passports);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const featureCheck = await requireFeature("devicePassport");
    if (featureCheck instanceof NextResponse) return featureCheck;

    try {
        const body = await request.json();
        const { serialNumber, inventoryId, originalCost } = body;

        if (!serialNumber || !inventoryId) {
            return NextResponse.json({ error: "serialNumber and inventoryId are required" }, { status: 400 });
        }

        // 🔒 Tenant-safe: verify inventory belongs to user's accessible stores
        const scope = storeScope(authResult, inventory.storeId);
        const inv = await db.query.inventory.findFirst({
            where: and(eq(inventory.id, inventoryId), scope)
        });

        if (!inv) {
            return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
        }

        const passport = await registerDevicePassport(
            inv.storeId,
            inventoryId,
            serialNumber,
            'READY_FOR_SALE',
            originalCost || inv.costPrice,
            authResult.user.id
        );

        return NextResponse.json({ success: true, data: passport });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
