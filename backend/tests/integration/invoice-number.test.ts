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
import { organizations, stores, transactions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateInvoiceNumber } from "@/lib/invoice-number";

const ORG = "org-inv-1";
const STORE_A = "store-inv-a";
const STORE_B = "store-inv-b";
const JULY = new Date(2026, 6, 15); // month index 6 = July

async function seedTx(storeId: string, invoiceNumber: string) {
    await db.insert(transactions).values({
        storeId,
        transactionType: "Jasa Servis",
        amount: 100_000,
        transactionDate: JULY,
        invoiceNumber,
    });
}

async function cleanup() {
    await db.delete(stores).where(eq(stores.id, STORE_A));
    await db.delete(stores).where(eq(stores.id, STORE_B));
    await db.delete(organizations).where(eq(organizations.id, ORG));
}

describe("generateInvoiceNumber — sequential, per-store, per-prefix", () => {
    beforeAll(async () => {
        await cleanup();
        await db.insert(organizations).values({ id: ORG, name: "Inv Org" });
        await db.insert(stores).values([
            { id: STORE_A, organizationId: ORG, name: "Store A" },
            { id: STORE_B, organizationId: ORG, name: "Store B" },
        ]);
    });

    afterAll(async () => {
        await cleanup();
    });

    beforeEach(async () => {
        await db.delete(transactions).where(eq(transactions.storeId, STORE_A));
        await db.delete(transactions).where(eq(transactions.storeId, STORE_B));
    });

    it("starts at 001 for an empty store/month", async () => {
        expect(await generateInvoiceNumber(db, STORE_A, "SRV", JULY)).toBe("SRV/2026/07/001");
    });

    it("increments past the latest number of the same prefix", async () => {
        await seedTx(STORE_A, "SRV/2026/07/001");
        await seedTx(STORE_A, "SRV/2026/07/002");
        await seedTx(STORE_A, "SRV/2026/07/003");
        expect(await generateInvoiceNumber(db, STORE_A, "SRV", JULY)).toBe("SRV/2026/07/004");
    });

    it("keeps SRV / GRN / INV sequences independent", async () => {
        await seedTx(STORE_A, "SRV/2026/07/001");
        await seedTx(STORE_A, "GRN/2026/07/010");
        expect(await generateInvoiceNumber(db, STORE_A, "SRV", JULY)).toBe("SRV/2026/07/002");
        expect(await generateInvoiceNumber(db, STORE_A, "GRN", JULY)).toBe("GRN/2026/07/011");
        expect(await generateInvoiceNumber(db, STORE_A, "INV", JULY)).toBe("INV/2026/07/001");
    });

    it("is isolated per store", async () => {
        await seedTx(STORE_A, "SRV/2026/07/007");
        expect(await generateInvoiceNumber(db, STORE_B, "SRV", JULY)).toBe("SRV/2026/07/001");
    });

    it("orders correctly past 009 (zero-padded string sort)", async () => {
        for (let i = 1; i <= 12; i++) {
            await seedTx(STORE_A, `SRV/2026/07/${String(i).padStart(3, "0")}`);
        }
        expect(await generateInvoiceNumber(db, STORE_A, "SRV", JULY)).toBe("SRV/2026/07/013");
    });
});
