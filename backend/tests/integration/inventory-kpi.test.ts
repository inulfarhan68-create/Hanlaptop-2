import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Same throwaway-Postgres wiring as the other integration tests: point @/db at
// the test database with a real Drizzle instance so the date-bucketed count
// queries run for real against seeded rows.
vi.mock("@/db", async () => {
    const postgres = (await import("postgres")).default;
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const schema = await import("@/db/schema");
    const url = process.env.TEST_DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres";
    const client = postgres(url, { max: 1 });
    return { db: drizzle(client, { schema }) };
});

import { db } from "@/db";
import { organizations, stores, inventory } from "@/db/schema";
import { and, count, eq, gte, lt, isNull } from "drizzle-orm";

const STORE_ID = "store-kpi-1";
const ORG_ID = "org-kpi-1";

function daysAgo(n: number) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
}

async function cleanup() {
    await db.delete(inventory).where(eq(inventory.storeId, STORE_ID));
    await db.delete(stores).where(eq(stores.id, STORE_ID));
    await db.delete(organizations).where(eq(organizations.id, ORG_ID));
}

// Reproduces the exact bug behind the /api/inventory/kpi 500: its slow-moving
// (30–60 day) and dead-stock (>60 day) buckets compared inventory.createdAt to a
// JS Date. Built as a raw `sql`created_at < ${date}`` the Date reached postgres-js
// untouched and threw ERR_INVALID_ARG_TYPE; drizzle's lt()/gte() apply the
// column's driver mapping (Date -> ISO string) so the query runs. This asserts
// the fixed helper-based comparisons execute and bucket by age.
describe("inventory KPI — date-bucketed stock counts (Date via lt/gte)", () => {
    beforeAll(async () => {
        await cleanup();
        await db.insert(organizations).values({ id: ORG_ID, name: "KPI Org" });
        await db.insert(stores).values({ id: STORE_ID, organizationId: ORG_ID, name: "KPI Store" });
        await db.insert(inventory).values([
            { storeId: STORE_ID, itemName: "Fresh Laptop", category: "laptop", quantity: 10, createdAt: daysAgo(10) },
            { storeId: STORE_ID, itemName: "Slow Laptop", category: "laptop", quantity: 5, createdAt: daysAgo(45) },
            { storeId: STORE_ID, itemName: "Dead Laptop", category: "laptop", quantity: 3, createdAt: daysAgo(75) },
        ]);
    });

    afterAll(cleanup);

    const thirtyDaysAgo = daysAgo(30);
    const sixtyDaysAgo = daysAgo(60);
    const active = and(eq(inventory.storeId, STORE_ID), isNull(inventory.deletedAt));

    it("slow-moving bucket (30–60 days) runs without a Date crash and counts the 45-day item", async () => {
        const [row] = await db
            .select({ count: count() })
            .from(inventory)
            .where(and(active, gte(inventory.createdAt, sixtyDaysAgo), lt(inventory.createdAt, thirtyDaysAgo)));
        // Only "Slow Laptop" (45 days) sits in [60d, 30d); fresh (10d) and dead (75d) are outside.
        expect(row.count).toBe(1);
    });

    it("dead-stock bucket (>60 days) runs without a Date crash and counts the 75-day item", async () => {
        const [row] = await db
            .select({ count: count() })
            .from(inventory)
            .where(and(active, lt(inventory.createdAt, sixtyDaysAgo)));
        // Only "Dead Laptop" (75 days) is older than 60 days.
        expect(row.count).toBe(1);
    });
});
