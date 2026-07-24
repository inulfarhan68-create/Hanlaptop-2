import { describe, it, expect, vi } from "vitest";

// auth-guard imports the db client, Better-Auth, and next/headers at module load.
// Stub them so we can import the PURE isolation helpers (storeScope / requireWritable
// / requireWriteAccess) without booting any of that — none of the three touch them.
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/lib/auth", () => ({ auth: {} }));
vi.mock("next/headers", () => ({
    headers: async () => new Headers(),
    cookies: async () => ({ get: () => undefined }),
}));

import { PgDialect } from "drizzle-orm/pg-core";
import { and, eq, type SQL } from "drizzle-orm";
import { NextResponse } from "next/server";
import { inventory } from "@/db/schema";
import { storeScope, requireWritable, requireWriteAccess } from "@/lib/auth-guard";

/**
 * Guards the Phase-2 tenant-isolation primitives that every route fix leans on:
 *  - storeScope() — the WHERE condition that bounds a query to the caller's stores.
 *  - requireWritable() / requireWriteAccess() — the demo read-only lock (D4).
 *
 * storeScope returns a Drizzle SQL condition (or undefined); we render it to SQL text
 * with PgDialect so we can assert the actual semantics without a database.
 */
const dialect = new PgDialect();
const render = (cond: SQL) => dialect.sqlToQuery(cond);

describe("storeScope — tenant boundary for the 'all' path", () => {
    it("platform_admin (accessibleStoreIds === null) → undefined (no filter, global)", () => {
        expect(storeScope({ accessibleStoreIds: null }, inventory.storeId)).toBeUndefined();
    });

    it("no accessible stores (empty) → always-false (fail closed, sees nothing)", () => {
        const cond = storeScope({ accessibleStoreIds: [] }, inventory.storeId);
        expect(cond).toBeDefined();
        const q = render(cond as SQL);
        expect(q.sql).toBe("false");
        expect(q.params).toEqual([]);
    });

    it("tenant with stores → inArray(column, ids) — scopes to exactly those stores", () => {
        const cond = storeScope({ accessibleStoreIds: ["store-a", "store-b"] }, inventory.storeId);
        const q = render(cond as SQL);
        expect(q.sql).toContain("store_id");
        expect(q.sql.toLowerCase()).toContain("in (");
        expect(q.params).toEqual(["store-a", "store-b"]);
    });

    it("G1 IDOR pattern: and(eq(id, x), storeScope(...)) keeps BOTH the id and the store filter", () => {
        // This is exactly the shape the transaction/transfer/crm fixes use so an owner
        // cannot fetch another org's row by id.
        const cond = and(
            eq(inventory.id, "row-from-org-b"),
            storeScope({ accessibleStoreIds: ["store-a"] }, inventory.storeId),
        );
        const q = render(cond as SQL);
        expect(q.sql).toContain("store_id"); // the tenant bound is present…
        expect(q.params).toContain("row-from-org-b"); // …alongside the id lookup
        expect(q.params).toContain("store-a");
    });

    it("platform_admin id-lookup: undefined scope drops out of and() → only the id filter remains", () => {
        const cond = and(
            eq(inventory.id, "x"),
            storeScope({ accessibleStoreIds: null }, inventory.storeId),
        );
        const q = render(cond as SQL);
        expect(q.sql).not.toContain("store_id"); // unbounded — global operator
        expect(q.params).toEqual(["x"]);
    });
});

describe("requireWritable — demo read-only lock (D4)", () => {
    it("blocks a read-only (demo) tenant with 403", () => {
        const res = requireWritable({ isReadOnly: true });
        expect(res).toBeInstanceOf(NextResponse);
        expect((res as NextResponse).status).toBe(403);
    });

    it("allows a normal tenant (null)", () => {
        expect(requireWritable({ isReadOnly: false })).toBeNull();
        expect(requireWritable({})).toBeNull();
    });
});

describe("requireWriteAccess — investor + demo read-only", () => {
    it("blocks a demo tenant regardless of role (even owner)", () => {
        const res = requireWriteAccess({ storeRole: "owner", isReadOnly: true });
        expect(res).toBeInstanceOf(NextResponse);
        expect((res as NextResponse).status).toBe(403);
    });

    it("blocks the investor role (read-only)", () => {
        expect(requireWriteAccess({ storeRole: "investor" })).toBeInstanceOf(NextResponse);
    });

    it("allows a writable role in a normal tenant", () => {
        expect(requireWriteAccess({ storeRole: "owner", isReadOnly: false })).toBeNull();
        expect(requireWriteAccess({ storeRole: "kasir" })).toBeNull();
    });
});
