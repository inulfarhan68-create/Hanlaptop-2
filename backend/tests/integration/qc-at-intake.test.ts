import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

// Same throwaway-Postgres wiring as transaction-sale.test.ts: point @/db at the
// test database built by the global setup, using a real Drizzle instance so the
// service's db.transaction()/db.query.*/insert/select all run for real.
vi.mock("@/db", async () => {
    const postgres = (await import("postgres")).default;
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const schema = await import("@/db/schema");
    const url = process.env.TEST_DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres";
    const client = postgres(url, { max: 1 });
    return { db: drizzle(client, { schema }) };
});

import { db } from "@/db";
import {
    organizations,
    stores,
    user,
    storeSettings,
    inventory,
    transactions,
    devicePassports,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { TransactionService } from "@/services/TransactionService";
import { transactionSchema } from "@/lib/validators";

const ORG_ID = "org-qc-1";
const STORE_ID = "store-qc-1";
const USER_ID = "user-qc-1";

/** Delete ONLY this test's data (scoped to its store/org/user ids). */
async function cleanupTestData() {
    await db.delete(storeSettings).where(eq(storeSettings.storeId, STORE_ID));
    await db.delete(stores).where(eq(stores.id, STORE_ID));
    await db.delete(organizations).where(eq(organizations.id, ORG_ID));
    await db.delete(user).where(eq(user.id, USER_ID));
}

/** Reset the store's operational rows + settings between tests (scoped). */
async function resetStore() {
    await db.delete(transactions).where(eq(transactions.storeId, STORE_ID));
    await db.delete(inventory).where(eq(inventory.storeId, STORE_ID));
    await db.delete(storeSettings).where(eq(storeSettings.storeId, STORE_ID));
}

/** Run a "Pembelian Stok" for one brand-new serial-tracked item; return its id + SN. */
async function purchaseNewSerialItem(sn: string) {
    const data = transactionSchema.parse({
        transactionType: "Pembelian Stok",
        amount: 1_000_000,
        paymentMethod: "Cash",
        paymentStatus: "Lunas",
        items: [
            {
                inventoryId: null,
                itemName: "Laptop Bekas i7",
                category: "Laptop Bekas",
                quantity: 1,
                unitPrice: 1_000_000,
                sellingPrice: 1_500_000,
                tracksSerialNumber: true,
                serialNumbers: [sn],
            },
        ],
    });

    await TransactionService.createTransaction({
        storeId: STORE_ID,
        userId: USER_ID,
        userName: "Tester",
        activeShiftId: null,
        data,
    });

    const [item] = await db.select().from(inventory).where(eq(inventory.storeId, STORE_ID));
    const [passport] = await db
        .select()
        .from(devicePassports)
        .where(and(eq(devicePassports.storeId, STORE_ID), eq(devicePassports.serialNumber, sn)));
    return { item, passport };
}

describe("QC-at-intake — Pembelian Stok gating via requireInboundQc", () => {
    beforeAll(async () => {
        await cleanupTestData();
        await db.insert(organizations).values({ id: ORG_ID, name: "QC Org" });
        await db.insert(stores).values({ id: STORE_ID, organizationId: ORG_ID, name: "QC Store" });
        await db.insert(user).values({
            id: USER_ID,
            name: "Tester",
            email: "qc-tester@example.com",
            emailVerified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    });

    afterAll(async () => {
        await cleanupTestData();
    });

    beforeEach(async () => {
        await resetStore();
    });

    it("ON: purchased item enters IN_INSPECTION with an INBOUND_QC passport and cannot be sold", async () => {
        await db.insert(storeSettings).values({ storeId: STORE_ID, requireInboundQc: true });

        const { item, passport } = await purchaseNewSerialItem("SN-QC-ON-1");

        // Blocked from sale at intake
        expect(item.condition).toBe("IN_INSPECTION");
        expect(passport.status).toBe("INBOUND_QC");

        // The existing sale guard refuses an item still under inspection
        const saleData = transactionSchema.parse({
            transactionType: "Penjualan",
            amount: 1_500_000,
            paymentMethod: "Cash",
            paymentStatus: "Lunas",
            items: [{ inventoryId: item.id, quantity: 1, unitPrice: 1_500_000 }],
        });

        await expect(
            TransactionService.createTransaction({
                storeId: STORE_ID,
                userId: USER_ID,
                userName: "Tester",
                activeShiftId: null,
                data: saleData,
            })
        ).rejects.toThrow();

        // Atomic rollback: stock untouched
        const [after] = await db.select().from(inventory).where(eq(inventory.id, item.id));
        expect(after.quantity).toBe(1);
    });

    it("OFF: purchased item is immediately sellable (NEW + READY_FOR_SALE)", async () => {
        await db.insert(storeSettings).values({ storeId: STORE_ID, requireInboundQc: false });

        const { item, passport } = await purchaseNewSerialItem("SN-QC-OFF-1");

        expect(item.condition).toBe("NEW");
        expect(passport.status).toBe("READY_FOR_SALE");
    });

    it("defaults to OFF when the store has no settings row", async () => {
        // No storeSettings insert — the branch must treat a missing row as not-required.
        const { item, passport } = await purchaseNewSerialItem("SN-QC-DEFAULT-1");

        expect(item.condition).toBe("NEW");
        expect(passport.status).toBe("READY_FOR_SALE");
    });
});
