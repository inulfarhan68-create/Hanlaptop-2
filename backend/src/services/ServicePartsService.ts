import { db } from "@/db";
import { serviceParts, inventory } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

/**
 * Shape sent by the frontend service form (`selectedParts`): the inventory id,
 * a display name, unit price charged to the customer, and quantity.
 */
export interface SparepartInput {
    id?: string | null;
    name: string;
    price?: number;
    qty?: number;
}

/**
 * Replace the sparepart rows for a service order (delete-then-insert), the
 * relational successor to the legacy `[Spareparts: [...]]` JSON-in-notes hack.
 * costPrice is snapshotted from inventory for catalog parts so the history
 * survives later inventory edits/deletes. Pass a tx client to run inside a
 * transaction. Only call when the caller actually supplied a parts list —
 * calling it on an unrelated update would wipe the existing parts.
 */
export async function syncServiceParts(
    serviceOrderId: string,
    parts: SparepartInput[] | undefined | null,
    client: any = db
) {
    await client.delete(serviceParts).where(eq(serviceParts.serviceOrderId, serviceOrderId));

    const clean = (parts || []).filter((p) => p && p.name && (Number(p.qty) || 0) > 0);
    if (clean.length === 0) return [];

    // Snapshot costPrice from inventory for parts that reference a catalog item.
    const invIds = clean.map((p) => p.id).filter((x): x is string => !!x);
    const costById: Record<string, number> = {};
    if (invIds.length > 0) {
        const rows = await client
            .select({ id: inventory.id, costPrice: inventory.costPrice })
            .from(inventory)
            .where(inArray(inventory.id, invIds));
        for (const r of rows) costById[r.id] = r.costPrice ?? 0;
    }

    const toInsert = clean.map((p) => ({
        serviceOrderId,
        inventoryId: p.id || null,
        itemName: p.name,
        quantity: Math.max(1, Math.floor(Number(p.qty) || 1)),
        unitPrice: Number(p.price) || 0,
        costPrice: p.id ? (costById[p.id] ?? 0) : 0,
    }));

    return await client.insert(serviceParts).values(toInsert).returning();
}

/**
 * Total customer-facing sparepart amount for a service order, read from the
 * relational table. Falls back to the legacy notes-JSON for orders created
 * before the table existed. Used to net spareparts out of technician commission.
 */
export async function getSparepartsAmount(
    serviceOrderId: string,
    legacyNotes: string | null | undefined,
    client: any = db
): Promise<number> {
    const rows = await client
        .select({ unitPrice: serviceParts.unitPrice, quantity: serviceParts.quantity })
        .from(serviceParts)
        .where(eq(serviceParts.serviceOrderId, serviceOrderId));

    if (rows.length > 0) {
        return rows.reduce(
            (s: number, r: any) => s + (Number(r.unitPrice) || 0) * (Number(r.quantity) || 0),
            0
        );
    }

    // Legacy fallback: parse the old [Spareparts: [...]] block from notes.
    if (legacyNotes) {
        const m = legacyNotes.match(/\[Spareparts:\s*(\[[\s\S]*?\])\]/);
        if (m) {
            try {
                const list = JSON.parse(m[1]);
                if (Array.isArray(list)) {
                    return list.reduce(
                        (s: number, p: any) => s + (Number(p.price) || 0) * (Number(p.qty) || 1),
                        0
                    );
                }
            } catch {
                /* ignore malformed legacy JSON */
            }
        }
    }
    return 0;
}
