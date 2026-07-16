import { cache } from "react";
import { db } from "@/db";
import { inventory, stores, storeSettings } from "@/db/schema";
import { eq, and, gt, or } from "drizzle-orm";

export interface PublicCatalogData {
  store: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    logo: string | null;
    slug: string;
  };
  branches: { name: string; slug: string }[];
  items: any[];
}

/**
 * Fetch the public catalog for a store by slug or ID.
 * Used by both the Server Component (page.tsx) and the API route.
 *
 * `"default"` is a sentinel meaning "this shop's main store": the landing page
 * links to /catalog/{slug} before it knows any real slug (first-time visitors
 * have nothing in localStorage), and the legacy schema also uses "default" as
 * the fallback storeId. Resolving it to the first active store keeps those
 * links working. Any OTHER unknown slug still 404s — we must not silently
 * serve the main store under an arbitrary URL (duplicate content / confusion).
 */
// cache(): generateMetadata and the page component both call this within the
// same request — dedupe so the DB is hit once per request, not twice.
export const getPublicCatalog = cache(async (storeSlug: string): Promise<
  | { data: PublicCatalogData }
  | { error: string; status: number }
> => {
  // 1. Find store: "default" -> the shop's main (first active) store,
  //    otherwise an exact slug/ID match.
  const storeResult =
    storeSlug === "default"
      ? await db.select().from(stores).where(eq(stores.isActive, true)).limit(1)
      : await db
          .select()
          .from(stores)
          .where(or(eq(stores.slug, storeSlug), eq(stores.id, storeSlug)));
  const store = storeResult[0];

  if (!store || !store.isActive) {
    return { error: "Store not found or inactive", status: 404 };
  }

  // 2. Fetch public catalog inventory (isPublished = true, quantity > 0)
  const catalogItems = await db.query.inventory.findMany({
    where: and(
      eq(inventory.storeId, store.id),
      eq(inventory.isPublished, true),
      gt(inventory.quantity, 0)
    ),
    columns: {
      id: true,
      itemName: true,
      category: true,
      specs: true,
      barcode: true,
      quantity: true,
      sellingPrice: true,
      condition: true,
      imageUrl: true,
    },
  });

  // Filter out IN_INSPECTION items
  const visibleItems = catalogItems.filter(
    (item) => item.condition !== "IN_INSPECTION"
  );

  // 3. Fetch store settings (for logo/contact/WhatsApp)
  const settingsResult = await db
    .select()
    .from(storeSettings)
    .where(eq(storeSettings.storeId, store.id));
  const settings = settingsResult[0];

  const storePhone = store.phone || settings?.storePhone || "";

  // 4. Generate WhatsApp CTA for each item
  const itemsWithCTA = visibleItems.map((item) => {
    const sn = item.barcode || "-";
    const waMessage = encodeURIComponent(
      `Halo, saya tertarik dengan laptop ${item.itemName} - SN: ${sn} yang ada di katalog online.`
    );
    const waNumber = storePhone.replace(/[^0-9]/g, "").replace(/^0/, "62");
    const waLink = waNumber
      ? `https://wa.me/${waNumber}?text=${waMessage}`
      : null;

    return {
      ...item,
      waLink,
    };
  });

  // 5. Find all active branches
  const otherStores = await db
    .select({
      id: stores.id,
      name: stores.name,
      slug: stores.slug,
    })
    .from(stores)
    .where(eq(stores.isActive, true));

  return {
    data: {
      store: {
        id: store.id,
        name: store.name,
        address: store.address,
        phone: store.phone,
        logo: settings?.storeLogo || null,
        slug: store.slug || store.id,
      },
      branches: otherStores.map((b) => ({
        name: b.name,
        slug: b.slug || b.id,
      })),
      items: itemsWithCTA,
    },
  };
});
