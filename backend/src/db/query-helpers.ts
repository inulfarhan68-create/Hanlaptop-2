import { and, eq, SQL } from "drizzle-orm";
import { transactions, journalEntries } from "./schema";

/**
 * Wraps conditions to only select active (non-voided) transactions.
 */
export function withActiveTransactions(...conds: (SQL | undefined)[]): SQL {
    const activeCond = eq(transactions.isVoided, false);
    const filteredConds = conds.filter((c): c is SQL => c !== undefined);
    return (filteredConds.length > 0 ? and(activeCond, ...filteredConds) : activeCond) as SQL;
}

/**
 * Wraps conditions to only select active (non-voided) journal entries.
 */
export function withActiveJournalEntries(...conds: (SQL | undefined)[]): SQL {
    const activeCond = eq(journalEntries.isVoided, false);
    const filteredConds = conds.filter((c): c is SQL => c !== undefined);
    return (filteredConds.length > 0 ? and(activeCond, ...filteredConds) : activeCond) as SQL;
}
