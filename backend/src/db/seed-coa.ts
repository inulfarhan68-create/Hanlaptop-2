import { db } from "./index";
import { chartOfAccounts, fiscalPeriods } from "./schema";
import { DEFAULT_COA_ACCOUNTS, SAAS_INTERNAL_COA_ACCOUNTS, type CoaSeedAccount } from "./coa-accounts";

// Re-exported so the many existing importers of this module keep working.
export { DEFAULT_COA_ACCOUNTS, SAAS_INTERNAL_COA_ACCOUNTS };
export type { CoaSeedAccount };

/**
 * Seed the default Chart of Accounts + an OPEN fiscal period for a store.
 * Idempotent: re-running skips accounts/periods that already exist.
 * Safe to call right after creating a store.
 */
export async function seedStoreCoa(storeId: string, opts: { isSaaSPlatform?: boolean, tx?: any } = {}) {
    const accounts = opts.isSaaSPlatform
        ? [...DEFAULT_COA_ACCOUNTS, ...SAAS_INTERNAL_COA_ACCOUNTS]
        : DEFAULT_COA_ACCOUNTS;

    const dbClient = opts.tx || db;

    await dbClient
        .insert(chartOfAccounts)
        .values(
            accounts.map((a) => ({
                storeId,
                code: a.code,
                name: a.name,
                type: a.type,
                subType: a.subType,
                isSystem: a.isSystem,
                normalBalance: a.normalBalance,
                openingBalance: 0,
                isActive: true,
            }))
        )
        .onConflictDoNothing();

    // Ensure the current month has an OPEN fiscal period (needed for closing/reports).
    const now = new Date();
    await dbClient
        .insert(fiscalPeriods)
        .values({
            storeId,
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            status: "OPEN",
        })
        .onConflictDoNothing();

    return { accountsSeeded: accounts.length };
}

// CLI: DATABASE_URL=<postgres> npx tsx src/db/seed-coa.ts <storeId>
if (process.argv[1] && process.argv[1].endsWith("seed-coa.ts")) {
    const storeId = process.argv[2];
    if (!storeId) {
        console.error("Usage: DATABASE_URL=<postgres> npx tsx src/db/seed-coa.ts <storeId>");
        process.exit(1);
    }
    seedStoreCoa(storeId)
        .then((r) => {
            console.log(`✅ Seeded ${r.accountsSeeded} COA accounts + current fiscal period for store ${storeId}`);
            process.exit(0);
        })
        .catch((e) => {
            console.error("❌ Seed failed:", e.message);
            process.exit(1);
        });
}

