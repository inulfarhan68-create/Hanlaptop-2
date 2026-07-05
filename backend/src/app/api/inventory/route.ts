import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventory, activityLogs } from "@/db/schema";
import { eq, ilike, or, and, sql, isNull } from "drizzle-orm";
import { requireAuth, requireOwnerOrManager, requirePermission } from "@/lib/auth-guard";
import { Permissions } from "@/lib/permissions";
import { inventorySchema } from "@/lib/validators";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authResult = await requirePermission(Permissions.INVENTORY_READ);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    try {
        // Filter by storeId unless the owner wants to see 'all'
        const conditions = [isNull(inventory.deletedAt)];
        if (authResult.storeId !== "all") {
            conditions.push(eq(inventory.storeId, authResult.storeId));
        }

        if (search) {
            const searchCondition = or(
                ilike(inventory.itemName, `%${search}%`),
                ilike(inventory.category, `%${search}%`),
                ilike(inventory.barcode, `%${search}%`)
            );
            if (searchCondition) conditions.push(searchCondition);
        }

        const items = await db.select({
            id: inventory.id,
            storeId: inventory.storeId,
            itemName: inventory.itemName,
            category: inventory.category,
            specs: inventory.specs,
            barcode: inventory.barcode,
            quantity: inventory.quantity,
            minStock: inventory.minStock,
            costPrice: inventory.costPrice,
            sellingPrice: inventory.sellingPrice,
            isPublished: inventory.isPublished,
            condition: inventory.condition,
            isConsignment: inventory.isConsignment,
            consignmentCommissionRate: inventory.consignmentCommissionRate,
            supplierId: inventory.supplierId,
            imageUrl: inventory.imageUrl,
            createdAt: inventory.createdAt,
            qcGrade: sql<string | null>`(SELECT grade FROM qc_inspections WHERE qc_inspections.inventory_id = ${inventory.id} ORDER BY created_at DESC LIMIT 1)`,
            qcNotes: sql<string | null>`(SELECT notes FROM qc_inspections WHERE qc_inspections.inventory_id = ${inventory.id} ORDER BY created_at DESC LIMIT 1)`,
            qcTechnicianId: sql<string | null>`(SELECT technician_id FROM qc_inspections WHERE qc_inspections.inventory_id = ${inventory.id} ORDER BY created_at DESC LIMIT 1)`
        })
        .from(inventory)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(inventory.createdAt);

        const sanitizedItems = items.map(item => {
            if (authResult.storeRole === "kasir") {
                return {
                    ...item,
                    costPrice: 0
                };
            }
            return item;
        });
        return NextResponse.json(sanitizedItems);
    } catch (error) {
        console.error("Failed to fetch inventory:", error);
        return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const authResult = await requirePermission(Permissions.INVENTORY_CREATE);
    if (authResult instanceof NextResponse) return authResult;

    // Must select a specific store to insert
    if (authResult.storeId === "all") {
        return NextResponse.json({ error: "Please select a specific branch to add inventory" }, { status: 400 });
    }

    try {
        const body = await request.json();
        const parsed = inventorySchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }
        const { itemName, category, quantity, minStock, costPrice, sellingPrice, specs, barcode } = parsed.data;

        const [newItem] = await db.insert(inventory).values({
            storeId: authResult.storeId,
            itemName,
            category,
            quantity: quantity || 0,
            minStock: minStock !== undefined ? minStock : 2,
            costPrice: costPrice || 0,
            sellingPrice: sellingPrice || 0,
            specs,
            barcode: barcode || null,
            createdAt: new Date()
        }).returning();

        // Log activity
        await db.insert(activityLogs).values({
            storeId: authResult.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "CREATE_INVENTORY",
            entityType: "inventory",
            entityId: newItem.id,
            details: JSON.stringify({ itemName, category, quantity: quantity || 0 })
        });

        return NextResponse.json(newItem, { status: 201 });
    } catch (error) {
        console.error("Failed to create inventory item:", error);
        return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
    }
}
