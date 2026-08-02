import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventory, serviceOrders } from "@/db/schema";
import { eq, not, and } from "drizzle-orm";
import { requireAuth, storeScope } from "@/lib/auth-guard";

export const dynamic = 'force-dynamic';

export async function GET() {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        // 🔒 Tenant-safe: these feed autocomplete, and without scoping every signed-in
        // user was offered every other tenant's item and device names.
        const invScope = storeScope(authResult, inventory.storeId);
        const svcScope = storeScope(authResult, serviceOrders.storeId);

        const [dbLaptops, dbServices, dbItems] = await Promise.all([
            // Unique laptop names from inventory
            db.select({ itemName: inventory.itemName })
                .from(inventory)
                .where(and(eq(inventory.category, "Laptop Bekas"), invScope))
                .groupBy(inventory.itemName),

            // Unique device names from service orders
            db.select({ deviceName: serviceOrders.deviceName })
                .from(serviceOrders)
                .where(svcScope)
                .groupBy(serviceOrders.deviceName),

            // Unique non-laptop items from inventory
            db.select({ itemName: inventory.itemName })
                .from(inventory)
                .where(and(not(eq(inventory.category, "Laptop Bekas")), invScope))
                .groupBy(inventory.itemName),
        ]);

        // Merge and clean laptop names
        const laptopModels = Array.from(new Set([
            ...dbLaptops.map(l => l.itemName),
            ...dbServices.map(s => s.deviceName)
        ])).filter(Boolean);

        // Clean inventory item names
        const inventoryItems = dbItems.map(i => i.itemName).filter(Boolean);

        return NextResponse.json({
            laptopModels,
            inventoryItems
        });
    } catch (error: any) {
        console.error("Failed to fetch suggestions:", error);
        return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 });
    }
}
