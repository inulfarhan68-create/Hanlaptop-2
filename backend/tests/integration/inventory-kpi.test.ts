import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Same throwaway-Postgres wiring as the other integration tests: point @/db at
// the test database with a real Drizzle instance so the KPI route's aggregation
// queries run for real against seeded rows.
vi.mock("@/db", async () => {
    const postgres = (await import("postgres")).default;
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const schema = await import("@/db/schema");
    const url = process.env.TEST_DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres";
    const client = postgres(url, { max: 1 });
    return { db: drizzle(client, { schema }) };
});

const STORE_ID = "store-kpi-1";
const ORG_ID = "org-kpi-1";
const USER_ID = "user-kpi-1";

// The route only calls requireAuth(); return an AuthContext scoped to the test
// store so the KPI queries filter to our seeded rows.
vi.mock("@/lib/auth-guard", () => ({
    requireAuth: async () => ({
        session: { user: { id: USER_ID, role: "owner" } },
        storeId: STORE_ID,
        storeRole: "owner",
        user: { id: USER_ID, role: "owner" },
    }),
}));

import { db } from "@/db";
import { organizations, stores, user, inventory } from "@/db/schema";
import { eq } from "drizzle-orm";
import { GET } from "@/app/api/inventory/kpi/route";

function daysAgo(n: number) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
}

async function cleanup() {
    await db.delete(inventory).where(eq(inventory.storeId, STORE_ID));
    await db.delete(stores).where(eq(stores.id, STORE_ID));
    await db.delete(organizations).where(eq(organizations.id, ORG_ID));
    await db.delete(user).where(eq(user.id, USER_ID));
}

describe("GET /api/inventory/kpi — date-bucketed stock counts", () => {
    beforeAll(async () => {
        await cleanup();
        await db.insert(organizations).values({ id: ORG_ID, name: "KPI Org" });
        await db.insert(stores).values({ id: STORE_ID, organizationId: ORG_ID, name: "KPI Store" });
        await db.insert(user).values({
            id: USER_ID,
            name: "KPI Tester",
            email: "kpi-tester@example.com",
            emailVerified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        // Three in-stock items straddling the 30/60-day buckets the route computes.
        await db.insert(inventory).values([
            { storeId: STORE_ID, itemName: "Fresh Laptop", category: "laptop", quantity: 10, createdAt: daysAgo(10) },
            { storeId: STORE_ID, itemName: "Slow Laptop", category: "laptop", quantity: 5, createdAt: daysAgo(45) },
            { storeId: STORE_ID, itemName: "Dead Laptop", category: "laptop", quantity: 3, createdAt: daysAgo(75) },
        ]);
    });

    afterAll(cleanup);

    it("returns 200 without a Date-serialization crash and buckets by age", async () => {
        // Before the fix the slow/dead queries built `sql\`created_at < ${date}\``,
        // which passed a raw Date to postgres-js and threw ERR_INVALID_ARG_TYPE →
        // the route 500'd. lt(inventory.createdAt, date) serializes it correctly.
        const res = await GET(new Request("http://localhost/api/inventory/kpi"));
        expect(res.status).toBe(200);

        const body = await res.json();
        // 45-day item falls in the 30–60 day (slow-moving) bucket.
        expect(body.slowMovingCount).toBeGreaterThanOrEqual(1);
        // 75-day item falls in the >60 day (dead-stock) bucket.
        expect(body.deadStockCount).toBeGreaterThanOrEqual(1);
        // All three are in-stock laptops.
        expect(body.laptop.qty).toBe(18);
    });
});
