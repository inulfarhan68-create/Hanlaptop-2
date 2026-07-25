import { db } from "@/db";
import { stores, userStoreAccess, transactions } from "@/db/schema";
import { usageCounters } from "@/db/schema/saas";
import { and, eq, gte, lte, count, inArray, sql } from "drizzle-orm";

/**
 * Plan usage limits (Phase 4). One place computes "how much of each metered
 * resource a tenant has used vs its plan limit", and classifies it so the API can
 * hard-block at 100% and the UI can warn at 80%/90%.
 *
 * Enforcement counts live rows (COUNT) — the source of truth — so it can't drift.
 * `usageCounters` is kept as a cheap analytics tally (see incrementUsage).
 */

/** Warn the tenant once they cross these fractions of a limit. */
export const USAGE_WARN_THRESHOLD = 0.8;      // 80% → soft warning
export const USAGE_CRITICAL_THRESHOLD = 0.9;  // 90% → stronger warning

export type UsageMetric = "stores" | "users" | "transactions";
export type LimitStatus = "unlimited" | "ok" | "warning" | "critical" | "blocked";

export interface MetricUsage {
    metric: UsageMetric;
    used: number;
    limit: number | null;      // null = unlimited
    remaining: number | null;  // null = unlimited
    percent: number | null;    // 0..1, null = unlimited
    status: LimitStatus;
}

/** A plan carries these three caps (null = unlimited on that axis). */
export interface PlanLimits {
    maxStores: number | null;
    maxUsers: number | null;
    maxTransactionsPerMonth: number | null;
}

/**
 * Classify usage against a limit. Pure — the load-bearing rule, unit-tested.
 * `used` is the CURRENT count; "blocked" means the next unit would exceed the cap
 * (i.e. used >= limit). A limit of 0 blocks immediately.
 */
export function limitStatus(
    used: number,
    limit: number | null,
): { status: LimitStatus; percent: number | null; remaining: number | null } {
    if (limit === null) return { status: "unlimited", percent: null, remaining: null };
    const remaining = Math.max(0, limit - used);
    const percent = limit === 0 ? 1 : used / limit;
    let status: LimitStatus;
    if (used >= limit) status = "blocked";
    else if (percent >= USAGE_CRITICAL_THRESHOLD) status = "critical";
    else if (percent >= USAGE_WARN_THRESHOLD) status = "warning";
    else status = "ok";
    return { status, percent, remaining };
}

/** First instant of the current calendar month. */
function monthStart(d = new Date()): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

async function orgStoreIds(organizationId: string): Promise<string[]> {
    const rows = await db.select({ id: stores.id }).from(stores).where(eq(stores.organizationId, organizationId));
    return rows.map((r) => r.id);
}

export async function countStores(organizationId: string): Promise<number> {
    const [row] = await db.select({ c: count() }).from(stores).where(eq(stores.organizationId, organizationId));
    return row?.c ?? 0;
}

export async function countUsers(organizationId: string): Promise<number> {
    const [row] = await db
        .select({ c: sql<number>`count(distinct ${userStoreAccess.userId})` })
        .from(userStoreAccess)
        .innerJoin(stores, eq(userStoreAccess.storeId, stores.id))
        .where(eq(stores.organizationId, organizationId));
    return Number(row?.c ?? 0);
}

export async function countTransactionsThisMonth(organizationId: string): Promise<number> {
    const ids = await orgStoreIds(organizationId);
    if (ids.length === 0) return 0;
    const [row] = await db
        .select({ c: count() })
        .from(transactions)
        .where(and(inArray(transactions.storeId, ids), gte(transactions.transactionDate, monthStart())));
    return row?.c ?? 0;
}

async function countMetric(organizationId: string, metric: UsageMetric): Promise<number> {
    if (metric === "stores") return countStores(organizationId);
    if (metric === "users") return countUsers(organizationId);
    return countTransactionsThisMonth(organizationId);
}

function limitFor(plan: PlanLimits | null, metric: UsageMetric): number | null {
    if (!plan) return null; // no plan resolved → don't block (defensive)
    if (metric === "stores") return plan.maxStores;
    if (metric === "users") return plan.maxUsers;
    return plan.maxTransactionsPerMonth;
}

/** Full usage snapshot for a tenant — drives the usage API and the warning banner. */
export async function getUsage(organizationId: string, plan: PlanLimits | null): Promise<MetricUsage[]> {
    const [s, u, t] = await Promise.all([
        countStores(organizationId),
        countUsers(organizationId),
        countTransactionsThisMonth(organizationId),
    ]);
    const build = (metric: UsageMetric, used: number): MetricUsage => {
        const limit = limitFor(plan, metric);
        return { metric, used, limit, ...limitStatus(used, limit) };
    };
    return [build("stores", s), build("users", u), build("transactions", t)];
}

/**
 * Guard used by create-handlers: is there room for one more `metric`? Returns the
 * current count + limit so the caller can build a 402 with an upgrade CTA.
 * `blocked` is false when the metric is unlimited or the plan is missing.
 */
export async function checkLimit(
    organizationId: string,
    plan: PlanLimits | null,
    metric: UsageMetric,
): Promise<{ blocked: boolean; used: number; limit: number | null }> {
    const limit = limitFor(plan, metric);
    if (limit === null) return { blocked: false, used: 0, limit: null };
    const used = await countMetric(organizationId, metric);
    return { blocked: used >= limit, used, limit };
}

/**
 * Increment the analytics tally for a metered resource in the CURRENT month.
 * Enforcement doesn't depend on this (it counts live rows) — this is a cheap
 * running total for dashboards/reporting. Period-scoped so it resets monthly.
 */
export async function incrementUsage(organizationId: string, resource: "transactions") {
    const now = new Date();
    const start = monthStart(now);

    const current = await db.query.usageCounters.findFirst({
        where: and(
            eq(usageCounters.organizationId, organizationId),
            eq(usageCounters.resource, resource),
            lte(usageCounters.periodStart, now),
            gte(usageCounters.periodEnd, now),
        ),
    });

    if (current) {
        await db
            .update(usageCounters)
            .set({ count: current.count + 1, updatedAt: new Date() })
            .where(eq(usageCounters.id, current.id));
    } else {
        const periodEnd = new Date(start.getFullYear(), start.getMonth() + 1, 1); // first of next month
        await db.insert(usageCounters).values({
            organizationId,
            resource,
            periodStart: start,
            periodEnd,
            count: 1,
        });
    }
}
