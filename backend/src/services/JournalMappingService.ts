import { db } from "@/db";
import { chartOfAccounts, journalEntries } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

/**
 * Mapping dari accountName ke accountCode berdasarkan COA
 */
const ACCOUNT_NAME_MAPPINGS: Record<string, string> = {
    // Aset Lancar
    "kas": "1110",
    "Kas": "1110",
    "KAS": "1110",
    "bank": "1120",
    "Bank": "1120",
    "BANK": "1120",
    "rekening bank": "1120",
    "rekening": "1120",
    "qris": "1130",
    "QRIS": "1130",
    "piutang usaha": "1140",
    "Piutang Usaha": "1140",
    "Piutang": "1140",
    "piutang": "1140",
    "persediaan": "1150",
    "Persediaan": "1150",
    "persediaan barang dagang": "1150",
    "persediaan barang": "1150",
    "uang muka pajak": "1160",
    "Uang Muka Pajak": "1160",

    // Aset Tetap
    "kendaraan": "1210",
    "Kendaraan": "1210",
    "mobil": "1210",
    "motor": "1210",
    "peralatan": "1220",
    "Peralatan": "1220",
    "komputer": "1220",
    "laptop": "1220",
    "akumulasi penyusutan": "1230",
    "Akumulasi Penyusutan": "1230",
    "accumulated depreciation": "1230",

    // Kewajiban
    "utang usaha": "2110",
    "Utang Usaha": "2110",
    "Hutang Usaha": "2110",
    "hutang usaha": "2110",
    "utang konsinyasi": "2120",
    "Utang Konsinyasi": "2120",
    "utang pajak": "2130",
    "Utang Pajak": "2130",
    "hutang bank": "2210",
    "Hutang Bank": "2210",

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
    "pendapatan": "4110",
    "Pendapatan": "4110",
    "penjualan laptop": "4110",
    "Penjualan Laptop": "4110",
    "penjualan laptop bekas": "4110",
    "penjualan": "4110",
    "Penjualan": "4110",
    "penjualan aksesoris": "4120",
    "Penjualan Aksesoris": "4120",
    "pendapatan servis": "4200",
    "Pendapatan Servis": "4200",
    "servis": "4200",
    "Servis": "4200",
    "beban servis": "5120",
    "pendapatan komisi": "4300",
    "Pendapatan Komisi": "4300",
    "komisi": "4300",
    "Komisi": "4300",
    "pendapatan lainnya": "4400",
    "Pendapatan Lainnya": "4400",
    "retur penjualan": "4500",
    "Retur Penjualan": "4500",
    "diskon penjualan": "4600",
    "Diskon Penjualan": "4600",

    // HPP
    "hpp": "5110",
    "HPP": "5110",
    "harga pokok penjualan": "5110",
    "Harga Pokok Penjualan": "5110",
    "hpp laptop": "5110",
    "HPP Laptop": "5110",
    "hpp servis": "5120",
    "HPP Servis": "5120",

    // Beban Operasional
    "beban gaji": "5210",
    "beban gaji karyawan": "5210",
    "Beban Gaji Karyawan": "5210",
    "Beban Gaji": "5210",
    "gaji": "5210",
    "Gaji": "5210",
    "gaji karyawan": "5210",
    "beban listrik": "5220",
    "beban listrik & internet": "5220",
    "Beban Listrik & Internet": "5220",
    "listrik": "5220",
    "internet": "5220",
    "beban sewa": "5230",
    "beban sewa tempat": "5230",
    "Beban Sewa Tempat": "5230",
    "sewa": "5230",
    "Sewa": "5230",
    "sewa tempat": "5230",
    "beban transportasi": "5240",
    "Beban Transportasi": "5240",
    "transportasi": "5240",
    "beban marketing": "5250",
    "Beban Marketing": "5250",
    "marketing": "5250",
    "iklan": "5250",
    "beban administrasi": "5260",
    "Beban Administrasi": "5260",
    "administrasi": "5260",
    "beban penyusutan": "5270",
    "Beban Penyusutan": "5270",
    "penyusutan": "5270",
    "depresiasi": "5270",
    "beban perbaikan": "5280",
    "Beban Perbaikan": "5280",
    "perbaikan": "5280",
    "beban asuransi": "5290",
    "Beban Asuransi": "5290",
    "asuransi": "5290",
    "beban pajak": "5300",
    "Beban Pajak": "5300",
    "pajak": "5300",
    "beban bunga": "5400",
    "Beban Bunga": "5400",
    "bunga": "5400",
    "beban penurunan nilai persediaan": "5500",
    "Beban Penurunan Nilai Persediaan": "5500",
    "beban lainnya": "5600",
    "Beban Lainnya": "5600",
    "beban lain": "5600",
    "beban lain-lain": "5600",

    // Pendapatan/Beban Lainnya
    "pendapatan lain": "6000",
    "pendapatan operasi lain": "6000",
    "beban non-operasional": "7000",
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
