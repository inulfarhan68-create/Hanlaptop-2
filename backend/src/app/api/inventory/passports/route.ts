import { NextResponse } from "next/server";
import { db } from "@/db";
import { devicePassports, inventory } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";
import { registerDevicePassport } from "@/lib/digital-passport";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    try {
        let conditions = [];
        if (authResult.storeId !== "all") {
            conditions.push(eq(devicePassports.storeId, authResult.storeId));
        }
        
        if (status) {
            conditions.push(eq(devicePassports.status, status as any));
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

    try {
        const body = await request.json();
        const { serialNumber, inventoryId, originalCost } = body;

        if (!serialNumber || !inventoryId) {
            return NextResponse.json({ error: "serialNumber and inventoryId are required" }, { status: 400 });
        }

        // Verify inventory exists and belongs to this store
        const inv = await db.query.inventory.findFirst({
            where: eq(inventory.id, inventoryId)
        });

        if (!inv) {
            return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
        }

        if (inv.storeId !== authResult.storeId && authResult.storeId !== "all") {
            return NextResponse.json({ error: "Unauthorized for this store" }, { status: 403 });
        }

        const passport = await registerDevicePassport(
            authResult.storeId === "all" ? inv.storeId : authResult.storeId,
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
