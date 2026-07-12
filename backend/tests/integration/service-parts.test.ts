import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

// Same throwaway-Postgres wiring as the other integration tests.
vi.mock("@/db", async () => {
    const postgres = (await import("postgres")).default;
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const schema = await import("@/db/schema");
    const url = process.env.TEST_DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres";
    const client = postgres(url, { max: 1 });
    return { db: drizzle(client, { schema }) };
});

import { db } from "@/db";
import { organizations, stores, inventory, serviceOrders, serviceParts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { syncServiceParts, getSparepartsAmount } from "@/services/ServicePartsService";

const ORG_ID = "org-sp-1";
const STORE_ID = "store-sp-1";
const INV_ID = "inv-sp-1";
const SO_ID = "so-sp-1";

async function cleanup() {
    await db.delete(stores).where(eq(stores.id, STORE_ID));
    await db.delete(organizations).where(eq(organizations.id, ORG_ID));
}

describe("ServicePartsService — relational spareparts", () => {
    beforeAll(async () => {
        await cleanup();
        await db.insert(organizations).values({ id: ORG_ID, name: "SP Org" });
        await db.insert(stores).values({ id: STORE_ID, organizationId: ORG_ID, name: "SP Store" });
    });

    afterAll(async () => {
        await cleanup();
    });

    beforeEach(async () => {
        // Deleting the store cascades to inventory/service_orders/service_parts.
        await db.delete(serviceOrders).where(eq(serviceOrders.storeId, STORE_ID));
        await db.delete(inventory).where(eq(inventory.storeId, STORE_ID));
        await db.insert(inventory).values({
            id: INV_ID,
            storeId: STORE_ID,
            itemName: "SSD 256GB",
            category: "Sparepart",
            quantity: 10,
            costPrice: 400_000,
            sellingPrice: 550_000,
            condition: "NEW",
            tracksSerialNumber: false,
            isConsignment: false,
        });
        await db.insert(serviceOrders).values({
            id: SO_ID,
            storeId: STORE_ID,
            customerName: "Budi",
            deviceName: "Asus X441",
            issue: "Ganti SSD",
            status: "Dikerjakan",
        });
    });

    it("persists parts and snapshots costPrice from inventory", async () => {
        await syncServiceParts(SO_ID, [
            { id: INV_ID, name: "SSD 256GB", price: 550_000, qty: 2 },
        ]);

        const rows = await db.select().from(serviceParts).where(eq(serviceParts.serviceOrderId, SO_ID));
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            inventoryId: INV_ID,
            itemName: "SSD 256GB",
            quantity: 2,
            unitPrice: 550_000,
            costPrice: 400_000, // snapshotted from inventory
        });
    });

    it("replaces existing parts on re-sync (delete-then-insert)", async () => {
        await syncServiceParts(SO_ID, [{ id: INV_ID, name: "SSD 256GB", price: 550_000, qty: 1 }]);
        await syncServiceParts(SO_ID, [{ id: null, name: "Jasa pasang", price: 50_000, qty: 1 }]);

        const rows = await db.select().from(serviceParts).where(eq(serviceParts.serviceOrderId, SO_ID));
        expect(rows).toHaveLength(1);
        expect(rows[0].itemName).toBe("Jasa pasang");
        expect(rows[0].inventoryId).toBeNull(); // off-catalog part
        expect(rows[0].costPrice).toBe(0);
    });

    it("clears parts when synced with an empty list", async () => {
        await syncServiceParts(SO_ID, [{ id: INV_ID, name: "SSD 256GB", price: 550_000, qty: 1 }]);
        await syncServiceParts(SO_ID, []);
        const rows = await db.select().from(serviceParts).where(eq(serviceParts.serviceOrderId, SO_ID));
        expect(rows).toHaveLength(0);
    });

    it("getSparepartsAmount sums unitPrice*qty from the table", async () => {
        await syncServiceParts(SO_ID, [
            { id: INV_ID, name: "SSD 256GB", price: 550_000, qty: 2 },
            { id: null, name: "Jasa pasang", price: 50_000, qty: 1 },
        ]);
        const amount = await getSparepartsAmount(SO_ID, null);
        expect(amount).toBe(2 * 550_000 + 50_000);
    });

    it("getSparepartsAmount falls back to legacy notes-JSON when the table is empty", async () => {
        const legacyNotes = 'Ganti SSD\n[Spareparts: [{"id":"x","name":"SSD","price":500000,"qty":3}]]';
        const amount = await getSparepartsAmount(SO_ID, legacyNotes);
        expect(amount).toBe(1_500_000);
    });
});
