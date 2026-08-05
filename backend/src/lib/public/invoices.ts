import { cache } from "react";
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
// cache(): generateMetadata and the page component both call this within the
// same request — dedupe so the DB is hit once per request, not twice.
export const getPublicInvoice = cache(async (id: string): Promise<
  | { data: PublicInvoiceData }
  | { error: string; status: number; isVoided?: boolean }
> => {
  let cleanId = id;
  if (id.includes("-")) {
    const parts = id.split("-");
    if (parts.length > 5) {
      parts.pop();
      cleanId = parts.join("-");
    }
  }

  // Every column here reaches the open internet: a nota link is handed to the
  // customer and forwarded over WhatsApp, with no auth on the way in. So this
  // selects the fields the receipt prints and nothing else.
  //
  // It used to return the whole transaction row with `inventoryItem: true`,
  // `journals: true` and `customer: true`. That published the shop's costPrice
  // and supplierId for every item sold, the double-entry journal lines behind
  // the sale, and the customer's full record — anyone holding a nota link could
  // read the margin on their own purchase. costPrice is masked from a cashier
  // (CLAUDE.md #10); it must not be world-readable.
  const tx = await db.query.transactions.findFirst({
    where: eq(transactions.id, cleanId),
    columns: {
      id: true,
      invoiceNumber: true,
      transactionType: true,
      transactionDate: true,
      amount: true,
      discountAmount: true,
      dpAmount: true,
      dueDate: true,
      paymentMethod: true,
      paymentStatus: true,
      description: true,
      customerName: true,
      // Not printed — needed below to resolve the store's letterhead and to
      // refuse a voided nota.
      storeId: true,
      isVoided: true,
    },
    with: {
      items: {
        columns: { id: true, quantity: true, unitPrice: true, serialNumbers: true },
        // itemName only: the rest of the inventory row is internal.
        with: { inventoryItem: { columns: { itemName: true } } },
      },
      // The receipt shows who it is addressed to, not the CRM record (no notes).
      customer: { columns: { name: true, phone: true, address: true } },
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
            // This feeds the public, customer-facing nota. A shop that hasn't
            // filled in its details shows nothing rather than a placeholder
            // address and phone number that belong to nobody.
            storeName: storeInfo?.name || "",
            storeAddress: storeInfo?.address || "",
            storePhone: storeInfo?.phone || "",
            storeLogo: null,
            storeFooter:
              "Terima kasih atas kunjungan Anda.\nBarang yang sudah dibeli\ntidak dapat ditukar/dikembalikan.",
            storeBanks: [],
          },
    },
  };
});
