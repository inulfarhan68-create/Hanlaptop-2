import { Metadata } from "next";
import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth-guard";
import PlatformClient from "./client";
import { db } from "@/db";
import { organizations, stores, transactions, inventory, serviceOrders } from "@/db/schema";
import { subscriptions, plans, subscriptionEvents } from "@/db/schema/saas";
import { subscriptionLapsed, daysUntilLapse } from "@/lib/subscription-status";
import { pendingRequest } from "@/lib/subscription-requests";
import { redirect } from "next/navigation";
import { asc, desc, eq, inArray, sql } from "drizzle-orm";

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
    const [orgs, subRows, assignablePlans, txRows, invRows, svcRows, recentEvents, eventMarks, upgradeAsks] = await Promise.all([
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
        // Latest of each interesting event per tenant, so a pending renewal
        // request can be told from one that has already been served.
        db.select({
            organizationId: subscriptionEvents.organizationId,
            type: subscriptionEvents.type,
            last: sql<string>`max(${subscriptionEvents.createdAt})`,
        })
            .from(subscriptionEvents)
            .where(inArray(subscriptionEvents.type, ["renewal_requested", "upgrade_requested", "manual_renewal", "manual_activation"]))
            .groupBy(subscriptionEvents.organizationId, subscriptionEvents.type),
        // Upgrade asks carry the plan they want, and that is the whole point of
        // the request — "someone is waiting" is far less useful than "Ruang
        // Laptop wants Pro". Newest first; the first row per org wins.
        db.select({
            organizationId: subscriptionEvents.organizationId,
            payload: subscriptionEvents.payload,
        })
            .from(subscriptionEvents)
            .where(eq(subscriptionEvents.type, "upgrade_requested"))
            .orderBy(desc(subscriptionEvents.createdAt))
            .limit(50),
    ]);

    // A request counts as outstanding only if nothing was granted after it —
    // otherwise every tenant you have ever served would sit in the queue forever.
    const lastByOrgType = new Map(eventMarks.map((e) => [`${e.organizationId}:${e.type}`, new Date(e.last).getTime()]));
    const marksFor = (orgId: string) => ({
        renewalAskedAt: lastByOrgType.get(`${orgId}:renewal_requested`) ?? 0,
        upgradeAskedAt: lastByOrgType.get(`${orgId}:upgrade_requested`) ?? 0,
        grantedAt: Math.max(
            lastByOrgType.get(`${orgId}:manual_renewal`) ?? 0,
            lastByOrgType.get(`${orgId}:manual_activation`) ?? 0
        ),
    });

    // Which plan an outstanding upgrade ask named, if the ask is still open.
    const latestUpgradeTarget = new Map<string, string>();
    for (const row of upgradeAsks) {
        if (latestUpgradeTarget.has(row.organizationId)) continue;
        try {
            const to = JSON.parse(row.payload ?? "{}").to;
            if (typeof to === "string") latestUpgradeTarget.set(row.organizationId, to);
        } catch { /* free-form payload; a bad row must not break the console */ }
    }
    const pendingUpgradeTo = (orgId: string) => {
        const state = pendingRequest(marksFor(orgId));
        if (!state.pending || state.kind !== "upgrade") return null;
        const key = latestUpgradeTarget.get(orgId);
        return key ? planName.get(key) ?? key : null;
    };

    const sumByStore = (rows: { storeId: string | null; n: number }[]) =>
        new Map(rows.map((r) => [r.storeId ?? "", Number(r.n)]));
    const txByStore = sumByStore(txRows);
    const invByStore = sumByStore(invRows);
    const svcByStore = sumByStore(svcRows);
    const planPrice = new Map(assignablePlans.map((p) => [p.key, p.priceMonthly]));
    const planName = new Map(assignablePlans.map((p) => [p.key, p.name]));

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
            // The shop has asked to renew and has not been served yet.
            pendingRequest: pendingRequest(marksFor(org.id)).pending,
            // The plan an open upgrade ask named, so the operator sees what to grant.
            pendingUpgradePlan: pendingUpgradeTo(org.id),
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
        pendingRequests: tenants.filter((t) => t.pendingRequest).length,
    };

    // Whoever needs acting on first. A shop that has actually asked to pay
    // outranks everything: it is the only signal here that someone is waiting on
    // you rather than the other way round.
    const rank = (t: (typeof tenants)[number]) =>
        t.pendingRequest ? 0 : t.lapsed && !t.isDemo ? 1 : t.expiringInDays !== null ? 2 : t.isDemo ? 4 : 3;
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
