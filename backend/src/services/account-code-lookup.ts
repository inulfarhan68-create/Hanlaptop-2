import { DEFAULT_COA_ACCOUNTS } from "@/db/coa-accounts";

/**
 * Resolving an account NAME to its COA code, derived from the chart itself.
 *
 * This replaces a hand-maintained table of name → constant, kept in parallel
 * with a hand-maintained table of constant → code, kept in parallel with the COA
 * seed. Three parallel lists drift, and they had: an audit of the mappings
 * against the seeded chart found 35 entries pointing somewhere else, including
 *
 *   "Pendapatan Servis"  -> 4140, which the chart calls Penjualan Konsinyasi
 *   "Beban Transportasi" -> 5260, which the chart calls Beban Administrasi
 *   "Pendapatan Komisi"  -> 4210, which does not exist in the chart at all
 *
 * None of that is cosmetic. Reports group journal rows by `accountCode` and join
 * the chart on it for the label, so service revenue was reported as consignment
 * sales, several expense categories collapsed into depreciation, and anything
 * carrying 4210 was dropped from the reports entirely — the join found nothing.
 *
 * Deriving from `DEFAULT_COA_ACCOUNTS` means the only way to break the link now
 * is to rename an account in the chart, which the test catches.
 */

/**
 * name (lowercased) → code, straight from the seeded chart.
 *
 * Header accounts are excluded: they exist to group their children in the report
 * tree and nothing should ever be posted to one. Leaving them in also shadowed
 * real accounts — the chart has a header literally called "PENDAPATAN", so a
 * journal line named "Pendapatan" resolved to the 4000 header, and no report
 * line ever showed it.
 */
const BY_NAME = new Map(
    DEFAULT_COA_ACCOUNTS.filter((a) => a.subType !== "Header").map((a) => [a.name.toLowerCase(), a.code]),
);

/**
 * Short forms the code writes that are not the chart's own wording. Each one is
 * a deliberate synonym for exactly one account — not a guess. Kept small on
 * purpose: the fix for an unlisted name is to write the chart's name, not to add
 * another synonym.
 */
const ALIASES: Record<string, string> = {
    // Written all over the codebase in its short form.
    hpp: "HPP Laptop",
    piutang: "Piutang Usaha",
    persediaan: "Persediaan Laptop",
    "persediaan barang": "Persediaan Laptop",
    // Indonesian spelling varies; the chart settled on "Utang".
    "hutang usaha": "Utang Usaha",
    "hutang konsinyasi": "Utang Konsinyasi",
    // Generic revenue lines used by older code paths.
    pendapatan: "Penjualan Laptop",
    penjualan: "Penjualan Laptop",
    servis: "Pendapatan Servis",
    "pendapatan lain-lain": "Pendapatan Lainnya",
    "pendapatan lain lain": "Pendapatan Lainnya",
    // Expense wording used by the seeded expense-category list in settings.
    "beban gaji": "Beban Gaji Karyawan",
    gaji: "Beban Gaji Karyawan",
    sewa: "Beban Sewa Tempat",
    "beban sewa": "Beban Sewa Tempat",
    "beban pemasaran / iklan": "Beban Marketing",
    "beban pemasaran": "Beban Marketing",
    "beban iklan": "Beban Marketing",
    "beban atk & perlengkapan": "Beban Administrasi",
    "beban perbaikan & perawatan": "Beban Perbaikan",
    "beban lain-lain": "Beban Lainnya",
    "modal awal": "Modal Pemilik",
};

/**
 * The code for an account name, or null when nothing matches.
 *
 * Null rather than a guess: a wrong code files real money under the wrong
 * account and the report still looks plausible, while a null leaves the row
 * visibly unmapped. The previous implementation fell back to substring matching
 * in both directions, so "Beban Pajak" could match "Pajak" in an unrelated
 * account.
 */
export function resolveAccountCode(accountName: string | null | undefined): string | null {
    if (!accountName) return null;
    const key = accountName.trim().toLowerCase();
    if (!key) return null;

    const direct = BY_NAME.get(key);
    if (direct) return direct;

    const alias = Object.prototype.hasOwnProperty.call(ALIASES, key) ? ALIASES[key] : undefined;
    if (alias) {
        const aliasCode = BY_NAME.get(alias.toLowerCase());
        if (aliasCode) return aliasCode;
    }

    // Shops name their own operating-expense categories in Settings ("Beban Kopi
    // Karyawan"), and those reach here unmapped. Filing them under Beban Lainnya
    // keeps them in the report; returning null would leave the journal row
    // without a code and the report join would drop it — the very failure this
    // module exists to stop. Narrow on purpose: only names that announce
    // themselves as an expense.
    if (key.startsWith("beban") || key.startsWith("biaya")) {
        return BY_NAME.get("beban lainnya") ?? null;
    }

    return null;
}

/** Every name this module can resolve — used by the test and the backfill. */
export function knownAccountNames(): string[] {
    return [...DEFAULT_COA_ACCOUNTS.map((a) => a.name), ...Object.keys(ALIASES)];
}

export { ALIASES as ACCOUNT_NAME_ALIASES };
