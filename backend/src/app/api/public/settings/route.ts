import { NextResponse } from "next/server";
import { db } from "@/db";
import { storeSettings, stores } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const storeIdParam = searchParams.get("storeId");
        
        const storeIdValue = (!storeIdParam || storeIdParam === "all") ? "default" : storeIdParam;

        const settings = await db.query.storeSettings.findFirst({
            where: eq(storeSettings.storeId, storeIdValue)
        });

        if (!settings) {
            let storeInfo = null;
            if (storeIdValue !== "default") {
                storeInfo = await db.query.stores.findFirst({
                    where: eq(stores.id, storeIdValue)
                });
            }
            return NextResponse.json({
                storeName: storeInfo?.name || "HanLaptop",
                storeLogo: null
            });
        }

        return NextResponse.json({
            storeName: settings.storeName,
            storeLogo: settings.storeLogo
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
