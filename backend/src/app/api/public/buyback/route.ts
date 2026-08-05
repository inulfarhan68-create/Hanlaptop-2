import { NextResponse } from "next/server";
import { db } from "@/db";
import { buybackLeads } from "@/db/schema";
import { checkRateLimit } from "@/lib/rate-limit";
import { publicBuybackLeadSchema } from "@/lib/validators";
import { resolvePublicStore } from "@/lib/public/submission";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    // Same reasoning as the public service booking: unauthenticated write into a
    // shop's CRM leads, aimed by a store id anyone can read off the public
    // catalog. Rate limiting is what stops it being a spam funnel.
    const rateLimited = await checkRateLimit(request, 5, 60_000);
    if (rateLimited) return rateLimited;

    try {
        const parsed = publicBuybackLeadSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Data pengajuan tidak lengkap", details: parsed.error.format() },
                { status: 400 }
            );
        }
        const {
            storeId, customerName, customerPhone, brand, processor, ram, storage,
            condition, completeness, estimatedMarketPrice, estimatedOfferPriceMin,
            estimatedOfferPriceMax, type, targetLaptopName, targetLaptopPrice,
        } = parsed.data;

        const store = await resolvePublicStore(storeId);
        if (!store) {
            return NextResponse.json({ error: "Toko tujuan tidak ditemukan" }, { status: 404 });
        }

        const [lead] = await db.insert(buybackLeads).values({
            storeId: store.id,
            customerName,
            customerPhone,
            brand,
            processor,
            ram,
            storage,
            condition,
            completeness,
            estimatedMarketPrice,
            estimatedOfferPriceMin,
            estimatedOfferPriceMax,
            status: 'PENDING',
            type,
            targetLaptopName: targetLaptopName || null,
            targetLaptopPrice: targetLaptopPrice ?? null,
            createdAt: new Date()
        }).returning();

        return NextResponse.json({ success: true, lead });
    } catch (error: any) {
        console.error("Failed to submit buyback lead:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
