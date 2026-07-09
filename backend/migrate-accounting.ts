import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
dotenv.config();

const client = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN!,
    fetch: globalThis.fetch,
});

async function runSQL(sql: string) {
    try {
        await client.execute(sql);
        console.log(`✓ ${sql.substring(0, 70)}...`);
    } catch (err: any) {
        const msg = err.message || '';
        if (msg.includes("duplicate column") || msg.includes("already exists") || msg.includes("table already")) {
            console.log(`⏭ Already exists: ${sql.substring(0, 55)}...`);
        } else {
            console.error(`✗ Error: ${msg} | SQL: ${sql.substring(0, 55)}...`);
        }
    }
}

// Default COA accounts for Han Laptop (Indonesian Chart of Accounts)
const DEFAULT_COA_ACCOUNTS = [
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

// Akun khusus untuk internal pembukuan perusahaan penyedia SaaS (Platform Operator)
const SAAS_INTERNAL_COA_ACCOUNTS = [
    { code: "5310", name: "Beban Hosting SaaS", type: "Expense", subType: "Admin", isSystem: true, normalBalance: "Debit" },
    { code: "5320", name: "Beban AI API", type: "Expense", subType: "Admin", isSystem: true, normalBalance: "Debit" },
    { code: "5330", name: "Beban Payment Gateway", type: "Expense", subType: "Finance", isSystem: true, normalBalance: "Debit" },
    { code: "5340", name: "Beban Domain", type: "Expense", subType: "Admin", isSystem: true, normalBalance: "Debit" },
    { code: "5350", name: "Beban Cloud Storage", type: "Expense", subType: "Admin", isSystem: true, normalBalance: "Debit" },
];

async function seedCOA(storeId: string = "default", isSaaSPlatform: boolean = false) {
    const now = Date.now();

    // Gabungkan akun default tenant dengan akun internal SaaS JIKA store tersebut adalah operator platform
    const accountsToSeed = isSaaSPlatform 
        ? [...DEFAULT_COA_ACCOUNTS, ...SAAS_INTERNAL_COA_ACCOUNTS]
        : DEFAULT_COA_ACCOUNTS;

    for (const account of accountsToSeed) {
        try {
            await client.execute({
                sql: `INSERT OR IGNORE INTO chart_of_accounts
                      (id, store_id, code, name, type, sub_type, opening_balance, is_active, is_system, normal_balance, created_at, updated_at)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [
                    crypto.randomUUID(),
                    storeId,
                    account.code,
                    account.name,
                    account.type,
                    account.subType,
                    0,
                    1,
                    account.isSystem ? 1 : 0,
                    account.normalBalance,
                    now,
                    now
                ]
            });
            console.log(`✓ Seeded: ${account.code} - ${account.name}`);
        } catch (err: any) {
            console.log(`⏭ Already exists or error: ${account.code} - ${err.message}`);
        }
    }
}

async function migrate() {
    console.log("DB URL:", process.env.DATABASE_URL);
    console.log("Token present:", !!process.env.DATABASE_AUTH_TOKEN);

    // Test connection first
    try {
        const test = await client.execute("SELECT 1 as ok");
        console.log("Connection OK:", test.rows[0]);
    } catch (e: any) {
        console.error("Connection FAILED:", e.message);
        process.exit(1);
    }

    console.log("\n📦 Running Accounting Module Migration...\n");

    // 1. Chart of Accounts
    console.log("\n📋 Creating chart_of_accounts table...");
    await runSQL(`
        CREATE TABLE IF NOT EXISTS chart_of_accounts (
            id TEXT PRIMARY KEY,
            store_id TEXT NOT NULL DEFAULT 'default',
            code TEXT NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            sub_type TEXT,
            parent_id TEXT,
            opening_balance REAL NOT NULL DEFAULT 0,
            is_active INTEGER NOT NULL DEFAULT 1,
            is_system INTEGER NOT NULL DEFAULT 0,
            normal_balance TEXT NOT NULL DEFAULT 'Debit',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )
    `);
    await runSQL(`CREATE UNIQUE INDEX IF NOT EXISTS coa_store_code_idx ON chart_of_accounts (store_id, code)`);
    await runSQL(`CREATE INDEX IF NOT EXISTS coa_parent_idx ON chart_of_accounts (parent_id)`);
    await runSQL(`CREATE INDEX IF NOT EXISTS coa_type_idx ON chart_of_accounts (type)`);
    await runSQL(`CREATE INDEX IF NOT EXISTS coa_active_idx ON chart_of_accounts (is_active)`);

    // 2. Fiscal Periods
    console.log("\n📋 Creating fiscal_periods table...");
    await runSQL(`
        CREATE TABLE IF NOT EXISTS fiscal_periods (
            id TEXT PRIMARY KEY,
            store_id TEXT NOT NULL DEFAULT 'default',
            year INTEGER NOT NULL,
            month INTEGER,
            status TEXT NOT NULL DEFAULT 'OPEN',
            closed_by TEXT,
            closed_at INTEGER,
            notes TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )
    `);
    await runSQL(`CREATE UNIQUE INDEX IF NOT EXISTS fp_store_year_month_idx ON fiscal_periods (store_id, year, month)`);
    await runSQL(`CREATE INDEX IF NOT EXISTS fp_status_idx ON fiscal_periods (status)`);
    await runSQL(`CREATE INDEX IF NOT EXISTS fp_closed_by_idx ON fiscal_periods (closed_by)`);

    // 3. Fixed Assets
    console.log("\n📋 Creating fixed_assets table...");
    await runSQL(`
        CREATE TABLE IF NOT EXISTS fixed_assets (
            id TEXT PRIMARY KEY,
            store_id TEXT NOT NULL DEFAULT 'default',
            code TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            account_code TEXT NOT NULL,
            accumulated_depreciation_account TEXT NOT NULL,
            depreciation_expense_account TEXT NOT NULL,
            purchase_date TEXT NOT NULL,
            purchase_price REAL NOT NULL,
            useful_life_months INTEGER NOT NULL,
            salvage_value REAL NOT NULL DEFAULT 0,
            depreciation_method TEXT NOT NULL DEFAULT 'straight_line',
            status TEXT NOT NULL DEFAULT 'active',
            disposed_date TEXT,
            disposed_notes TEXT,
            disposed_proceeds REAL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )
    `);
    await runSQL(`CREATE INDEX IF NOT EXISTS fa_store_id_idx ON fixed_assets (store_id)`);
    await runSQL(`CREATE UNIQUE INDEX IF NOT EXISTS fa_code_idx ON fixed_assets (store_id, code)`);
    await runSQL(`CREATE INDEX IF NOT EXISTS fa_status_idx ON fixed_assets (status)`);
    await runSQL(`CREATE INDEX IF NOT EXISTS fa_account_code_idx ON fixed_assets (account_code)`);

    // 4. Depreciation Entries
    console.log("\n📋 Creating depreciation_entries table...");
    await runSQL(`
        CREATE TABLE IF NOT EXISTS depreciation_entries (
            id TEXT PRIMARY KEY,
            store_id TEXT NOT NULL DEFAULT 'default',
            fixed_asset_id TEXT NOT NULL,
            fiscal_period_id TEXT NOT NULL,
            amount REAL NOT NULL,
            cumulative_amount REAL NOT NULL,
            net_book_value REAL NOT NULL,
            journal_entry_id TEXT,
            created_at INTEGER NOT NULL
        )
    `);
    await runSQL(`CREATE INDEX IF NOT EXISTS de_store_id_idx ON depreciation_entries (store_id)`);
    await runSQL(`CREATE UNIQUE INDEX IF NOT EXISTS de_asset_period_idx ON depreciation_entries (fixed_asset_id, fiscal_period_id)`);
    await runSQL(`CREATE INDEX IF NOT EXISTS de_fiscal_period_idx ON depreciation_entries (fiscal_period_id)`);
    await runSQL(`CREATE INDEX IF NOT EXISTS de_journal_entry_idx ON depreciation_entries (journal_entry_id)`);

    // 5. Closing Entries
    console.log("\n📋 Creating closing_entries table...");
    await runSQL(`
        CREATE TABLE IF NOT EXISTS closing_entries (
            id TEXT PRIMARY KEY,
            store_id TEXT NOT NULL DEFAULT 'default',
            fiscal_period_id TEXT NOT NULL UNIQUE,
            closing_type TEXT NOT NULL,
            closed_by TEXT NOT NULL,
            revenue_entries TEXT,
            expense_entries TEXT,
            net_income REAL NOT NULL DEFAULT 0,
            income_summary_account TEXT NOT NULL,
            retained_earnings_account TEXT NOT NULL,
            closing_journal_entry_id TEXT,
            retained_earnings_journal_entry_id TEXT,
            closed_at INTEGER NOT NULL,
            notes TEXT
        )
    `);
    await runSQL(`CREATE INDEX IF NOT EXISTS ce_store_id_idx ON closing_entries (store_id)`);
    await runSQL(`CREATE UNIQUE INDEX IF NOT EXISTS ce_fiscal_period_idx ON closing_entries (fiscal_period_id)`);
    await runSQL(`CREATE INDEX IF NOT EXISTS ce_closed_by_idx ON closing_entries (closed_by)`);

    // 6. Add account_code to journal_entries (backward compatible)
    console.log("\n📋 Adding account_code to journal_entries...");
    await runSQL(`ALTER TABLE journal_entries ADD COLUMN account_code TEXT`);
    await runSQL(`CREATE INDEX IF NOT EXISTS journal_entries_account_code_idx ON journal_entries (account_code)`);

    // Setup Default COA for the default tenant
    console.log("\n🌱 Seeding Default COA...");
    await seedCOA("default", true); // "default" dianggap sebagai entitas HQ/SaaS untuk saat ini

    // 8. Create current fiscal period if not exists
    console.log("\n📋 Creating current fiscal period...");
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    try {
        await client.execute({
            sql: `INSERT OR IGNORE INTO fiscal_periods
                  (id, store_id, year, month, status, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
            args: [
                crypto.randomUUID(),
                "default",
                currentYear,
                currentMonth,
                "OPEN",
                Date.now(),
                Date.now()
            ]
        });
        console.log(`✓ Created fiscal period: ${currentYear}-${currentMonth}`);
    } catch (err: any) {
        console.log(`⏭ Fiscal period already exists or error: ${err.message}`);
    }

    console.log("\n✅ Accounting Module Migration Complete!");
    console.log("\n📊 Summary:");
    console.log("   - chart_of_accounts table created (54 default accounts seeded)");
    console.log("   - fiscal_periods table created (current period auto-created)");
    console.log("   - fixed_assets table created");
    console.log("   - depreciation_entries table created");
    console.log("   - closing_entries table created");
    console.log("   - journal_entries.account_code column added");

    process.exit(0);
}

migrate();
