import { Metadata } from "next";
import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth-guard";
import PlatformClient from "./client";
import { db } from "@/db";
import { organizations, stores, transactions, inventory, serviceOrders } from "@/db/schema";
import { subscriptions, plans, subscriptionEvents } from "@/db/schema/saas";
import { subscriptionLapsed, daysUntilLapse } from "@/lib/subscription-status";
import { redirect } from "next/navigation";
import { asc, desc, eq, sql } from "drizzle-orm";

export const metadata: Metadata = {
    title: "Platform Console | HanLaptop",
};

export default async function PlatformPage() {
    const session = await requirePlatformAdmin();
    if (session instanceof NextResponse) {
        redirect("/");
    }

    // Everything the console needs, in one parallel batch. The usage counts are
    // grouped in SQL rather than fetched per tenant: a card list that costs one
    // query per shop stops being viable the moment there are more than a few.
    const [orgs, subRows, assignablePlans, txRows, invRows, svcRows, recentEvents] = await Promise.all([
        db.query.organizations.findMany({ with: { stores: true } }),
        db.select().from(subscriptions),
        db.select({ key: plans.key, name: plans.name, priceMonthly: plans.priceMonthly })
            .from(plans)
            .where(eq(plans.isActive, true))
            .orderBy(asc(plans.sortOrder)),
        db.select({ storeId: transactions.storeId, n: sql<number>`count(*)` })
            .from(transactions).groupBy(transactions.storeId),
        db.select({ storeId: inventory.storeId, n: sql<number>`count(*)` })
            .from(inventory).groupBy(inventory.storeId),
        db.select({ storeId: serviceOrders.storeId, n: sql<number>`count(*)` })
            .from(serviceOrders).groupBy(serviceOrders.storeId),
        db.select({
            organizationId: subscriptionEvents.organizationId,
            type: subscriptionEvents.type,
            payload: subscriptionEvents.payload,
            createdAt: subscriptionEvents.createdAt,
        })
            .from(subscriptionEvents)
            .orderBy(desc(subscriptionEvents.createdAt))
            .limit(8),
    ]);

    const sumByStore = (rows: { storeId: string | null; n: number }[]) =>
        new Map(rows.map((r) => [r.storeId ?? "", Number(r.n)]));
    const txByStore = sumByStore(txRows);
    const invByStore = sumByStore(invRows);
    const svcByStore = sumByStore(svcRows);
    const planPrice = new Map(assignablePlans.map((p) => [p.key, p.priceMonthly]));

    const subByOrg = new Map(subRows.map((s) => [s.organizationId, s]));
    const tenants = orgs.map((org) => {
        const sub = subByOrg.get(org.id);
        const storeIds = (org.stores ?? []).map((s) => s.id);
        const total = (m: Map<string, number>) =>
            storeIds.reduce((acc, id) => acc + (m.get(id) ?? 0), 0);
        const snapshot = {
            subscriptionStatus: sub?.status ?? null,
            currentPeriodEnd: sub?.currentPeriodEnd ?? null,
        };
        return {
            id: org.id,
            name: org.name,
            isDemo: org.isDemo,
            storeCount: storeIds.length,
            planKey: sub?.planKey ?? null,
            status: sub?.status ?? null,
            currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
            // Same predicate the write-gate uses, so this page cannot disagree
            // with what the tenant actually experiences.
            lapsed: sub ? subscriptionLapsed(snapshot) : false,
            // null unless it lapses within the warning window — the same rule the
            // tenant's own shell uses to warn them.
            expiringInDays: sub ? daysUntilLapse(snapshot) : null,
            // Whether anyone is actually working in there. A trial that has been
            // set up and used converts; an empty one almost never does, and the
            // two are indistinguishable from plan and status alone.
            usage: {
                transactions: total(txByStore),
                inventory: total(invByStore),
                serviceOrders: total(svcByStore),
            },
            monthlyPrice: sub?.planKey ? planPrice.get(sub.planKey) ?? null : null,
        };
    });

    // Recurring revenue actually being collected: paying plans only. `internal`
    // is priced 0 and demo is not a customer, so counting either would flatter
    // the number into uselessness.
    const mrr = tenants.reduce((acc, t) => {
        if (t.isDemo || t.lapsed || t.planKey === "internal") return acc;
        if (t.status !== "active") return acc; // a trial has not paid yet
        return acc + (t.monthlyPrice ?? 0);
    }, 0);

    const summary = {
        mrr,
        payingTenants: tenants.filter((t) => !t.isDemo && t.planKey !== "internal" && t.status === "active" && !t.lapsed).length,
        trialing: tenants.filter((t) => t.status === "trialing" && !t.lapsed).length,
        expiringSoon: tenants.filter((t) => t.expiringInDays !== null).length,
        lapsed: tenants.filter((t) => t.lapsed && !t.isDemo).length,
    };

    // Whoever needs a phone call first: lapsed, then closest to lapsing, then the
    // rest. Scanning cards by eye works at four tenants and not at forty.
    const rank = (t: (typeof tenants)[number]) =>
        t.lapsed && !t.isDemo ? 0 : t.expiringInDays !== null ? 1 : t.isDemo ? 3 : 2;
    tenants.sort((a, b) => {
        const r = rank(a) - rank(b);
        if (r !== 0) return r;
        return (a.expiringInDays ?? 9999) - (b.expiringInDays ?? 9999);
    });

    const orgName = new Map(orgs.map((o) => [o.id, o.name]));
    const activity = recentEvents.map((e) => {
        let by: string | null = null;
        let months: number | null = null;
        try {
            const p = JSON.parse(e.payload ?? "{}");
            by = p.by ?? null;
            months = p.months ?? null;
        } catch { /* payload is free-form; a bad row must not break the page */ }
        return {
            org: orgName.get(e.organizationId) ?? e.organizationId,
            type: e.type,
            by,
            months,
            at: e.createdAt.toISOString(),
        };
    });

    return (
        <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto py-6 px-4 sm:px-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Platform Console</h1>
                <p className="text-muted-foreground mt-2">
                    Super admin view: manage all organizations and tenants.
                </p>
                {session.isImpersonating && (
                    <div className="mt-4 p-4 bg-orange-100 border border-orange-500 rounded-lg text-orange-900 font-semibold flex items-center justify-between">
                        <div>
                            <span className="block text-xl">⚠️ You are currently impersonating an Organization.</span>
                            <span className="text-sm font-normal">All your actions will be recorded as if you were the tenant owner.</span>
                        </div>
                    </div>
                )}
            </div>
            
            <PlatformClient
                organizations={tenants}
                plans={assignablePlans}
                summary={summary}
                activity={activity}
                isImpersonating={!!session.isImpersonating}
                currentOrgId={session.organizationId}
            />
        </div>
    );
}
