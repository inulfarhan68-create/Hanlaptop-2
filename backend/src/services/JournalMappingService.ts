import { db } from "@/db";
import { chartOfAccounts, journalEntries } from "@/db/schema";
import { eq, and, isNull, sql, inArray } from "drizzle-orm";
import { storeScope, type AuthContext } from "@/lib/auth-guard";
import { ACCOUNT_CODES } from "../constants/accounting";

/**
 * The tenant bound every function here needs. Taking the auth context rather
 * than a bare `storeId` string is deliberate: `authResult.storeId` is `"all"`
 * for an owner, which is a sentinel and not a store id, so comparing against it
 * matches nothing. `storeScope` resolves it to the caller's real store ids.
 */
type Scope = Pick<AuthContext, "accessibleStoreIds">;

/**
 * Mapping dari accountName ke accountCode berdasarkan COA
 */
const ACCOUNT_NAME_MAPPINGS: Record<string, string> = {
    // Aset Lancar
    "kas": ACCOUNT_CODES.KAS,
    "Kas": ACCOUNT_CODES.KAS,
    "KAS": ACCOUNT_CODES.KAS,
    "bank": ACCOUNT_CODES.BANK,
    "Bank": ACCOUNT_CODES.BANK,
    "BANK": ACCOUNT_CODES.BANK,
    "rekening bank": ACCOUNT_CODES.BANK,
    "rekening": ACCOUNT_CODES.BANK,
    "qris": ACCOUNT_CODES.QRIS,
    "QRIS": ACCOUNT_CODES.QRIS,
    "piutang usaha": ACCOUNT_CODES.PIUTANG_USAHA,
    "Piutang Usaha": ACCOUNT_CODES.PIUTANG_USAHA,
    "Piutang": ACCOUNT_CODES.PIUTANG_USAHA,
    "piutang": ACCOUNT_CODES.PIUTANG_USAHA,
    "cadangan piutang": ACCOUNT_CODES.PIUTANG_KARYAWAN,
    "Cadangan Piutang": ACCOUNT_CODES.PIUTANG_KARYAWAN,
    "persediaan": ACCOUNT_CODES.PERSEDIAAN_LAPTOP,
    "Persediaan": ACCOUNT_CODES.PERSEDIAAN_LAPTOP,
    "persediaan laptop": ACCOUNT_CODES.PERSEDIAAN_LAPTOP,
    "Persediaan Laptop": ACCOUNT_CODES.PERSEDIAAN_LAPTOP,
    "persediaan sparepart": ACCOUNT_CODES.PERSEDIAAN_SPAREPART,
    "Persediaan Sparepart": ACCOUNT_CODES.PERSEDIAAN_SPAREPART,
    "persediaan aksesoris": ACCOUNT_CODES.PERSEDIAAN_AKSESORIS,
    "Persediaan Aksesoris": ACCOUNT_CODES.PERSEDIAAN_AKSESORIS,
    "persediaan konsinyasi": ACCOUNT_CODES.BARANG_DALAM_PENGIRIMAN,
    "Persediaan Konsinyasi": ACCOUNT_CODES.BARANG_DALAM_PENGIRIMAN,
    "uang muka pembelian": ACCOUNT_CODES.UANG_MUKA_PEMBELIAN,
    "Uang Muka Pembelian": ACCOUNT_CODES.UANG_MUKA_PEMBELIAN,
    "uang muka pajak": ACCOUNT_CODES.PPN_MASUKAN,
    "Uang Muka Pajak": ACCOUNT_CODES.PPN_MASUKAN,
    "ppn masukan": ACCOUNT_CODES.PPN_MASUKAN,
    "PPN Masukan": ACCOUNT_CODES.PPN_MASUKAN,

    // Aset Tetap
    "kendaraan": ACCOUNT_CODES.ASET_TETAP,
    "Kendaraan": ACCOUNT_CODES.ASET_TETAP,
    "mobil": ACCOUNT_CODES.ASET_TETAP,
    "motor": ACCOUNT_CODES.ASET_TETAP,
    "peralatan": ACCOUNT_CODES.ASET_TETAP,
    "Peralatan": ACCOUNT_CODES.ASET_TETAP,
    "komputer": ACCOUNT_CODES.ASET_TETAP,
    "laptop": ACCOUNT_CODES.ASET_TETAP,
    "akumulasi penyusutan": ACCOUNT_CODES.AKUMULASI_PENYUSUTAN,
    "Akumulasi Penyusutan": ACCOUNT_CODES.AKUMULASI_PENYUSUTAN,
    "accumulated depreciation": ACCOUNT_CODES.AKUMULASI_PENYUSUTAN,

    // Kewajiban
    "utang usaha": ACCOUNT_CODES.HUTANG_USAHA,
    "Utang Usaha": ACCOUNT_CODES.HUTANG_USAHA,
    "Hutang Usaha": ACCOUNT_CODES.HUTANG_USAHA,
    "hutang usaha": ACCOUNT_CODES.HUTANG_USAHA,
    "utang konsinyasi": ACCOUNT_CODES.HUTANG_KONSINYASI,
    "Utang Konsinyasi": ACCOUNT_CODES.HUTANG_KONSINYASI,
    "utang pajak": "2130",
    "Utang Pajak": "2130",
    "ppn keluaran": "2130",
    "PPN Keluaran": "2130",
    "pph terutang": "2131",
    "PPh Terutang": "2131",
    "uang muka pelanggan": "2140",
    "Uang Muka Pelanggan": "2140",
    "uang muka customer": "2140",
    "Uang Muka Customer": "2140",
    "hutang bank": ACCOUNT_CODES.HUTANG_BANK,
    "Hutang Bank": ACCOUNT_CODES.HUTANG_BANK,

    // Modal
    "modal pemilik": "3100",
    "Modal Pemilik": "3100",
    "modal": "3100",
    "Modal": "3100",
    "laba ditahan": "3200",
    "Laba Ditahan": "3200",
    "prive": "3200",
    "Prive": "3200",
    "laba rugi tahun berjalan": "3300",
    "Laba/Rugi Tahun Berjalan": "3300",

    // Pendapatan
    "pendapatan": ACCOUNT_CODES.PENJUALAN_LAPTOP,
    "Pendapatan": ACCOUNT_CODES.PENJUALAN_LAPTOP,
    "penjualan laptop": ACCOUNT_CODES.PENJUALAN_LAPTOP,
    "Penjualan Laptop": ACCOUNT_CODES.PENJUALAN_LAPTOP,
    "penjualan laptop bekas": ACCOUNT_CODES.PENJUALAN_LAPTOP,
    "penjualan": ACCOUNT_CODES.PENJUALAN_LAPTOP,
    "Penjualan": ACCOUNT_CODES.PENJUALAN_LAPTOP,
    "penjualan sparepart": ACCOUNT_CODES.PENJUALAN_SPAREPART,
    "Penjualan Sparepart": ACCOUNT_CODES.PENJUALAN_SPAREPART,
    "penjualan aksesoris": ACCOUNT_CODES.PENJUALAN_AKSESORIS,
    "Penjualan Aksesoris": ACCOUNT_CODES.PENJUALAN_AKSESORIS,
    "penjualan konsinyasi": ACCOUNT_CODES.PENDAPATAN_LAIN_LAIN,
    "Penjualan Konsinyasi": ACCOUNT_CODES.PENDAPATAN_LAIN_LAIN,
    "pendapatan servis": ACCOUNT_CODES.PENDAPATAN_SERVIS,
    "Pendapatan Servis": ACCOUNT_CODES.PENDAPATAN_SERVIS,
    "servis": ACCOUNT_CODES.PENDAPATAN_SERVIS,
    "Servis": ACCOUNT_CODES.PENDAPATAN_SERVIS,
    "pendapatan komisi": ACCOUNT_CODES.PENDAPATAN_LAIN_LAIN,
    "Pendapatan Komisi": ACCOUNT_CODES.PENDAPATAN_LAIN_LAIN,
    "komisi": ACCOUNT_CODES.PENDAPATAN_LAIN_LAIN,
    "Komisi": ACCOUNT_CODES.PENDAPATAN_LAIN_LAIN,
    "pendapatan lainnya": ACCOUNT_CODES.PENDAPATAN_LAIN_LAIN,
    "Pendapatan Lainnya": ACCOUNT_CODES.PENDAPATAN_LAIN_LAIN,
    "retur penjualan": "4500",
    "Retur Penjualan": "4500",
    "diskon penjualan": "4600",
    "Diskon Penjualan": "4600",

    // HPP
    "hpp": ACCOUNT_CODES.HPP_LAPTOP,
    "HPP": ACCOUNT_CODES.HPP_LAPTOP,
    "harga pokok penjualan": ACCOUNT_CODES.HPP_LAPTOP,
    "Harga Pokok Penjualan": ACCOUNT_CODES.HPP_LAPTOP,
    "hpp laptop": ACCOUNT_CODES.HPP_LAPTOP,
    "HPP Laptop": ACCOUNT_CODES.HPP_LAPTOP,
    "hpp sparepart": ACCOUNT_CODES.HPP_SPAREPART,
    "HPP Sparepart": ACCOUNT_CODES.HPP_SPAREPART,
    "hpp aksesoris": ACCOUNT_CODES.HPP_AKSESORIS,
    "HPP Aksesoris": ACCOUNT_CODES.HPP_AKSESORIS,
    "hpp servis": ACCOUNT_CODES.HPP_SERVIS,
    "HPP Servis": ACCOUNT_CODES.HPP_SERVIS,

    // Beban Operasional
    "beban gaji": ACCOUNT_CODES.BEBAN_GAJI,
    "beban gaji karyawan": ACCOUNT_CODES.BEBAN_GAJI,
    "Beban Gaji Karyawan": ACCOUNT_CODES.BEBAN_GAJI,
    "Beban Gaji": ACCOUNT_CODES.BEBAN_GAJI,
    "gaji": ACCOUNT_CODES.BEBAN_GAJI,
    "Gaji": ACCOUNT_CODES.BEBAN_GAJI,
    "gaji karyawan": ACCOUNT_CODES.BEBAN_GAJI,
    "beban listrik": ACCOUNT_CODES.BEBAN_LISTRIK_AIR,
    "beban listrik & internet": ACCOUNT_CODES.BEBAN_LISTRIK_AIR,
    "Beban Listrik & Internet": ACCOUNT_CODES.BEBAN_LISTRIK_AIR,
    "listrik": ACCOUNT_CODES.BEBAN_LISTRIK_AIR,
    "internet": ACCOUNT_CODES.BEBAN_LISTRIK_AIR,
    "beban sewa": ACCOUNT_CODES.BEBAN_SEWA_GEDUNG,
    "beban sewa tempat": ACCOUNT_CODES.BEBAN_SEWA_GEDUNG,
    "Beban Sewa Tempat": ACCOUNT_CODES.BEBAN_SEWA_GEDUNG,
    "sewa": ACCOUNT_CODES.BEBAN_SEWA_GEDUNG,
    "Sewa": ACCOUNT_CODES.BEBAN_SEWA_GEDUNG,
    "sewa tempat": ACCOUNT_CODES.BEBAN_SEWA_GEDUNG,
    "beban transportasi": ACCOUNT_CODES.BEBAN_TRANSPORTASI,
    "Beban Transportasi": ACCOUNT_CODES.BEBAN_TRANSPORTASI,
    "transportasi": ACCOUNT_CODES.BEBAN_TRANSPORTASI,
    "beban marketing": ACCOUNT_CODES.BEBAN_MARKETING,
    "Beban Marketing": ACCOUNT_CODES.BEBAN_MARKETING,
    "marketing": ACCOUNT_CODES.BEBAN_MARKETING,
    "iklan": ACCOUNT_CODES.BEBAN_MARKETING,
    "beban administrasi": ACCOUNT_CODES.BEBAN_LAIN_LAIN,
    "Beban Administrasi": ACCOUNT_CODES.BEBAN_LAIN_LAIN,
    "administrasi": ACCOUNT_CODES.BEBAN_LAIN_LAIN,
    "Beban ATK & Perlengkapan": ACCOUNT_CODES.BEBAN_LAIN_LAIN,
    "Beban Pemasaran / Iklan": ACCOUNT_CODES.BEBAN_MARKETING,
    "Beban Perbaikan & Perawatan": ACCOUNT_CODES.BEBAN_PERBAIKAN,
    "Beban Lain-lain": ACCOUNT_CODES.BEBAN_LAIN_LAIN,
    "beban penyusutan": ACCOUNT_CODES.BEBAN_PENYUSUTAN,
    "Beban Penyusutan": ACCOUNT_CODES.BEBAN_PENYUSUTAN,
    "penyusutan": ACCOUNT_CODES.BEBAN_PENYUSUTAN,
    "depresiasi": ACCOUNT_CODES.BEBAN_PENYUSUTAN,
    "beban perbaikan": ACCOUNT_CODES.BEBAN_PERBAIKAN,
    "Beban Perbaikan": ACCOUNT_CODES.BEBAN_PERBAIKAN,
    "perbaikan": ACCOUNT_CODES.BEBAN_PERBAIKAN,
    "beban asuransi": ACCOUNT_CODES.BEBAN_LAIN_LAIN,
    "Beban Asuransi": ACCOUNT_CODES.BEBAN_LAIN_LAIN,
    "asuransi": ACCOUNT_CODES.BEBAN_LAIN_LAIN,
    "beban pajak": ACCOUNT_CODES.BEBAN_LAIN_LAIN,
    "Beban Pajak": ACCOUNT_CODES.BEBAN_LAIN_LAIN,
    "pajak": ACCOUNT_CODES.BEBAN_LAIN_LAIN,
    "beban bunga": ACCOUNT_CODES.BEBAN_LAIN_LAIN,
    "Beban Bunga": ACCOUNT_CODES.BEBAN_LAIN_LAIN,
    "bunga": ACCOUNT_CODES.BEBAN_LAIN_LAIN,
    "beban penurunan nilai persediaan": ACCOUNT_CODES.BEBAN_LAIN_LAIN,
    "Beban Penurunan Nilai Persediaan": ACCOUNT_CODES.BEBAN_LAIN_LAIN,
    "beban lainnya": ACCOUNT_CODES.BEBAN_LAIN_LAIN,
    "Beban Lainnya": ACCOUNT_CODES.BEBAN_LAIN_LAIN,
    "beban lain": ACCOUNT_CODES.BEBAN_LAIN_LAIN,
    "beban lain-lain": ACCOUNT_CODES.BEBAN_LAIN_LAIN,
};

/**
 * Get account code from account name
 */
export function getAccountCodeFromName(accountName: string | null): string | null {
    if (!accountName) return null;

    // Direct match
    if (ACCOUNT_NAME_MAPPINGS[accountName]) {
        return ACCOUNT_NAME_MAPPINGS[accountName];
    }

    // Partial match (contains)
    const lowerName = accountName.toLowerCase();
    for (const [key, code] of Object.entries(ACCOUNT_NAME_MAPPINGS)) {
        if (lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)) {
            return code;
        }
    }

    // Fallback for custom opex categories: if it contains "beban" or "biaya", map to "5600" (Beban Lainnya)
    if (lowerName.startsWith("beban") || lowerName.startsWith("biaya") || lowerName.includes("beban ") || lowerName.includes("biaya ")) {
        return "5600";
    }

    return null;
}

/**
 * Map all unmapped journal entries to account codes
 * Returns count of entries updated
 */
export async function mapUnmappedJournalEntries(scope: Scope): Promise<number> {
    // Bound in SQL, not in JS. This used to select every tenant's unmapped
    // entries and then skip the foreign ones with
    // `if (storeId && entry.storeId !== storeId) continue`, which had two
    // consequences: the caller's process held other tenants' rows, and for an
    // owner — whose storeId is the "all" sentinel — nothing ever matched, so the
    // endpoint silently mapped zero entries and reported success.
    const entries = await db.select({
        id: journalEntries.id,
        accountName: journalEntries.accountName,
    })
    .from(journalEntries)
    .where(and(isNull(journalEntries.accountCode), storeScope(scope, journalEntries.storeId)));

    let updatedCount = 0;
    const byCode = new Map<string, string[]>();

    for (const entry of entries) {
        const code = getAccountCodeFromName(entry.accountName);
        if (!code) continue;
        const ids = byCode.get(code);
        if (ids) ids.push(entry.id);
        else byCode.set(code, [entry.id]);
        updatedCount++;
    }

    // One UPDATE per distinct code instead of one per row — a full mapping run
    // over a busy ledger was thousands of round-trips.
    for (const [code, ids] of byCode) {
        await db.update(journalEntries)
            .set({ accountCode: code })
            .where(inArray(journalEntries.id, ids));
    }

    return updatedCount;
}

/**
 * Get mapping statistics
 */
export async function getMappingStats(scope: Scope) {
    // These three counts used to run with no WHERE on storeId at all — the
    // `storeId` parameter was accepted and then never referenced — so every
    // tenant was shown the whole platform's journal totals.
    //
    // One aggregate rather than three round-trips, same shape as the reports in
    // AccountingService.
    const [row] = await db.select({
        total: sql<number>`count(*)`,
        mapped: sql<number>`count(*) FILTER (WHERE ${journalEntries.accountCode} IS NOT NULL)`,
        unmapped: sql<number>`count(*) FILTER (WHERE ${journalEntries.accountCode} IS NULL)`,
    })
    .from(journalEntries)
    .where(storeScope(scope, journalEntries.storeId));

    return {
        total: Number(row?.total) || 0,
        mapped: Number(row?.mapped) || 0,
        unmapped: Number(row?.unmapped) || 0,
    };
}

/**
 * Validate that account_code exists in COA
 * Returns list of invalid mappings
 */
export async function validateMappings(scope: Scope): Promise<{ invalidId: string; invalidCode: string; accountName: string }[]> {
    // Took no scope at all before, so it walked every tenant's ledger and
    // returned their entry ids and account names to whoever asked. The COA
    // lookup was unscoped too, which meant a code was judged "valid" if ANY
    // tenant happened to have it — the check could pass on someone else's books.
    const bound = storeScope(scope, journalEntries.storeId);

    const entriesWithCode = await db.select({
        id: journalEntries.id,
        accountCode: journalEntries.accountCode,
        accountName: journalEntries.accountName
    })
    .from(journalEntries)
    .where(and(sql`${journalEntries.accountCode} IS NOT NULL`, bound));

    if (entriesWithCode.length === 0) return [];

    // The caller's own active COA, read once. This was a findFirst per entry —
    // one round-trip per journal line.
    const coaRows = await db.select({ code: chartOfAccounts.code })
        .from(chartOfAccounts)
        .where(and(
            eq(chartOfAccounts.isActive, true),
            storeScope(scope, chartOfAccounts.storeId)
        ));
    const validCodes = new Set(coaRows.map((r) => r.code));

    const invalidMappings: { invalidId: string; invalidCode: string; accountName: string }[] = [];
    for (const entry of entriesWithCode) {
        if (!entry.accountCode) continue;
        if (!validCodes.has(entry.accountCode)) {
            invalidMappings.push({
                invalidId: entry.id,
                invalidCode: entry.accountCode,
                accountName: entry.accountName || 'Unknown'
            });
        }
    }

    return invalidMappings;
}
