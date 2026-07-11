import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

// Point @/db at the throwaway SQLite file built by the global setup, instead of
// the real local data/han-laptop.db. Must be a real Drizzle instance because
// TransactionService uses db.transaction(), db.query.*, insert/select/update.
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
    inventory,
    transactions,
    transactionItems,
    journalEntries,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { TransactionService } from "@/services/TransactionService";
import { transactionSchema } from "@/lib/validators";

const ORG_ID = "org-test-1";
const STORE_ID = "store-test-1";
const USER_ID = "user-test-1";
const ITEM_ID = "inv-test-1";

/** Wipe the tables each test writes to (parents are kept — FKs stay valid). */
async function resetTables() {
    await db.delete(journalEntries);
    await db.delete(transactionItems);
    await db.delete(transactions);
    await db.delete(inventory);
}

describe("TransactionService.createTransaction — Penjualan (sale)", () => {
    // Seed the FK parent chain once. FK enforcement stays ON, so this also
    // verifies the service only writes valid store/user references.
    beforeAll(async () => {
        await db.delete(organizations).catch(() => {});
        await db.insert(organizations).values({ id: ORG_ID, name: "Test Org" });
        await db.insert(stores).values({ id: STORE_ID, organizationId: ORG_ID, name: "Test Store" });
        await db.insert(user).values({
            id: USER_ID,
            name: "Tester",
            email: "tester@example.com",
            emailVerified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    });

    beforeEach(async () => {
        await resetTables();
        await db.insert(inventory).values({
            id: ITEM_ID,
            storeId: STORE_ID,
            itemName: "Laptop Bekas i5",
            category: "Laptop Bekas",
            quantity: 10,
            costPrice: 1_000_000,
            sellingPrice: 1_500_000,
            condition: "NEW",
            tracksSerialNumber: false,
            isConsignment: false,
        });
    });

    it("deducts stock and posts a balanced double-entry journal", async () => {
        const data = transactionSchema.parse({
            transactionType: "Penjualan",
            amount: 1_500_000,
            paymentMethod: "Cash",
            paymentStatus: "Lunas",
            items: [{ inventoryId: ITEM_ID, quantity: 1, unitPrice: 1_500_000 }],
        });

        const tx = await TransactionService.createTransaction({
            storeId: STORE_ID,
            userId: USER_ID,
            userName: "Tester",
            activeShiftId: null,
            data,
        });

        // Invoice numbering: INV/YYYY/MM/001 (first of the month for this store)
        expect(tx.invoiceNumber).toMatch(/^INV\/\d{4}\/\d{2}\/001$/);

        // Stock deducted 10 -> 9
        const [item] = await db.select().from(inventory).where(eq(inventory.id, ITEM_ID));
        expect(item.quantity).toBe(9);

        // Line item recorded
        const items = await db.select().from(transactionItems).where(eq(transactionItems.transactionId, tx.id));
        expect(items).toHaveLength(1);
        expect(items[0].quantity).toBe(1);
        expect(items[0].unitPrice).toBe(1_500_000);

        // Journal entries: Penjualan (cr 1.5M), HPP (dr 1M), Persediaan (cr 1M), Kas (dr 1.5M)
        const entries = await db.select().from(journalEntries).where(eq(journalEntries.transactionId, tx.id));
        const byName = Object.fromEntries(entries.map((e) => [e.accountName, e]));

        expect(byName["Penjualan Laptop"]).toMatchObject({ debit: 0, credit: 1_500_000 });
        expect(byName["HPP Laptop"]).toMatchObject({ debit: 1_000_000, credit: 0 });
        expect(byName["Persediaan"]).toMatchObject({ debit: 0, credit: 1_000_000 });
        expect(byName["Kas"]).toMatchObject({ debit: 1_500_000, credit: 0 });

        // Double-entry invariant: total debits === total credits
        const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
        const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
        expect(totalDebit).toBe(totalCredit);
        expect(totalDebit).toBe(2_500_000);
    });

    it("records the unpaid remainder as Piutang Usaha for a DP sale", async () => {
        const data = transactionSchema.parse({
            transactionType: "Penjualan",
            amount: 1_500_000,
            paymentMethod: "Cash",
            paymentStatus: "Belum Lunas",
            dpAmount: 500_000,
            items: [{ inventoryId: ITEM_ID, quantity: 1, unitPrice: 1_500_000 }],
        });

        const tx = await TransactionService.createTransaction({
            storeId: STORE_ID,
            userId: USER_ID,
            userName: "Tester",
            activeShiftId: null,
            data,
        });

        const entries = await db.select().from(journalEntries).where(eq(journalEntries.transactionId, tx.id));
        const byName = Object.fromEntries(entries.map((e) => [e.accountName, e]));

        // DP 500k to Kas, remaining 1M to Piutang Usaha
        expect(byName["Kas"]).toMatchObject({ debit: 500_000, credit: 0 });
        expect(byName["Piutang Usaha"]).toMatchObject({ debit: 1_000_000, credit: 0 });

        const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
        const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
        expect(totalDebit).toBe(totalCredit);
    });

    it("rejects a sale when stock is insufficient and does not deduct stock", async () => {
        const data = transactionSchema.parse({
            transactionType: "Penjualan",
            amount: 1_500_000,
            paymentMethod: "Cash",
            paymentStatus: "Lunas",
            items: [{ inventoryId: ITEM_ID, quantity: 999, unitPrice: 1_500_000 }],
        });

        await expect(
            TransactionService.createTransaction({
                storeId: STORE_ID,
                userId: USER_ID,
                userName: "Tester",
                activeShiftId: null,
                data,
            })
        ).rejects.toThrow();

        // Atomic rollback: stock stays at 10
        const [item] = await db.select().from(inventory).where(eq(inventory.id, ITEM_ID));
        expect(item.quantity).toBe(10);
    });
});
