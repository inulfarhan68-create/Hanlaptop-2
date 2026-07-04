import { NextResponse } from "next/server";
import { db } from "@/db";
import { buybackLeads } from "@/db/schema";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            storeId,
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
            type,
            targetLaptopName,
            targetLaptopPrice
        } = body;

        // Validation
        if (!customerName || !customerPhone || !brand || !processor || !ram || !storage || !condition || !completeness) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Insert into database
        const newLead = await db.insert(buybackLeads).values({
            storeId: storeId || 'default',
            customerName,
            customerPhone,
            brand,
            processor,
            ram,
            storage,
            condition,
            completeness,
            estimatedMarketPrice: Number(estimatedMarketPrice) || 0,
            estimatedOfferPriceMin: Number(estimatedOfferPriceMin) || 0,
            estimatedOfferPriceMax: Number(estimatedOfferPriceMax) || 0,
            status: 'PENDING',
            type: type || 'JUAL_LAPTOP',
            targetLaptopName: targetLaptopName || null,
            targetLaptopPrice: targetLaptopPrice ? Number(targetLaptopPrice) : null,
            createdAt: new Date()
        }).returning();

        return NextResponse.json({ success: true, lead: newLead[0] });
    } catch (error: any) {
        console.error("Failed to submit buyback lead:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
