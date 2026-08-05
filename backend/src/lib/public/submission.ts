import { db } from "@/db";
import { stores } from "@/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * Resolve the store an anonymous submission is aimed at.
 *
 * The public forms (service booking, buyback lead) are the only writers with no
 * session behind them, so the target store cannot come from a guard — it arrives
 * in the request body. It therefore has to be checked here: the id must belong to
 * a real, active store.
 *
 * Both routes previously wrote `storeId: storeId || 'default'` straight into the
 * insert. No store has the id "default", so a submission without one blew up on
 * the foreign key and returned 500 to the customer instead of a usable error.
 *
 * Note what this does NOT do: store ids are public (getPublicCatalog returns
 * `store.id`), so anyone can aim a submission at any shop. That is the feature —
 * a customer books at the shop they chose. What keeps it from being abused is
 * rate limiting at the route, not secrecy here.
 */
export async function resolvePublicStore(storeId: string): Promise<{ id: string } | null> {
    const [store] = await db
        .select({ id: stores.id })
        .from(stores)
        .where(and(eq(stores.id, storeId), eq(stores.isActive, true)))
        .limit(1);
    return store ?? null;
}
