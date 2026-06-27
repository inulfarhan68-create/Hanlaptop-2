import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventory, serviceOrders } from "@/db/schema";
import { eq, not, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = 'force-dynamic';

export async function GET() {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        // Query unique laptop names from inventory table
        const dbLaptops = await db.select({ itemName: inventory.itemName })
            .from(inventory)
            .where(eq(inventory.category, "Laptop Bekas"))
            .groupBy(inventory.itemName);

        // Query unique device names from service orders table
        const dbServices = await db.select({ deviceName: serviceOrders.deviceName })
            .from(serviceOrders)
            .groupBy(serviceOrders.deviceName);

        // Query unique non-laptop items from inventory table
        const dbItems = await db.select({ itemName: inventory.itemName })
            .from(inventory)
            .where(not(eq(inventory.category, "Laptop Bekas")))
            .groupBy(inventory.itemName);

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
