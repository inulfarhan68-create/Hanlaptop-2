import * as path from "path";
import * as dotenv from "dotenv";

// dotenv first, db imported dynamically — src/db reads DATABASE_URL at module
// scope and ESM evaluates static imports before this file's body runs.
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

/**
 * Re-derive `journal_entries.account_code` from `account_name`.
 *
 * Fixing the lookup only fixes entries written from now on. Every row already in
 * the table still carries the code the old mapping produced, and reports group
 * by code — so a service fee recorded yesterday keeps showing up as consignment
 * sales until this runs.
 *
 * DRY RUN BY DEFAULT: prints what it would change and touches nothing. Pass
 * --apply to write. Only the code column is ever updated; names, amounts and
 * transaction links are never touched, and a row whose name resolves to nothing
 * is reported and left alone rather than blanked.
 *
 *   cd backend && npx tsx scripts/remap-journal-codes.ts          # dry run
 *   cd backend && npx tsx scripts/remap-journal-codes.ts --apply
 */
async function main() {
    const apply = process.argv.includes("--apply");

    const { db } = await import("../src/db");
    const { journalEntries } = await import("../src/db/schema");
    const { resolveAccountCode } = await import("../src/services/account-code-lookup");
    const { sql, eq, and, inArray } = await import("drizzle-orm");

    const rows = await db
        .select({ name: journalEntries.accountName, code: journalEntries.accountCode, n: sql<number>`count(*)::int` })
        .from(journalEntries)
        .groupBy(journalEntries.accountName, journalEntries.accountCode);

    let toFix = 0;
    let unmapped = 0;
    const plan: { name: string; from: string | null; to: string; n: number }[] = [];

    for (const r of rows) {
        const want = resolveAccountCode(r.name);
        if (!want) {
            console.log(`  UNMAPPED   ${String(r.name).padEnd(32)} ${String(r.code ?? "-").padEnd(6)} ${r.n} row(s)`);
            unmapped += Number(r.n);
            continue;
        }
        if (want === r.code) continue;
        console.log(`  ${String(r.name).padEnd(32)} ${String(r.code ?? "-").padEnd(6)} -> ${want}   ${r.n} row(s)`);
        plan.push({ name: r.name as string, from: r.code, to: want, n: Number(r.n) });
        toFix += Number(r.n);
    }

    console.log(`\n${toFix} row(s) would change, ${unmapped} row(s) have a name nothing maps to.`);

    if (!apply) {
        console.log("\nDry run — nothing written. Re-run with --apply to make these changes.");
        process.exit(0);
    }

    // One UPDATE per (name, old code) pair rather than per row.
    for (const p of plan) {
        await db
            .update(journalEntries)
            .set({ accountCode: p.to })
            .where(
                and(
                    eq(journalEntries.accountName, p.name),
                    p.from === null ? sql`${journalEntries.accountCode} is null` : eq(journalEntries.accountCode, p.from),
                ),
            );
        console.log(`  updated ${p.n} row(s): ${p.name} -> ${p.to}`);
    }
    console.log("\nDone.");
    process.exit(0);
}

main().catch((e) => {
    console.error("remap-journal-codes failed:", e.message);
    process.exit(1);
});
