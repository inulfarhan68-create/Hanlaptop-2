import { db } from "@/db";
import { chartOfAccounts, journalEntries } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { ACCOUNT_CODES } from "../constants/accounting";

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
export async function mapUnmappedJournalEntries(storeId?: string): Promise<number> {
    // Get entries without account_code
    let query = db.select({
        id: journalEntries.id,
        accountName: journalEntries.accountName,
        storeId: journalEntries.storeId
    })
    .from(journalEntries)
    .where(isNull(journalEntries.accountCode));

    const entries = await query;

    let updatedCount = 0;

    for (const entry of entries) {
        // Filter by storeId if provided
        if (storeId && entry.storeId !== storeId) continue;

        const code = getAccountCodeFromName(entry.accountName);
        if (code) {
            await db.update(journalEntries)
                .set({ accountCode: code })
                .where(eq(journalEntries.id, entry.id));
            updatedCount++;
            console.log(`Mapped: ${entry.accountName} -> ${code}`);
        }
    }

    return updatedCount;
}

/**
 * Get mapping statistics
 */
export async function getMappingStats(storeId?: string) {
    const allEntries = await db.select({ count: sql<number>`count(*)` })
        .from(journalEntries);

    const unmappedEntries = await db.select({ count: sql<number>`count(*)` })
        .from(journalEntries)
        .where(isNull(journalEntries.accountCode));

    const mappedEntries = await db.select({ count: sql<number>`count(*)` })
        .from(journalEntries)
        .where(sql`${journalEntries.accountCode} IS NOT NULL`);

    return {
        total: Number(allEntries[0]?.count) || 0,
        mapped: Number(mappedEntries[0]?.count) || 0,
        unmapped: Number(unmappedEntries[0]?.count) || 0
    };
}

/**
 * Validate that account_code exists in COA
 * Returns list of invalid mappings
 */
export async function validateMappings(): Promise<{ invalidId: string; invalidCode: string; accountName: string }[]> {
    const entriesWithCode = await db.select({
        id: journalEntries.id,
        accountCode: journalEntries.accountCode,
        accountName: journalEntries.accountName
    })
    .from(journalEntries)
    .where(sql`${journalEntries.accountCode} IS NOT NULL`);

    const invalidMappings: { invalidId: string; invalidCode: string; accountName: string }[] = [];

    for (const entry of entriesWithCode) {
        if (!entry.accountCode) continue;

        const coa = await db.query.chartOfAccounts.findFirst({
            where: and(
                eq(chartOfAccounts.code, entry.accountCode),
                eq(chartOfAccounts.isActive, true)
            )
        });

        if (!coa) {
            invalidMappings.push({
                invalidId: entry.id,
                invalidCode: entry.accountCode,
                accountName: entry.accountName || 'Unknown'
            });
        }
    }

    return invalidMappings;
}
