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
export async function getPublicService(id: string): Promise<
  | { data: PublicServiceData }
  | { error: string; status: number }
> {
  const serviceOrder = await db.query.serviceOrders.findFirst({
    where: eq(serviceOrders.id, id),
    with: { customer: true, parts: true },
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
}
