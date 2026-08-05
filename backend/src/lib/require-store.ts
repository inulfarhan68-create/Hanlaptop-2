import { NextResponse } from "next/server";

/**
 * Refuse a write that has no concrete store behind it.
 *
 * `authResult.storeId` is `"all"` for an owner — a sentinel meaning "every store
 * I can reach", not a store id. Reads handle it through `storeScope()`, which
 * expands it to the tenant's real store ids. Writes cannot: a row belongs to one
 * store, and these tables carry a foreign key to `stores.id`, so persisting
 * `"all"` violates it and the caller gets a bare 500.
 *
 * That is not a hypothetical. An owner's branch selector defaults to "all"
 * (`BranchSelector`: `isOwner ? 'all' : …`), and several of these routes are
 * owner-only — so it was the first thing an owner hit.
 *
 * Returns a 400 explaining what to do, or null when the caller has a real store.
 */
export function requireSpecificStore(
    authResult: { storeId: string },
    /** What is being created, for the message — e.g. "akun", "klaim garansi". */
    what: string
): NextResponse | null {
    if (authResult.storeId !== "all") return null;
    return NextResponse.json(
        { error: `Pilih cabang spesifik dulu — ${what} dimiliki oleh satu cabang.` },
        { status: 400 }
    );
}
