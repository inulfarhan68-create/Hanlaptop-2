import { db } from "./index";
import { chartOfAccounts, fiscalPeriods } from "./schema";

/**
 * Default Indonesian Chart of Accounts for a Han Laptop store/tenant.
 * Postgres-native replacement for the old libsql `migrate-accounting.ts` seed.
 * Codes align with `constants/accounting.ts` (ACCOUNT_CODES) and the account
 * names that `JournalMappingService` maps to, so accounting reports populate.
 */
export interface CoaSeedAccount {
    code: string;
    name: string;
    type: "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";
    subType: string;
    isSystem: boolean;
    normalBalance: "Debit" | "Credit";
}

export const DEFAULT_COA_ACCOUNTS: CoaSeedAccount[] = [
    // ASET (Assets) - 1xxx
    { code: "1000", name: "ASET", type: "Asset", subType: "Header", isSystem: true, normalBalance: "Debit" },
    { code: "1100", name: "Aset Lancar", type: "Asset", subType: "Header", isSystem: true, normalBalance: "Debit" },
    { code: "1110", name: "Kas", type: "Asset", subType: "Cash", isSystem: true, normalBalance: "Debit" },
    { code: "1120", name: "Bank", type: "Asset", subType: "Bank", isSystem: true, normalBalance: "Debit" },
    { code: "1130", name: "QRIS", type: "Asset", subType: "Bank", isSystem: true, normalBalance: "Debit" },
    { code: "1140", name: "Piutang Usaha", type: "Asset", subType: "Receivable", isSystem: true, normalBalance: "Debit" },
    { code: "1141", name: "Cadangan Piutang", type: "Asset", subType: "Contra", isSystem: true, normalBalance: "Credit" },
    { code: "1150", name: "Persediaan Laptop", type: "Asset", subType: "Inventory", isSystem: true, normalBalance: "Debit" },
    { code: "1160", name: "Persediaan Sparepart", type: "Asset", subType: "Inventory", isSystem: true, normalBalance: "Debit" },
    { code: "1165", name: "PPN Masukan", type: "Asset", subType: "Tax", isSystem: true, normalBalance: "Debit" },
    { code: "1170", name: "Persediaan Aksesoris", type: "Asset", subType: "Inventory", isSystem: true, normalBalance: "Debit" },
    { code: "1180", name: "Persediaan Konsinyasi", type: "Asset", subType: "Inventory", isSystem: true, normalBalance: "Debit" },
    { code: "1190", name: "Uang Muka Pembelian", type: "Asset", subType: "Receivable", isSystem: true, normalBalance: "Debit" },
    { code: "1195", name: "Uang Muka Pajak", type: "Asset", subType: "Tax", isSystem: true, normalBalance: "Debit" },
    { code: "1200", name: "Aset Tetap", type: "Asset", subType: "Header", isSystem: true, normalBalance: "Debit" },
    { code: "1210", name: "Kendaraan", type: "Asset", subType: "Fixed", isSystem: true, normalBalance: "Debit" },
    { code: "1220", name: "Peralatan", type: "Asset", subType: "Fixed", isSystem: true, normalBalance: "Debit" },
    { code: "1230", name: "Akumulasi Penyusutan", type: "Asset", subType: "Contra", isSystem: true, normalBalance: "Credit" },
    { code: "1240", name: "Aset Dalam Perbaikan", type: "Asset", subType: "Fixed", isSystem: true, normalBalance: "Debit" },
    { code: "1250", name: "Goodwill", type: "Asset", subType: "Intangible", isSystem: true, normalBalance: "Debit" },
    // KEWAJIBAN (Liabilities) - 2xxx
    { code: "2000", name: "KEWAJIBAN", type: "Liability", subType: "Header", isSystem: true, normalBalance: "Credit" },
    { code: "2100", name: "Utang Lancar", type: "Liability", subType: "Header", isSystem: true, normalBalance: "Credit" },
    { code: "2110", name: "Utang Usaha", type: "Liability", subType: "Payable", isSystem: true, normalBalance: "Credit" },
    { code: "2120", name: "Utang Konsinyasi", type: "Liability", subType: "Consignment", isSystem: true, normalBalance: "Credit" },
    { code: "2130", name: "Utang Pajak", type: "Liability", subType: "Tax", isSystem: true, normalBalance: "Credit" },
    { code: "2140", name: "Uang Muka Pelanggan", type: "Liability", subType: "Deferred", isSystem: true, normalBalance: "Credit" },
    { code: "2150", name: "Cadangan Garansi", type: "Liability", subType: "Deferred", isSystem: true, normalBalance: "Credit" },
    { code: "2160", name: "Voucher/Gift Card", type: "Liability", subType: "Deferred", isSystem: true, normalBalance: "Credit" },
    { code: "2200", name: "Utang Jangka Panjang", type: "Liability", subType: "Header", isSystem: true, normalBalance: "Credit" },
    { code: "2210", name: "Hutang Bank", type: "Liability", subType: "LongTerm", isSystem: true, normalBalance: "Credit" },
    // MODAL (Equity) - 3xxx
    { code: "3000", name: "MODAL", type: "Equity", subType: "Header", isSystem: true, normalBalance: "Credit" },
    { code: "3100", name: "Modal Pemilik", type: "Equity", subType: "Capital", isSystem: true, normalBalance: "Credit" },
    { code: "3200", name: "Laba Ditahan", type: "Equity", subType: "Retained", isSystem: true, normalBalance: "Credit" },
    { code: "3300", name: "Laba/Rugi Tahun Berjalan", type: "Equity", subType: "CurrentYear", isSystem: true, normalBalance: "Credit" },
    // PENDAPATAN (Revenue) - 4xxx
    { code: "4000", name: "PENDAPATAN", type: "Revenue", subType: "Header", isSystem: true, normalBalance: "Credit" },
    { code: "4100", name: "Pendapatan Penjualan", type: "Revenue", subType: "Sales", isSystem: true, normalBalance: "Credit" },
    { code: "4110", name: "Penjualan Laptop", type: "Revenue", subType: "Sales", isSystem: true, normalBalance: "Credit" },
    { code: "4120", name: "Penjualan Sparepart", type: "Revenue", subType: "Sales", isSystem: true, normalBalance: "Credit" },
    { code: "4130", name: "Penjualan Aksesoris", type: "Revenue", subType: "Sales", isSystem: true, normalBalance: "Credit" },
    { code: "4140", name: "Penjualan Konsinyasi", type: "Revenue", subType: "Sales", isSystem: true, normalBalance: "Credit" },
    { code: "4150", name: "Penjualan Software/Lisensi", type: "Revenue", subType: "Sales", isSystem: true, normalBalance: "Credit" },
    { code: "4160", name: "Pendapatan Trade-In", type: "Revenue", subType: "Sales", isSystem: true, normalBalance: "Credit" },
    { code: "4170", name: "Pendapatan Refurbish", type: "Revenue", subType: "Sales", isSystem: true, normalBalance: "Credit" },
    { code: "4180", name: "Pendapatan Garansi", type: "Revenue", subType: "Sales", isSystem: true, normalBalance: "Credit" },
    { code: "4190", name: "Pendapatan Instalasi", type: "Revenue", subType: "Service", isSystem: true, normalBalance: "Credit" },
    { code: "4200", name: "Pendapatan Servis", type: "Revenue", subType: "Service", isSystem: true, normalBalance: "Credit" },
    { code: "4300", name: "Pendapatan Komisi", type: "Revenue", subType: "Commission", isSystem: true, normalBalance: "Credit" },
    { code: "4400", name: "Pendapatan Lainnya", type: "Revenue", subType: "Other", isSystem: true, normalBalance: "Credit" },
    { code: "4500", name: "Retur Penjualan", type: "Revenue", subType: "Return", isSystem: true, normalBalance: "Debit" },
    { code: "4600", name: "Diskon Penjualan", type: "Revenue", subType: "Discount", isSystem: true, normalBalance: "Debit" },
    // HPP & BEBAN (Expenses) - 5xxx
    { code: "5000", name: "BEBAN", type: "Expense", subType: "Header", isSystem: true, normalBalance: "Debit" },
    { code: "5100", name: "Harga Pokok Penjualan", type: "Expense", subType: "COGS", isSystem: true, normalBalance: "Debit" },
    { code: "5110", name: "HPP Laptop", type: "Expense", subType: "COGS", isSystem: true, normalBalance: "Debit" },
    { code: "5120", name: "HPP Sparepart", type: "Expense", subType: "COGS", isSystem: true, normalBalance: "Debit" },
    { code: "5130", name: "HPP Aksesoris", type: "Expense", subType: "COGS", isSystem: true, normalBalance: "Debit" },
    { code: "5140", name: "HPP Servis", type: "Expense", subType: "COGS", isSystem: true, normalBalance: "Debit" },
    { code: "5150", name: "HPP Refurbish", type: "Expense", subType: "COGS", isSystem: true, normalBalance: "Debit" },
    { code: "5160", name: "HPP Trade-In", type: "Expense", subType: "COGS", isSystem: true, normalBalance: "Debit" },
    { code: "5200", name: "Beban Operasional", type: "Expense", subType: "Header", isSystem: true, normalBalance: "Debit" },
    { code: "5210", name: "Beban Gaji Karyawan", type: "Expense", subType: "Payroll", isSystem: true, normalBalance: "Debit" },
    { code: "5220", name: "Beban Listrik & Internet", type: "Expense", subType: "Utilities", isSystem: true, normalBalance: "Debit" },
    { code: "5230", name: "Beban Sewa Tempat", type: "Expense", subType: "Rent", isSystem: true, normalBalance: "Debit" },
    { code: "5240", name: "Beban Transportasi", type: "Expense", subType: "Travel", isSystem: true, normalBalance: "Debit" },
    { code: "5250", name: "Beban Marketing", type: "Expense", subType: "Marketing", isSystem: true, normalBalance: "Debit" },
    { code: "5260", name: "Beban Administrasi", type: "Expense", subType: "Admin", isSystem: true, normalBalance: "Debit" },
    { code: "5270", name: "Beban Penyusutan", type: "Expense", subType: "Depreciation", isSystem: true, normalBalance: "Debit" },
    { code: "5280", name: "Beban Perbaikan", type: "Expense", subType: "Maintenance", isSystem: true, normalBalance: "Debit" },
    { code: "5290", name: "Beban Asuransi", type: "Expense", subType: "Insurance", isSystem: true, normalBalance: "Debit" },
    { code: "5300", name: "Beban Pajak", type: "Expense", subType: "Tax", isSystem: true, normalBalance: "Debit" },
    { code: "5400", name: "Beban Bunga", type: "Expense", subType: "Finance", isSystem: true, normalBalance: "Debit" },
    { code: "5500", name: "Beban Penurunan Nilai Persediaan", type: "Expense", subType: "WriteOff", isSystem: true, normalBalance: "Debit" },
    { code: "5600", name: "Beban Lainnya", type: "Expense", subType: "Other", isSystem: true, normalBalance: "Debit" },
];

/** Extra internal accounts for a SaaS platform-operator tenant. */
export const SAAS_INTERNAL_COA_ACCOUNTS: CoaSeedAccount[] = [
    { code: "5310", name: "Beban Hosting SaaS", type: "Expense", subType: "Admin", isSystem: true, normalBalance: "Debit" },
    { code: "5320", name: "Beban AI API", type: "Expense", subType: "Admin", isSystem: true, normalBalance: "Debit" },
    { code: "5330", name: "Beban Payment Gateway", type: "Expense", subType: "Finance", isSystem: true, normalBalance: "Debit" },
    { code: "5340", name: "Beban Domain", type: "Expense", subType: "Admin", isSystem: true, normalBalance: "Debit" },
    { code: "5350", name: "Beban Cloud Storage", type: "Expense", subType: "Admin", isSystem: true, normalBalance: "Debit" },
];

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
if (require.main === module) {
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
