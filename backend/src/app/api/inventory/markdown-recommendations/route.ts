import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventory } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { requireAuth, storeScope } from "@/lib/auth-guard";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const items = await db.query.inventory.findMany({
            where: and(
                gt(inventory.quantity, 0),
                storeScope(authResult, inventory.storeId)
            ),
        });

        const now = new Date();
        const recommendations = items.map(item => {
            const ageInDays = Math.floor((now.getTime() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24));
            let recommendedDiscount = 0;
            let status = 'NORMAL';

            if (ageInDays > 60) {
                status = 'DEAD_STOCK';
                recommendedDiscount = 0.15; // 15% markdown
            } else if (ageInDays > 30) {
                status = 'SLOW_MOVING';
                recommendedDiscount = 0.05; // 5% markdown
            }

            const recommendedPrice = item.sellingPrice * (1 - recommendedDiscount);
            
            // Protect against selling below cost unless strictly required
            const finalRecommendedPrice = Math.max(recommendedPrice, item.costPrice);

            return {
                ...item,
                ageInDays,
                status,
                currentPrice: item.sellingPrice,
                recommendedPrice: finalRecommendedPrice,
                discountPercent: recommendedDiscount * 100
            };
        }).filter(item => item.status !== 'NORMAL');

        return NextResponse.json(recommendations);
    } catch (error: any) {
        console.error("Fetch Markdown Recommendations error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
