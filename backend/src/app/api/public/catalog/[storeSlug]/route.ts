import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventory, stores, storeSettings } from "@/db/schema";
import { eq, and, gt, or } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ storeSlug: string }> }) {
    try {
        const { storeSlug } = await params;
        
        // 1. Find store by slug or ID
        const storeResult = await db.select().from(stores).where(
            or(
                eq(stores.slug, storeSlug),
                eq(stores.id, storeSlug)
            )
        );
        const store = storeResult[0];

        if (!store || !store.isActive) {
            return NextResponse.json({ error: "Store not found or inactive" }, { status: 404 });
        }

        // 2. Fetch public catalog inventory (isPublished = true, quantity > 0, NOT in inspection)
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
                barcode: true, // PRD: Expose SN/barcode for WhatsApp CTA
                quantity: true,
                sellingPrice: true,
                condition: true,
                imageUrl: true,
                // Do not expose costPrice, supplierId, or isConsignment
            }
        });

        // Filter out IN_INSPECTION items from public view
        const visibleItems = catalogItems.filter(item => item.condition !== 'IN_INSPECTION');

        // 3. Fetch store settings (for logo/contact/WhatsApp)
        const settingsResult = await db.select().from(storeSettings).where(eq(storeSettings.storeId, store.id));
        const settings = settingsResult[0];

        const storePhone = store.phone || settings?.storePhone || '';
        
        // 4. Generate WhatsApp CTA for each item per PRD spec
        const itemsWithCTA = visibleItems.map(item => {
            const sn = item.barcode || '-';
            // PRD format: "Halo, saya tertarik dengan laptop [Nama Unit] - SN: [Nomor SN] yang ada di katalog online."
            const waMessage = encodeURIComponent(
                `Halo, saya tertarik dengan laptop ${item.itemName} - SN: ${sn} yang ada di katalog online.`
            );
            const waNumber = storePhone.replace(/[^0-9]/g, '').replace(/^0/, '62');
            const waLink = waNumber ? `https://wa.me/${waNumber}?text=${waMessage}` : null;

            return {
                ...item,
                waLink,
            };
        });

        return NextResponse.json({
            store: {
                name: store.name,
                address: store.address,
                phone: store.phone,
                logo: settings?.storeLogo,
            },
            items: itemsWithCTA
        });
    } catch (error: any) {
        console.error("Public Catalog API error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
