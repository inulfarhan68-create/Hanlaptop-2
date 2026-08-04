/**
 * Pure predicates for subscription lifecycle state.
 *
 * Kept free of any `db` import so it can be unit-tested directly (and so the
 * rule lives in one place instead of being re-derived per call site).
 */

/** Subscription states that still carry write access. */
export const PAYING_STATUSES = ["trialing", "active"] as const;

export type SubscriptionSnapshot = {
    subscriptionStatus: string | null;
    currentPeriodEnd: Date | null;
};

/**
 * Has this subscription lapsed? Two independent signals, because neither alone
 * is sufficient:
 *
 *  - `status` catches an explicit lapse (past_due / canceled / unpaid).
 *  - an elapsed `currentPeriodEnd` catches what nothing else does. Status is only
 *    ever advanced by /api/cron/billing, which until now was not scheduled in
 *    vercel.json at all, exported only POST while Vercel Cron issues GET, and
 *    swept only `active` — so an expired trial sat at `trialing` forever and kept
 *    full write access. The date is written at sign-up and is the ground truth;
 *    deriving the lock from it means access is correct even when no scheduler ran.
 *
 * `currentPeriodEnd` is NOT NULL in the schema, so there is no "never expires"
 * row to mis-handle; the null branch is only defensive.
 */
export function subscriptionLapsed(row: SubscriptionSnapshot, now: Date = new Date()): boolean {
    // No subscription row at all: not decided here. Such an org resolves no plan,
    // so requireFeature already withholds everything gated behind one.
    if (!row.subscriptionStatus) return false;
    if (!(PAYING_STATUSES as readonly string[]).includes(row.subscriptionStatus)) return true;
    return row.currentPeriodEnd !== null && row.currentPeriodEnd.getTime() < now.getTime();
}
