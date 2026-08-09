/**
 * Whether a shop is still waiting on the operator, and for what.
 *
 * Billing is settled by transfer, so a "request" is just an event the shop
 * writes and the operator answers by hand. The whole queue therefore rests on
 * one rule — an ask is outstanding only while nothing has been granted after it
 * — and getting that wrong is invisible in the worst way: every tenant ever
 * served would sit in the queue forever, and the console would stop meaning
 * anything. Pure, so the rule can be tested without a database.
 */
export type RequestMarks = {
    /** Epoch ms of the latest ask of each kind, and of the latest grant. 0/absent = never. */
    renewalAskedAt?: number;
    upgradeAskedAt?: number;
    grantedAt?: number;
};

export type PendingRequest =
    | { pending: false; kind: null }
    | { pending: true; kind: "renewal" | "upgrade" };

export function pendingRequest(marks: RequestMarks): PendingRequest {
    const renewal = marks.renewalAskedAt ?? 0;
    const upgrade = marks.upgradeAskedAt ?? 0;
    const granted = marks.grantedAt ?? 0;

    const asked = Math.max(renewal, upgrade);
    if (asked === 0 || asked <= granted) return { pending: false, kind: null };

    // Both kinds can be open at once; the later one is what the shop wants now.
    // A tie goes to the upgrade — it is the more specific ask, and it names the
    // plan the operator has to set.
    return { pending: true, kind: renewal > upgrade ? "renewal" : "upgrade" };
}
