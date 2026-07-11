import { pgTable, text, integer, doublePrecision, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';
import { stores } from '@/db/schema/store';
import { user } from '@/db/schema/users';

// ── Chart of Accounts (Bagan Akun) ──────────────────────────────────────────
export const chartOfAccounts = pgTable("chart_of_accounts", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().default("default").references(() => stores.id, { onDelete: 'cascade' }),
    code: text("code").notNull(),                    // e.g., "1000", "1100", "4110"
    name: text("name").notNull(),                   // e.g., "Kas", "Pendapatan", "HPP"
    type: text("type").notNull(),                   // 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense'
    subType: text("sub_type"),                       // nullable, e.g., "Bank", "Current", "Fixed"
    parentId: text("parent_id"),                     // FK to parent chart_of_accounts for hierarchy
    openingBalance: doublePrecision("opening_balance").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    isSystem: boolean("is_system").notNull().default(false),  // default accounts
    normalBalance: text("normal_balance").notNull().default('Debit'),  // 'Debit' | 'Credit'
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("coa_store_id_idx").on(table.storeId),
    storeCodeIdx: uniqueIndex("coa_store_code_idx").on(table.storeId, table.code),
    parentIdx: index("coa_parent_idx").on(table.parentId),
    typeIdx: index("coa_type_idx").on(table.type),
    activeIdx: index("coa_active_idx").on(table.isActive),
}));

export const chartOfAccountsRelations = relations(chartOfAccounts, ({ one, many }) => ({
    store: one(stores, {
        fields: [chartOfAccounts.storeId],
        references: [stores.id],
    }),
    parent: one(chartOfAccounts, {
        fields: [chartOfAccounts.parentId],
        references: [chartOfAccounts.id],
        relationName: "accountHierarchy",
    }),
    children: many(chartOfAccounts, { relationName: "accountHierarchy" }),
}));

// ── Fiscal Periods (Periode Fiskal) ─────────────────────────────────────────
export const fiscalPeriods = pgTable("fiscal_periods", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().default("default").references(() => stores.id, { onDelete: 'cascade' }),
    year: integer("year").notNull(),
    month: integer("month"),                        // nullable for yearly periods, 1-12
    status: text("status").notNull().default('OPEN'),  // 'OPEN' | 'CLOSED' | 'ARCHIVED'
    closedBy: text("closed_by").references(() => user.id, { onDelete: 'set null' }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("fp_store_id_idx").on(table.storeId),
    yearMonthIdx: uniqueIndex("fp_store_year_month_idx").on(table.storeId, table.year, table.month),
    statusIdx: index("fp_status_idx").on(table.status),
    closedByIdx: index("fp_closed_by_idx").on(table.closedBy),
}));

export const fiscalPeriodsRelations = relations(fiscalPeriods, ({ one, many }) => ({
    store: one(stores, {
        fields: [fiscalPeriods.storeId],
        references: [stores.id],
    }),
    closedByUser: one(user, {
        fields: [fiscalPeriods.closedBy],
        references: [user.id],
    }),
    depreciationEntries: many(depreciationEntries),
    closingEntry: one(closingEntries, {
        fields: [fiscalPeriods.id],
        references: [closingEntries.fiscalPeriodId],
    }),
}));

// ── Fixed Assets (Aset Tetap) ───────────────────────────────────────────────
export const fixedAssets = pgTable("fixed_assets", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().default("default").references(() => stores.id, { onDelete: 'cascade' }),
    code: text("code").notNull(),                   // e.g., "ATL-001"
    name: text("name").notNull(),                   // e.g., "Laptop Dell XPS 15"
    description: text("description"),
    accountCode: text("account_code").notNull(),    // COA code for the asset account
    accumulatedDepreciationAccount: text("accumulated_depreciation_account").notNull(),  // COA code
    depreciationExpenseAccount: text("depreciation_expense_account").notNull(),            // COA code
    purchaseDate: text("purchase_date").notNull(),  // ISO date string
    purchasePrice: doublePrecision("purchase_price").notNull(),
    usefulLifeMonths: integer("useful_life_months").notNull(),  // e.g., 60 for 5 years
    salvageValue: doublePrecision("salvage_value").notNull().default(0),
    depreciationMethod: text("depreciation_method").notNull().default('straight_line'),
    status: text("status").notNull().default('active'),  // 'active' | 'disposed' | 'fully_depreciated'
    disposedDate: text("disposed_date"),
    disposedNotes: text("disposed_notes"),
    disposedProceeds: doublePrecision("disposed_proceeds").default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("fa_store_id_idx").on(table.storeId),
    codeIdx: uniqueIndex("fa_code_idx").on(table.storeId, table.code),
    statusIdx: index("fa_status_idx").on(table.status),
    accountCodeIdx: index("fa_account_code_idx").on(table.accountCode),
}));

export const fixedAssetsRelations = relations(fixedAssets, ({ one, many }) => ({
    store: one(stores, {
        fields: [fixedAssets.storeId],
        references: [stores.id],
    }),
    depreciationEntries: many(depreciationEntries),
}));

// ── Depreciation Entries (Entri Penyusutan) ─────────────────────────────────
export const depreciationEntries = pgTable("depreciation_entries", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().default("default").references(() => stores.id, { onDelete: 'cascade' }),
    fixedAssetId: text("fixed_asset_id").notNull().references(() => fixedAssets.id, { onDelete: 'cascade' }),
    fiscalPeriodId: text("fiscal_period_id").notNull().references(() => fiscalPeriods.id, { onDelete: 'cascade' }),
    amount: doublePrecision("amount").notNull(),               // Monthly depreciation amount
    cumulativeAmount: doublePrecision("cumulative_amount").notNull(),  // Total accumulated to date
    netBookValue: doublePrecision("net_book_value").notNull(), // Remaining book value
    journalEntryId: text("journal_entry_id"),       // Reference to generated journal entry
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("de_store_id_idx").on(table.storeId),
    assetPeriodIdx: uniqueIndex("de_asset_period_idx").on(table.fixedAssetId, table.fiscalPeriodId),
    fiscalPeriodIdx: index("de_fiscal_period_idx").on(table.fiscalPeriodId),
    journalEntryIdx: index("de_journal_entry_idx").on(table.journalEntryId),
}));

export const depreciationEntriesRelations = relations(depreciationEntries, ({ one }) => ({
    store: one(stores, {
        fields: [depreciationEntries.storeId],
        references: [stores.id],
    }),
    fixedAsset: one(fixedAssets, {
        fields: [depreciationEntries.fixedAssetId],
        references: [fixedAssets.id],
    }),
    fiscalPeriod: one(fiscalPeriods, {
        fields: [depreciationEntries.fiscalPeriodId],
        references: [fiscalPeriods.id],
    }),
}));

// ── Closing Entries (Entri Penutupan) ──────────────────────────────────────
export const closingEntries = pgTable("closing_entries", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().default("default").references(() => stores.id, { onDelete: 'cascade' }),
    fiscalPeriodId: text("fiscal_period_id").notNull().unique().references(() => fiscalPeriods.id, { onDelete: 'cascade' }),
    closingType: text("closing_type").notNull(),    // 'monthly' | 'yearly'
    closedBy: text("closed_by").notNull().references(() => user.id, { onDelete: 'cascade' }),
    // Revenue entries closed to income summary
    revenueEntries: text("revenue_entries"),       // JSON: [{accountCode, amount}]
    // Expense entries closed to income summary
    expenseEntries: text("expense_entries"),        // JSON: [{accountCode, amount}]
    // Net income transferred to retained earnings
    netIncome: doublePrecision("net_income").notNull().default(0),
    incomeSummaryAccount: text("income_summary_account").notNull(),  // COA code
    retainedEarningsAccount: text("retained_earnings_account").notNull(),  // COA code
    // Journal entry IDs for audit trail
    closingJournalEntryId: text("closing_journal_entry_id"),
    retainedEarningsJournalEntryId: text("retained_earnings_journal_entry_id"),
    closedAt: timestamp('closed_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
    notes: text("notes"),
}, (table) => ({
    storeIdIdx: index("ce_store_id_idx").on(table.storeId),
    fiscalPeriodIdx: uniqueIndex("ce_fiscal_period_idx").on(table.fiscalPeriodId),
    closedByIdx: index("ce_closed_by_idx").on(table.closedBy),
}));

export const closingEntriesRelations = relations(closingEntries, ({ one }) => ({
    store: one(stores, {
        fields: [closingEntries.storeId],
        references: [stores.id],
    }),
    fiscalPeriod: one(fiscalPeriods, {
        fields: [closingEntries.fiscalPeriodId],
        references: [fiscalPeriods.id],
    }),
    closedByUser: one(user, {
        fields: [closingEntries.closedBy],
        references: [user.id],
    }),
}));
