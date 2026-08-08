import { Metadata } from "next";
import { NextResponse } from "next/server";
import { requireOwnerOnly } from "@/lib/auth-guard";
import BillingClient from "./client";
import { db } from "@/db";
import { subscriptions, plans, invoices } from "@/db/schema/saas";
import { organizations } from "@/db/schema";
import { subscriptionLapsed } from "@/lib/subscription-status";
import { parseFeatures, FEATURE_KEYS, type FeatureKey } from "@/lib/features";
import { asc, eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "Langganan & Pembayaran | HanLaptop",
};

export default async function BillingPage({
    searchParams,
}: {
    // Every locked screen links here with the feature the shop just hit, so this
    // page can answer the question they actually arrived with — "which plan has
    // Servis?" — instead of showing four cards of quotas.
    searchParams: Promise<{ feature?: string }>;
}) {
    const session = await requireOwnerOnly();
    if (session instanceof NextResponse) {
        redirect("/");
    }
    if (!session || !session.organizationId) {
        redirect("/");
    }
    const organizationId = session.organizationId;

    const [currentSub, invoiceHistory, availablePlans, orgRows] = await Promise.all([
        db.query.subscriptions.findFirst({
            where: eq(subscriptions.organizationId, organizationId),
            with: { plan: true },
        }),
        db.query.invoices.findMany({
            where: eq(invoices.organizationId, organizationId),
            orderBy: [desc(invoices.createdAt)],
            limit: 10,
        }),
        db.select({
            key: plans.key,
            name: plans.name,
            priceMonthly: plans.priceMonthly,
            maxStores: plans.maxStores,
            maxUsers: plans.maxUsers,
            maxTransactionsPerMonth: plans.maxTransactionsPerMonth,
            sortOrder: plans.sortOrder,
            features: plans.features,
            isPublic: plans.isPublic,
        })
            .from(plans)
            .where(eq(plans.isActive, true))
            .orderBy(asc(plans.sortOrder)),
        db.select({ name: organizations.name })
            .from(organizations)
            .where(eq(organizations.id, organizationId))
            .limit(1),
    ]);

    // Same predicate the write-gate uses, so this page can never tell a shop it is
    // fine while the API is refusing its saves.
    const lapsed = currentSub
        ? subscriptionLapsed({
              subscriptionStatus: currentSub.status,
              currentPeriodEnd: currentSub.currentPeriodEnd,
          })
        : false;

    // Only a real feature key survives — the value comes from a URL, so an
    // unknown one is dropped rather than echoed back into the page.
    const requested = (await searchParams)?.feature;
    const highlight = FEATURE_KEYS.includes(requested as FeatureKey) ? (requested as FeatureKey) : null;

    // Billing is settled outside the app, so renewing means reaching a human.
    // These are real business details — when unset the client omits the block
    // rather than printing an invented number, the same rule that keeps store
    // identity off other tenants' notas.
    const contact = {
        whatsapp: process.env.BILLING_CONTACT_WHATSAPP || null,
        email: process.env.BILLING_CONTACT_EMAIL || null,
        bankInfo: process.env.BILLING_BANK_INFO || null,
    };

    return (
        <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto py-6 px-4 sm:px-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Langganan &amp; Pembayaran</h1>
                <p className="text-muted-foreground mt-2">
                    Status paket, masa aktif, dan riwayat tagihan toko Anda.
                </p>
            </div>

            <BillingClient
                subscription={currentSub ? {
                    planName: currentSub.plan?.name ?? null,
                    planKey: currentSub.planKey,
                    status: currentSub.status,
                    currentPeriodEnd: currentSub.currentPeriodEnd.toISOString(),
                    maxStores: currentSub.plan?.maxStores ?? null,
                    maxUsers: currentSub.plan?.maxUsers ?? null,
                    maxTransactionsPerMonth: currentSub.plan?.maxTransactionsPerMonth ?? null,
                } : null}
                lapsed={lapsed}
                plans={availablePlans}
                invoices={invoiceHistory.map((inv) => ({
                    id: inv.id,
                    description: inv.description,
                    amount: inv.amount,
                    status: inv.status,
                    createdAt: inv.createdAt.toISOString(),
                }))}
                organizationName={orgRows[0]?.name ?? ""}
                contact={contact}
                currentFeatures={parseFeatures(currentSub?.plan?.features)}
                currentSortOrder={currentSub?.plan?.sortOrder ?? null}
                highlightFeature={highlight}
            />
        </div>
    );
}
