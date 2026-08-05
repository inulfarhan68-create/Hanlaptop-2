import { Metadata } from "next";
import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth-guard";
import PlatformClient from "./client";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { subscriptions, plans } from "@/db/schema/saas";
import { subscriptionLapsed } from "@/lib/subscription-status";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";

export const metadata: Metadata = {
    title: "Platform Console | HanLaptop",
};

export default async function PlatformPage() {
    const session = await requirePlatformAdmin();
    if (session instanceof NextResponse) {
        redirect("/");
    }

    // Fetch all tenants, their subscription state, and the plans that can be
    // assigned. Billing is settled manually (transfer), so the operator needs to
    // see who has lapsed and act on it from here.
    const [orgs, subRows, assignablePlans] = await Promise.all([
        db.query.organizations.findMany({ with: { stores: true } }),
        db.select().from(subscriptions),
        db.select({ key: plans.key, name: plans.name, priceMonthly: plans.priceMonthly })
            .from(plans)
            .where(eq(plans.isActive, true))
            .orderBy(asc(plans.sortOrder)),
    ]);

    const subByOrg = new Map(subRows.map((s) => [s.organizationId, s]));
    const tenants = orgs.map((org) => {
        const sub = subByOrg.get(org.id);
        return {
            id: org.id,
            name: org.name,
            isDemo: org.isDemo,
            storeCount: org.stores?.length ?? 0,
            planKey: sub?.planKey ?? null,
            status: sub?.status ?? null,
            currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
            // Same predicate the write-gate uses, so this page cannot disagree
            // with what the tenant actually experiences.
            lapsed: sub
                ? subscriptionLapsed({
                      subscriptionStatus: sub.status,
                      currentPeriodEnd: sub.currentPeriodEnd,
                  })
                : false,
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
                isImpersonating={!!session.isImpersonating}
                currentOrgId={session.organizationId}
            />
        </div>
    );
}
