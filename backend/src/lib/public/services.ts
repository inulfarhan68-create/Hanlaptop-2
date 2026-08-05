import { cache } from "react";
import { db } from "@/db";
import { serviceOrders, storeSettings, stores } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface PublicServiceData {
  serviceOrder: any;
  storeSettings: any;
}

/**
 * Fetch a public service order by ID.
 * Used by both the Server Component (page.tsx) and the API route.
 */
// cache(): generateMetadata and the page component both call this within the
// same request — dedupe so the DB is hit once per request, not twice.
export const getPublicService = cache(async (id: string): Promise<
  | { data: PublicServiceData }
  | { error: string; status: number }
> => {
  // Public and unauthenticated, same as the sales nota — select what the service
  // receipt prints, nothing more. `parts: true` used to include serviceParts.costPrice
  // alongside the unitPrice charged, publishing the shop's margin on every spare
  // part; normalizeServiceParts only ever reads inventoryId/itemName/unitPrice/quantity.
  const serviceOrder = await db.query.serviceOrders.findFirst({
    where: eq(serviceOrders.id, id),
    columns: {
      id: true,
      status: true,
      deviceName: true,
      issue: true,
      notes: true,
      customerName: true,
      customerPhone: true,
      customerAddress: true,
      technicianName: true,
      estimatedCost: true,
      finalCost: true,
      receivedDate: true,
      completedDate: true,
      warrantyUntil: true,
      rating: true,
      ratingComment: true,
      // Not printed — resolves the store's letterhead below.
      storeId: true,
    },
    with: {
      parts: {
        columns: { id: true, inventoryId: true, itemName: true, quantity: true, unitPrice: true },
      },
      customer: { columns: { name: true, phone: true, address: true } },
    },
  });

  if (!serviceOrder) {
    return { error: "Data servis tidak ditemukan.", status: 404 };
  }

  const settings = await db.query.storeSettings.findFirst({
    where: eq(storeSettings.storeId, serviceOrder.storeId),
  });

  let storeInfo = null;
  if (!settings) {
    storeInfo = await db.query.stores.findFirst({
      where: eq(stores.id, serviceOrder.storeId),
    });
  }

  let parsedBanks: any[] = [];
  if (settings?.storeBanks) {
    try {
      parsedBanks = JSON.parse(settings.storeBanks);
    } catch (e) {
      console.error("Failed to parse storeBanks", e);
    }
  }

  return {
    data: {
      serviceOrder,
      storeSettings: settings
        ? {
            ...settings,
            storeBanks: parsedBanks,
          }
        : {
            storeName: storeInfo?.name || "HanLaptop",
            storeAddress: storeInfo?.address || "Jl. Komputer Raya No.123",
            storePhone: storeInfo?.phone || "0812-3456-7890",
            storeLogo: null,
            storeFooter:
              "Terima kasih atas kunjungan Anda.\nBarang yang sudah dibeli\ntidak dapat ditukar/dikembalikan.",
            storeBanks: [],
          },
    },
  };
});
