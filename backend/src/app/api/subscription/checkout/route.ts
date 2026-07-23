import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptions, plans, invoices, subscriptionEvents } from "@/db/schema/saas";
import { requireOwner } from "@/lib/auth-guard";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
    try {
        const authResult = await requireOwner();
        if (authResult instanceof NextResponse) return authResult;

        const orgId = authResult.organizationId;
        if (!orgId) {
            return NextResponse.json({ error: "No organization associated with this user." }, { status: 400 });
        }

        const body = await request.json();
        const { planKey } = body;

        if (!planKey) {
            return NextResponse.json({ error: "Missing planKey" }, { status: 400 });
        }

        const targetPlan = await db.query.plans.findFirst({
            where: eq(plans.key, planKey)
        });

        if (!targetPlan) {
            return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }

        // SECURITY: only allow upgrading to a public, self-serve plan. Blocks a tenant
        // from self-assigning `internal` (unlimited, price 0) or `enterprise` (custom).
        if (!targetPlan.isActive || !targetPlan.isPublic || targetPlan.priceMonthly === null) {
            return NextResponse.json({ error: "Paket tidak tersedia untuk upgrade mandiri" }, { status: 400 });
        }

        // Scaffold: Create an unpaid invoice
        const amount = targetPlan.priceMonthly || 0;
        const [invoice] = await db.insert(invoices).values({
            organizationId: orgId,
            amount,
            description: `Upgrade to ${targetPlan.name} plan`,
            status: "unpaid",
            paymentUrl: `/settings/billing/mock-checkout?planKey=${planKey}`, // STUB checkout url
        }).returning();

        // Normally we'd call Midtrans/Xendit to get a real token/URL and update the invoice here.
        // For Phase 5, we just return the mock URL.

        return NextResponse.json({ checkoutUrl: invoice.paymentUrl });
    } catch (error) {
        console.error("Failed to checkout:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
