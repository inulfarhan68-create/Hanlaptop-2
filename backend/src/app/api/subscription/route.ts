import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptions, plans } from "@/db/schema/saas";
import { requireAuth } from "@/lib/auth-guard";
import { eq } from "drizzle-orm";
import { parseFeatures } from "@/lib/features";

export async function GET() {
    try {
        const authResult = await requireAuth();
        if (authResult instanceof NextResponse) return authResult;

        const orgId = authResult.organizationId;
        if (!orgId) {
            return NextResponse.json({ subscription: null, plan: null, features: {} });
        }

        const [activeSub] = await db.select({
            subscription: subscriptions,
            plan: plans
        })
        .from(subscriptions)
        .innerJoin(plans, eq(subscriptions.planKey, plans.key))
        .where(eq(subscriptions.organizationId, orgId))
        .limit(1);

        if (!activeSub) {
            return NextResponse.json({ subscription: null, plan: null, features: {} });
        }

        const features = parseFeatures(activeSub.plan);

        return NextResponse.json({
            subscription: activeSub.subscription,
            plan: activeSub.plan,
            features
        });
    } catch (error) {
        console.error("Failed to fetch subscription:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
