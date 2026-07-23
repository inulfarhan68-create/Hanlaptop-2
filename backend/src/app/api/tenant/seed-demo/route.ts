import { NextResponse } from "next/server";
import { requireOwnerOnly } from "@/lib/auth-guard";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { seedDemoData } from "@/services/DemoSeeder";

export async function POST() {
    const authResult = await requireOwnerOnly();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const storeId = authResult.storeId;
        
        // Ensure store is empty before seeding
        const existingTx = await db.select({ id: transactions.id })
            .from(transactions)
            .where(eq(transactions.storeId, storeId))
            .limit(1);

        if (existingTx.length > 0) {
            return NextResponse.json({ error: "Store is not empty. Cannot seed demo data." }, { status: 400 });
        }

        await seedDemoData(storeId, authResult.user.id);
        
        return NextResponse.json({ success: true, message: "Demo data seeded successfully" });
    } catch (error) {
        console.error("Failed to seed demo data:", error);
        return NextResponse.json({ error: "Failed to seed demo data" }, { status: 500 });
    }
}
