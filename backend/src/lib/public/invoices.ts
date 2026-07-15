import { db } from "@/db";
import { transactions, storeSettings, stores } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface PublicInvoiceData {
  transaction: any;
  storeSettings: any;
}

/**
 * Fetch a public invoice by ID.
 * Used by both the Server Component (page.tsx) and the API route.
 */
export async function getPublicInvoice(id: string): Promise<
  | { data: PublicInvoiceData }
  | { error: string; status: number; isVoided?: boolean }
> {
  let cleanId = id;
  if (id.includes("-")) {
    const parts = id.split("-");
    if (parts.length > 5) {
      parts.pop();
      cleanId = parts.join("-");
    }
  }

  const tx = await db.query.transactions.findFirst({
    where: eq(transactions.id, cleanId),
    with: {
      items: {
        with: {
          inventoryItem: true,
        },
      },
      journals: true,
      customer: true,
    },
  });

  if (!tx) {
    return { error: "Invoice tidak ditemukan.", status: 404 };
  }

  if (tx.isVoided) {
    return {
      error: "Invoice ini telah dibatalkan.",
      status: 410,
      isVoided: true,
    };
  }

  const settings = await db.query.storeSettings.findFirst({
    where: eq(storeSettings.storeId, tx.storeId),
  });

  let storeInfo = null;
  if (!settings) {
    storeInfo = await db.query.stores.findFirst({
      where: eq(stores.id, tx.storeId),
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
      transaction: tx,
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
