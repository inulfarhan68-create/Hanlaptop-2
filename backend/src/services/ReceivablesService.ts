import { db } from "@/db";
import { transactions } from "@/db/schema";
import { and, or, eq, gte, lt, isNull, ilike, count, sql, asc, type SQL } from "drizzle-orm";
import { withActiveTransactions } from "@/db/query-helpers";
import { storeScope, type AuthContext } from "@/lib/auth-guard";

/**
 * Receivables (piutang) and payables (hutang) share one shape: unsettled
 * transactions bucketed by how far past due they are.
 *
 * The aging summary is computed in SQL over the whole matching set rather than in
 * the browser, so the list can be paginated without the totals going wrong — the
 * pages used to fetch every transaction and reduce over it client-side, which made
 * a row cap silently under-report what the shop is owed.
 */

export type AgingKind = "receivable" | "payable";

export const AGING_BUCKET_KEYS = ["current", "d1_30", "d31_60", "d60plus"] as const;
export type AgingBucket = (typeof AGING_BUCKET_KEYS)[number];

export interface AgingQuery {
    kind: AgingKind;
    page?: number;
    limit?: number;
    /** Matches invoice number, customer name or description (case-insensitive). */
    search?: string;
    /** Restrict the list (not the summary) to one age bucket. */
    bucket?: AgingBucket;
}

export interface AgingSummary {
    total: number;
    count: number;
    buckets: Record<AgingBucket, { total: number; count: number }>;
}

export interface AgingReport {
    items: unknown[];
    summary: AgingSummary;
    pagination: { page: number; limit: number; totalItems: number; totalPages: number };
}

const RECEIVABLE_TYPES = ["Penjualan", "Jasa Servis"];
const PAYABLE_TYPE = "Pembelian Stok";

/** Midnight-anchored bucket thresholds, matching the day-granularity the UI shows. */
function bucketThresholds() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d30 = new Date(today);
    d30.setDate(d30.getDate() - 30);
    const d60 = new Date(today);
    d60.setDate(d60.getDate() - 60);
    return { today, d30, d60 };
}

/**
 * Unsettled rows of the requested kind, scoped to the caller's stores.
 * "Unsettled" mirrors the pages: not fully paid, or sold on terms.
 */
function baseWhere(authResult: AuthContext, kind: AgingKind): SQL {
    const kindCond = kind === "receivable"
        ? or(...RECEIVABLE_TYPES.map((t) => eq(transactions.transactionType, t)))
        : eq(transactions.transactionType, PAYABLE_TYPE);

    const unsettled = or(
        eq(transactions.paymentStatus, "Belum Lunas"),
        eq(transactions.paymentMethod, "Tempo")
    );

    return withActiveTransactions(
        kindCond,
        unsettled,
        storeScope(authResult, transactions.storeId)
    );
}

/** Age-bucket predicate on dueDate. A missing due date counts as not yet due. */
function bucketWhere(bucket: AgingBucket): SQL | undefined {
    const { today, d30, d60 } = bucketThresholds();

    switch (bucket) {
        case "current":
            return or(isNull(transactions.dueDate), gte(transactions.dueDate, today)) as SQL;
        case "d1_30":
            return and(lt(transactions.dueDate, today), gte(transactions.dueDate, d30)) as SQL;
        case "d31_60":
            return and(lt(transactions.dueDate, d30), gte(transactions.dueDate, d60)) as SQL;
        case "d60plus":
            return lt(transactions.dueDate, d60) as SQL;
        default:
            return undefined;
    }
}

export async function getAgingReport(authResult: AuthContext, q: AgingQuery): Promise<AgingReport> {
    const page = Math.max(1, q.page ?? 1);
    const limit = Math.min(200, Math.max(1, q.limit ?? 25));
    const offset = (page - 1) * limit;

    const base = baseWhere(authResult, q.kind);

    // Remaining balance per row: total minus whatever was paid up front.
    const sisa = sql<number>`(${transactions.amount} - COALESCE(${transactions.dpAmount}, 0))`;

    // The summary reuses the very same predicates the list filter uses, so the cards
    // and the rows can never disagree about which bucket a row is in. They're built
    // from Drizzle's comparison helpers rather than raw SQL for two reasons: a bare
    // Date interpolated into a `sql` template isn't serialisable by postgres-js, and
    // aggregating with FILTER avoids GROUP BY entirely — Drizzle renders a column
    // unqualified in a select-list expression but qualified in GROUP BY, which
    // Postgres rejects as two different expressions (42803).
    const isCurrent = bucketWhere("current")!;
    const is1_30 = bucketWhere("d1_30")!;
    const is31_60 = bucketWhere("d31_60")!;
    const is60plus = bucketWhere("d60plus")!;

    // The summary deliberately ignores search/bucket: the cards show the whole
    // ageing picture while the list below them is what gets filtered.
    const listWhere = and(
        base,
        q.bucket ? bucketWhere(q.bucket) : undefined,
        q.search
            ? or(
                ilike(transactions.invoiceNumber, `%${q.search}%`),
                ilike(transactions.customerName, `%${q.search}%`),
                ilike(transactions.description, `%${q.search}%`)
            )
            : undefined
    ) as SQL;

    const [[summaryRow], [totalRow], items] = await Promise.all([
        db.select({
            total: sql<number>`COALESCE(SUM(${sisa}), 0)`,
            count: sql<number>`COUNT(*)`,
            currentTotal: sql<number>`COALESCE(SUM(${sisa}) FILTER (WHERE ${isCurrent}), 0)`,
            currentCount: sql<number>`COUNT(*) FILTER (WHERE ${isCurrent})`,
            d1_30Total: sql<number>`COALESCE(SUM(${sisa}) FILTER (WHERE ${is1_30}), 0)`,
            d1_30Count: sql<number>`COUNT(*) FILTER (WHERE ${is1_30})`,
            d31_60Total: sql<number>`COALESCE(SUM(${sisa}) FILTER (WHERE ${is31_60}), 0)`,
            d31_60Count: sql<number>`COUNT(*) FILTER (WHERE ${is31_60})`,
            d60plusTotal: sql<number>`COALESCE(SUM(${sisa}) FILTER (WHERE ${is60plus}), 0)`,
            d60plusCount: sql<number>`COUNT(*) FILTER (WHERE ${is60plus})`,
        })
        .from(transactions)
        .where(base),

        db.select({ value: count() }).from(transactions).where(listWhere),

        db.query.transactions.findMany({
            where: listWhere,
            with: { customer: true, supplier: true },
            orderBy: [asc(transactions.transactionDate)], // oldest first — chase these
            limit,
            offset,
        }),
    ]);

    const n = (v: unknown) => Number(v) || 0;
    const buckets: AgingSummary["buckets"] = {
        current: { total: n(summaryRow?.currentTotal), count: n(summaryRow?.currentCount) },
        d1_30: { total: n(summaryRow?.d1_30Total), count: n(summaryRow?.d1_30Count) },
        d31_60: { total: n(summaryRow?.d31_60Total), count: n(summaryRow?.d31_60Count) },
        d60plus: { total: n(summaryRow?.d60plusTotal), count: n(summaryRow?.d60plusCount) },
    };

    const totalItems = n(totalRow?.value);

    return {
        items,
        summary: { total: n(summaryRow?.total), count: n(summaryRow?.count), buckets },
        pagination: {
            page,
            limit,
            totalItems,
            totalPages: Math.max(1, Math.ceil(totalItems / limit)),
        },
    };
}
