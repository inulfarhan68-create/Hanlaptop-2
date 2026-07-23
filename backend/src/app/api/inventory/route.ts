import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventory, activityLogs } from "@/db/schema";
import { eq, ilike, or, and, sql, isNull } from "drizzle-orm";
import { requireAuth, requireOwnerOrManager, requirePermission, storeScope } from "@/lib/auth-guard";
import { Permissions } from "@/lib/permissions";
import { inventorySchema } from "@/lib/validators";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authResult = await requirePermission(Permissions.INVENTORY_READ);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const fetchAll = searchParams.get("fetchAll") === "true";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = (page - 1) * limit;

    try {
        const baseConditions = [isNull(inventory.deletedAt)];
        const scope = storeScope(authResult, inventory.storeId);
        if (scope) baseConditions.push(scope);

        // Calculate total summary (KPI Stats) disregarding search/category filters, but scoped to store
        const [summaryResult] = await db.select({
            laptopCount: sql<number>`sum(CASE WHEN ${inventory.category} = 'Laptop Bekas' THEN ${inventory.quantity} ELSE 0 END)`,
            spareCount: sql<number>`sum(CASE WHEN ${inventory.category} NOT IN ('Laptop Bekas', 'Aksesoris', 'Jasa Servis') THEN ${inventory.quantity} ELSE 0 END)`,
            aksesorisCount: sql<number>`sum(CASE WHEN ${inventory.category} = 'Aksesoris' THEN ${inventory.quantity} ELSE 0 END)`,
            totalAssetValue: sql<number>`sum(${inventory.costPrice} * ${inventory.quantity})`
        }).from(inventory).where(and(...baseConditions));

        const conditions = [...baseConditions];

        if (search) {
            const searchCondition = or(
                ilike(inventory.itemName, `%${search}%`),
                ilike(inventory.category, `%${search}%`),
                ilike(inventory.barcode, `%${search}%`)
            );
            if (searchCondition) conditions.push(searchCondition);
        }

        if (category && category !== "all") {
            if (category === "laptop") conditions.push(eq(inventory.category, "Laptop Bekas"));
            else if (category === "sparepart") conditions.push(sql`${inventory.category} NOT IN ('Laptop Bekas', 'Aksesoris', 'Jasa Servis')`);
            else if (category === "aksesoris") conditions.push(eq(inventory.category, "Aksesoris"));
            else if (category === "jasa") conditions.push(eq(inventory.category, "Jasa Servis"));
        }

        if (status && status !== "all") {
            if (status === "instock") conditions.push(sql`${inventory.quantity} > 0`);
            else if (status === "outofstock") conditions.push(sql`${inventory.quantity} = 0`);
            else if (status === "lowstock") conditions.push(sql`${inventory.quantity} <= COALESCE(${inventory.minStock}, 2) AND ${inventory.quantity} > 0`);
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        let totalFiltered = 0;
        if (!fetchAll) {
            const [filteredCountResult] = await db.select({
                count: sql<number>`count(*)`
            }).from(inventory).where(whereClause);
            totalFiltered = Number(filteredCountResult.count);
        }

        let query = db.select({
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
            tracksSerialNumber: inventory.tracksSerialNumber,
            createdAt: inventory.createdAt,
            qcGrade: sql<string | null>`(SELECT grade FROM qc_inspections WHERE qc_inspections.inventory_id = ${inventory.id} ORDER BY created_at DESC LIMIT 1)`,
            qcNotes: sql<string | null>`(SELECT notes FROM qc_inspections WHERE qc_inspections.inventory_id = ${inventory.id} ORDER BY created_at DESC LIMIT 1)`,
            qcTechnicianId: sql<string | null>`(SELECT technician_id FROM qc_inspections WHERE qc_inspections.inventory_id = ${inventory.id} ORDER BY created_at DESC LIMIT 1)`
        })
        .from(inventory)
        .where(whereClause)
        .orderBy(inventory.createdAt);

        if (!fetchAll) {
            query = query.limit(limit).offset(offset) as any;
        }

        const items = await query;

        const sanitizedItems = items.map(item => {
            if (authResult.storeRole === "kasir") {
                return { ...item, costPrice: 0 };
            }
            return item;
        });

        if (fetchAll) {
            return NextResponse.json(sanitizedItems);
        }

        return NextResponse.json({
            data: sanitizedItems,
            meta: {
                totalItems: totalFiltered,
                currentPage: page,
                itemsPerPage: limit,
                totalPages: Math.ceil(totalFiltered / limit),
                summary: {
                    laptopCount: Number(summaryResult.laptopCount) || 0,
                    spareCount: Number(summaryResult.spareCount) || 0,
                    aksesorisCount: Number(summaryResult.aksesorisCount) || 0,
                    totalAssetValue: Number(summaryResult.totalAssetValue) || 0,
                }
            }
        });
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
        const { itemName, category, quantity, minStock, costPrice, sellingPrice, specs, barcode, tracksSerialNumber } = parsed.data;

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
            tracksSerialNumber: tracksSerialNumber || false,
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
