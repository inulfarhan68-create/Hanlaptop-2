import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

vi.mock("@/db", async () => {
    const postgres = (await import("postgres")).default;
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const schema = await import("@/db/schema");
    const url = process.env.TEST_DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres";
    const client = postgres(url, { max: 1 });
    return { db: drizzle(client, { schema }) };
});

import { db } from "@/db";
import { organizations, stores, inventory, serviceOrders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { syncServiceParts, deductServicePartsStock } from "@/services/ServicePartsService";

const ORG_ID = "org-ded-1";
const STORE_ID = "store-ded-1";
const INV_ID = "inv-ded-1";
const SO_ID = "so-ded-1";

async function cleanup() {
    await db.delete(stores).where(eq(stores.id, STORE_ID));
    await db.delete(organizations).where(eq(organizations.id, ORG_ID));
}

async function ramQty() {
    const [r] = await db.select({ q: inventory.quantity }).from(inventory).where(eq(inventory.id, INV_ID));
    return r.q;
}

describe("deductServicePartsStock — server-side sparepart deduction on pickup", () => {
    beforeAll(async () => {
        await cleanup();
        await db.insert(organizations).values({ id: ORG_ID, name: "Ded Org" });
        await db.insert(stores).values({ id: STORE_ID, organizationId: ORG_ID, name: "Ded Store" });
    });

    afterAll(async () => {
        await cleanup();
    });

    beforeEach(async () => {
        await db.delete(serviceOrders).where(eq(serviceOrders.storeId, STORE_ID));
        await db.delete(inventory).where(eq(inventory.storeId, STORE_ID));
        await db.insert(inventory).values({
            id: INV_ID, storeId: STORE_ID, itemName: "RAM DDR4 8GB", category: "Sparepart",
            quantity: 10, costPrice: 300_000, sellingPrice: 400_000, condition: "NEW",
            tracksSerialNumber: false, isConsignment: false,
        });
        await db.insert(serviceOrders).values({
            id: SO_ID, storeId: STORE_ID, customerName: "Budi", deviceName: "Asus", issue: "RAM", status: "Dikerjakan",
        });
    });

    it("deducts stock from the relational service_parts table", async () => {
        await syncServiceParts(SO_ID, [{ id: INV_ID, name: "RAM DDR4 8GB", price: 400_000, qty: 2 }]);
        const deducted = await deductServicePartsStock(SO_ID, STORE_ID, null);
        expect(deducted).toEqual([{ inventoryId: INV_ID, quantity: 2 }]);
        expect(await ramQty()).toBe(8); // 10 - 2
    });

    it("falls back to legacy notes-JSON when the table has no rows", async () => {
        const notes = `Ganti RAM\n[Spareparts: [{"id":"${INV_ID}","name":"RAM","price":400000,"qty":3}]]`;
        const deducted = await deductServicePartsStock(SO_ID, STORE_ID, notes);
        expect(deducted).toEqual([{ inventoryId: INV_ID, quantity: 3 }]);
        expect(await ramQty()).toBe(7); // 10 - 3
    });

    it("never drives stock below zero", async () => {
        await syncServiceParts(SO_ID, [{ id: INV_ID, name: "RAM DDR4 8GB", price: 400_000, qty: 25 }]);
        await deductServicePartsStock(SO_ID, STORE_ID, null);
        expect(await ramQty()).toBe(0); // GREATEST(0, 10 - 25)
    });

    it("is a no-op when the order has no parts", async () => {
        const deducted = await deductServicePartsStock(SO_ID, STORE_ID, "just some free-text notes");
        expect(deducted).toEqual([]);
        expect(await ramQty()).toBe(10);
    });

    it("does not touch stock in another store (tenant scoping)", async () => {
        // A part pointing at INV_ID but deducted under a different storeId must not apply.
        await syncServiceParts(SO_ID, [{ id: INV_ID, name: "RAM DDR4 8GB", price: 400_000, qty: 5 }]);
        await deductServicePartsStock(SO_ID, "some-other-store", null);
        expect(await ramQty()).toBe(10); // untouched — wrong store
    });
});
