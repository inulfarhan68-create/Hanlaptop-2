import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptions, invoices, subscriptionEvents } from "@/db/schema/saas";
import { emailQueue } from "@/db/schema/jobs";
import { eq, and } from "drizzle-orm";

/**
 * Stub Webhook receiver for Billing Events.
 * In production, this would verify a signature from Midtrans/Xendit.
 */
export async function POST(request: Request) {
    try {
        const payload = await request.json();
        
        // Example mock payload: { type: "payment_success", invoiceId: "xyz", planKey: "pro", orgId: "123" }
        const { type, invoiceId, planKey, orgId } = payload;

        if (type !== "payment_success" || !invoiceId || !planKey || !orgId) {
            return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
        }

        // 1. Mark invoice as paid
        await db.update(invoices)
            .set({ status: "paid", paidAt: new Date(), updatedAt: new Date() })
            .where(eq(invoices.id, invoiceId));

        // 2. Upgrade the subscription
        const now = new Date();
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        await db.update(subscriptions)
            .set({ 
                planKey, 
                status: "active", 
                currentPeriodStart: now, 
                currentPeriodEnd: nextMonth,
                updatedAt: now 
            })
            .where(eq(subscriptions.organizationId, orgId));

        // 3. Record subscription event
        await db.insert(subscriptionEvents).values({
            organizationId: orgId,
            type: "upgraded",
            payload: JSON.stringify({ planKey, invoiceId })
        });

        // 4. Queue an email (stub)
        await db.insert(emailQueue).values({
            toEmail: "tenant@example.com", // In real life, fetch org owner email
            subject: "Upgrade Successful",
            body: `Your subscription has been upgraded to ${planKey}.`
        });

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("Webhook processing failed:", error);
        return NextResponse.json({ error: "Webhook Error" }, { status: 500 });
    }
}
