import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

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
import { getAgingReport } from "@/services/ReceivablesService";
import type { AuthContext } from "@/lib/auth-guard";

/**
 * The aging buckets moved from the browser into SQL so the lists can be paginated
 * without the totals going wrong. The boundaries are the fragile part: the old
 * client compared whole days (`ceil((today - due) / 1 day) <= 30`) while the query
 * compares timestamps against midnight-anchored thresholds. These cases pin the two
 * to the same answer at every edge.
 */

const ORG = "org-aging";
const STORE = "store-aging";
const OTHER_STORE = "store-aging-other";

/** Minimal AuthContext — getAgingReport only reads the store-scoping fields. */
function ctx(storeId: string, accessible: string[]): AuthContext {
    return {
        session: {} as any,
        user: { id: "u-aging", role: "owner" } as any,
        storeId,
        storeRole: "owner",
        organizationId: ORG,
        isPlatformAdmin: false,
        isImpersonating: false,
        accessibleStoreIds: accessible,
        plan: null,
        isReadOnly: false,
    } as AuthContext;
}

/** A due date exactly `days` past midnight today, with a mid-afternoon time. */
function dueDaysAgo(days: number): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - days);
    d.setHours(14, 30, 0, 0); // time-of-day must not shift the bucket
    return d;
}

let seq = 0;
async function seedUnpaid(opts: {
    storeId?: string;
    type?: string;
    amount: number;
    dp?: number;
    dueDate: Date | null;
}) {
    const id = `tx-aging-${++seq}`;
    await db.insert(transactions).values({
        id,
        storeId: opts.storeId ?? STORE,
        transactionType: opts.type ?? "Penjualan",
        amount: opts.amount,
        dpAmount: opts.dp ?? 0,
        paymentStatus: "Belum Lunas",
        transactionDate: new Date(),
        dueDate: opts.dueDate,
        invoiceNumber: `AGE/${id}`,
    });
    return id;
}

async function cleanup() {
    for (const s of [STORE, OTHER_STORE]) {
        await db.delete(stores).where(eq(stores.id, s)); // cascades to transactions
    }
    await db.delete(organizations).where(eq(organizations.id, ORG));
}

beforeAll(async () => {
    await cleanup();
    await db.insert(organizations).values({ id: ORG, name: "Aging Org" });
    await db.insert(stores).values([
        { id: STORE, organizationId: ORG, name: "Aging Store" },
        { id: OTHER_STORE, organizationId: ORG, name: "Aging Other" },
    ]);

    // One receivable per bucket edge. Amount encodes the expected bucket so a
    // misfiled row is obvious from the totals.
    await seedUnpaid({ amount: 1_000_000, dueDate: null });               // current (no due date)
    await seedUnpaid({ amount: 1_000_000, dueDate: dueDaysAgo(-5) });     // current (due in future)
    await seedUnpaid({ amount: 1_000_000, dueDate: dueDaysAgo(0) });      // current (due today)
    await seedUnpaid({ amount: 2_000_000, dueDate: dueDaysAgo(1) });      // d1_30 lower edge
    await seedUnpaid({ amount: 2_000_000, dueDate: dueDaysAgo(30) });     // d1_30 upper edge
    await seedUnpaid({ amount: 4_000_000, dueDate: dueDaysAgo(31) });     // d31_60 lower edge
    await seedUnpaid({ amount: 4_000_000, dueDate: dueDaysAgo(60) });     // d31_60 upper edge
    await seedUnpaid({ amount: 8_000_000, dueDate: dueDaysAgo(61) });     // d60plus

    // Partially paid: only the remainder should count.
    await seedUnpaid({ amount: 5_000_000, dp: 1_500_000, dueDate: dueDaysAgo(10) }); // +3.5jt to d1_30

    // A payable must not show up in the receivables report.
    await seedUnpaid({ type: "Pembelian Stok", amount: 7_000_000, dueDate: dueDaysAgo(40) });

    // Another store's receivable must never leak.
    await seedUnpaid({ storeId: OTHER_STORE, amount: 99_000_000, dueDate: dueDaysAgo(5) });
});

afterAll(async () => {
    await cleanup();
});

describe("getAgingReport — bucket boundaries", () => {
    it("files each row in the same bucket the UI used to compute", async () => {
        const r = await getAgingReport(ctx(STORE, [STORE]), { kind: "receivable" });
        const b = r.summary.buckets;

        expect(b.current.count).toBe(3);
        expect(b.current.total).toBe(3_000_000);

        // 2jt + 2jt + the 3.5jt remainder of the partially paid invoice
        expect(b.d1_30.count).toBe(3);
        expect(b.d1_30.total).toBe(7_500_000);

        expect(b.d31_60.count).toBe(2);
        expect(b.d31_60.total).toBe(8_000_000);

        expect(b.d60plus.count).toBe(1);
        expect(b.d60plus.total).toBe(8_000_000);
    });

    it("totals the outstanding remainder, not the invoice face value", async () => {
        const r = await getAgingReport(ctx(STORE, [STORE]), { kind: "receivable" });
        // 3jt + 7.5jt + 8jt + 8jt
        expect(r.summary.total).toBe(26_500_000);
        expect(r.summary.count).toBe(9);
    });

    it("keeps receivables and payables apart", async () => {
        const rec = await getAgingReport(ctx(STORE, [STORE]), { kind: "receivable" });
        const pay = await getAgingReport(ctx(STORE, [STORE]), { kind: "payable" });

        expect(rec.summary.total).toBe(26_500_000);   // excludes the 7jt purchase
        expect(pay.summary.total).toBe(7_000_000);
        expect(pay.summary.buckets.d31_60.count).toBe(1);
    });

    it("does not leak another store's rows", async () => {
        const r = await getAgingReport(ctx(STORE, [STORE]), { kind: "receivable" });
        expect(r.summary.total).toBe(26_500_000);     // not 125.5jt

        const other = await getAgingReport(ctx(OTHER_STORE, [OTHER_STORE]), { kind: "receivable" });
        expect(other.summary.total).toBe(99_000_000);
    });
});

describe("getAgingReport — list, filter and pagination", () => {
    it("summary spans everything while the list honours the bucket filter", async () => {
        const r = await getAgingReport(ctx(STORE, [STORE]), { kind: "receivable", bucket: "d60plus" });

        // Cards keep showing the whole picture...
        expect(r.summary.total).toBe(26_500_000);
        // ...while the rows narrow to the selected bucket.
        expect(r.pagination.totalItems).toBe(1);
        expect(r.items).toHaveLength(1);
    });

    it("paginates without changing the totals", async () => {
        const first = await getAgingReport(ctx(STORE, [STORE]), { kind: "receivable", page: 1, limit: 4 });
        const second = await getAgingReport(ctx(STORE, [STORE]), { kind: "receivable", page: 2, limit: 4 });

        expect(first.items).toHaveLength(4);
        expect(second.items).toHaveLength(4);
        expect(first.pagination.totalItems).toBe(9);
        expect(first.pagination.totalPages).toBe(3);

        // The point of the whole change: a capped page still reports the full debt.
        expect(first.summary.total).toBe(26_500_000);
        expect(second.summary.total).toBe(26_500_000);

        const firstIds = new Set((first.items as any[]).map((t) => t.id));
        const overlap = (second.items as any[]).filter((t) => firstIds.has(t.id));
        expect(overlap).toHaveLength(0);
    });

    it("searches by invoice number", async () => {
        const all = await getAgingReport(ctx(STORE, [STORE]), { kind: "receivable" });
        const target = (all.items as any[])[0];

        const found = await getAgingReport(ctx(STORE, [STORE]), {
            kind: "receivable",
            search: target.invoiceNumber,
        });
        expect(found.pagination.totalItems).toBe(1);
        expect((found.items as any[])[0].id).toBe(target.id);
    });
});
