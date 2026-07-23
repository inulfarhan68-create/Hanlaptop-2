import { Metadata } from "next";
import { NextResponse } from "next/server";
import { requireOwnerOnly } from "@/lib/auth-guard";
import BillingClient from "./client";
import { db } from "@/db";
import { subscriptions, plans, invoices } from "@/db/schema/saas";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "Billing & Subscription | HanLaptop",
};

export default async function BillingPage() {
    const session = await requireOwnerOnly();
    if (session instanceof NextResponse) {
        redirect("/");
    }
    if (!session || !session.organizationId) {
        redirect("/");
    }

    // Fetch subscription details server-side
    const currentSub = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.organizationId, session.organizationId),
        with: {
            plan: true
        }
    });

    const invoiceHistory = await db.query.invoices.findMany({
        where: eq(invoices.organizationId, session.organizationId),
        orderBy: [desc(invoices.createdAt)],
        limit: 10
    });

    return (
        <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto py-6 px-4 sm:px-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
                <p className="text-muted-foreground mt-2">
                    Manage your subscription plan, usage, and billing history.
                </p>
            </div>
            
            <BillingClient 
                subscription={currentSub} 
                invoices={invoiceHistory} 
                organizationId={session.organizationId}
            />
        </div>
    );
}
