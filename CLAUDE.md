# Financial Management & Accounting Module - Implementation Plan

## Decisions Confirmed
- ✅ COA Format: Custom (sesuai kebutuhan Han Laptop)
- ✅ Depreciation: On-demand calculation
- ✅ Closing Period: Included in Phase 1

---

## Phase 1: Foundation & Core Reports

### 1.1 Backend - Database Schema

#### New Files

**[NEW] `backend/src/db/schema/accounting.ts`**
```
Tables:
├── chart_of_accounts
│   ├── id (UUID, PK)
│   ├── storeId (FK → stores)
│   ├── code (TEXT, unique per store, e.g., "1000", "1100", "4110")
│   ├── name (TEXT, e.g., "Kas", "Pendapatan", "HPP")
│   ├── type (ENUM: 'Asset', 'Liability', 'Equity', 'Revenue', 'Expense')
│   ├── subType (TEXT, nullable, e.g., "Bank", "Current", "Fixed")
│   ├── parentId (FK → chart_of_accounts, nullable, for hierarchy)
│   ├── openingBalance (REAL, default 0)
│   ├── isActive (BOOLEAN, default true)
│   ├── isSystem (BOOLEAN, default false) -- for default accounts
│   ├── createdAt, updatedAt (timestamps)
│   └── Indexes: storeId+code (unique), parentId, type
│
├── fiscal_periods
│   ├── id (UUID, PK)
│   ├── storeId (FK → stores)
│   ├── year (INTEGER, e.g., 2026)
│   ├── month (INTEGER, 1-12, nullable for yearly periods)
│   ├── status (ENUM: 'OPEN', 'CLOSED', 'ARCHIVED')
│   ├── closedBy (FK → users, nullable)
│   ├── closedAt (timestamp, nullable)
│   ├── notes (TEXT, nullable)
│   ├── createdAt, updatedAt (timestamps)
│   └── Indexes: storeId+year+month (unique), status
│
├── fixed_assets
│   ├── id (UUID, PK)
│   ├── storeId (FK → stores)
│   ├── accountCode (FK → chart_of_accounts) -- aset tetap akun
│   ├── accumulatedDepreciationAccount (FK → chart_of_accounts) -- akumulasi penyusutan
│   ├── name (TEXT, e.g., "Laptop Dell XPS 15", "Mobil Avanza")
│   ├── purchaseDate (DATE)
│   ├── purchasePrice (REAL)
│   ├── usefulLifeMonths (INTEGER, e.g., 60 for 5 years)
│   ├── salvageValue (REAL, default 0)
│   ├── depreciationMethod (ENUM: 'straight_line', nullable -- future extensibility)
│   ├── status (ENUM: 'active', 'disposed', 'fully_depreciated')
│   ├── createdAt, updatedAt (timestamps)
│   └── Indexes: storeId, accountCode, status
│
├── depreciation_entries
│   ├── id (UUID, PK)
│   ├── storeId (FK → stores)
│   ├── fixedAssetId (FK → fixed_assets)
│   ├── fiscalPeriodId (FK → fiscal_periods)
│   ├── amount (REAL, monthly depreciation)
│   ├── cumulativeAmount (REAL, total accumulated to date)
│   ├── journalEntryId (FK → journal_entries, nullable)
│   ├── createdAt (timestamp)
│   └── Indexes: fixedAssetId+fiscalPeriodId (unique), fiscalPeriodId
│
└── closing_entries
    ├── id (UUID, PK)
    ├── storeId (FK → stores)
    ├── fiscalPeriodId (FK → fiscal_periods)
    ├── closingType (ENUM: 'monthly', 'yearly')
    ├── closedBy (FK → users)
    ├── incomeSummaryEntries (JSON, array of {accountCode, amount})
    ├── retainedEarningsEntry (JSON, {accountCode, amount})
    ├── closedAt (timestamp)
    └── Indexes: fiscalPeriodId (unique)
```

#### Modify Existing Files

**[MODIFY] `backend/src/db/schema/transactions.ts`**
```typescript
// Add to journalEntries table:
accountCode: text("account_code").references(() => chartOfAccounts.code, { onDelete: 'set null' })
```

**[MODIFY] `backend/src/db/schema/schema.ts`**
```typescript
// Add exports:
export { chartOfAccounts, chartOfAccountsRelations } from "./accounting"
export { fiscalPeriods, fiscalPeriodsRelations } from "./accounting"
export { fixedAssets, fixedAssetsRelations } from "./accounting"
export { depreciationEntries, depreciationEntriesRelations } from "./accounting"
export { closingEntries, closingEntriesRelations } from "./accounting"
```

---

### 1.2 Backend - Migration

**[MODIFY] `backend/migrate-prd.ts`**
```typescript
// Add after existing migrations:

// 1. Chart of Accounts
await runSQL(`
  CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Asset', 'Liability', 'Equity', 'Revenue', 'Expense')),
    sub_type TEXT,
    parent_id TEXT REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
    opening_balance REAL NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    is_system INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);
await runSQL(`CREATE UNIQUE INDEX IF NOT EXISTS coa_store_code_idx ON chart_of_accounts (store_id, code)`);
await runSQL(`CREATE INDEX IF NOT EXISTS coa_parent_idx ON chart_of_accounts (parent_id)`);
await runSQL(`CREATE INDEX IF NOT EXISTS coa_type_idx ON chart_of_accounts (type)`);

// 2. Fiscal Periods
await runSQL(`
  CREATE TABLE IF NOT EXISTS fiscal_periods (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER CHECK (month IS NULL OR (month >= 1 AND month <= 12)),
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'ARCHIVED')),
    closed_by TEXT,
    closed_at INTEGER,
    notes TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);
await runSQL(`CREATE UNIQUE INDEX IF NOT EXISTS fp_store_year_month_idx ON fiscal_periods (store_id, year, month)`);
await runSQL(`CREATE INDEX IF NOT EXISTS fp_status_idx ON fiscal_periods (status)`);

// 3. Fixed Assets
await runSQL(`
  CREATE TABLE IF NOT EXISTS fixed_assets (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    account_code TEXT NOT NULL,
    accumulated_depr_account TEXT NOT NULL,
    name TEXT NOT NULL,
    purchase_date TEXT NOT NULL,
    purchase_price REAL NOT NULL,
    useful_life_months INTEGER NOT NULL,
    salvage_value REAL NOT NULL DEFAULT 0,
    depreciation_method TEXT DEFAULT 'straight_line',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disposed', 'fully_depreciated')),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);
await runSQL(`CREATE INDEX IF NOT EXISTS fa_store_idx ON fixed_assets (store_id)`);
await runSQL(`CREATE INDEX IF NOT EXISTS fa_status_idx ON fixed_assets (status)`);

// 4. Depreciation Entries
await runSQL(`
  CREATE TABLE IF NOT EXISTS depreciation_entries (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    fixed_asset_id TEXT NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
    fiscal_period_id TEXT NOT NULL REFERENCES fiscal_periods(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    cumulative_amount REAL NOT NULL,
    journal_entry_id TEXT,
    created_at INTEGER NOT NULL
  )
`);
await runSQL(`CREATE UNIQUE INDEX IF NOT EXISTS de_asset_period_idx ON depreciation_entries (fixed_asset_id, fiscal_period_id)`);
await runSQL(`CREATE INDEX IF NOT EXISTS de_period_idx ON depreciation_entries (fiscal_period_id)`);

// 5. Closing Entries
await runSQL(`
  CREATE TABLE IF NOT EXISTS closing_entries (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    fiscal_period_id TEXT NOT NULL UNIQUE REFERENCES fiscal_periods(id) ON DELETE CASCADE,
    closing_type TEXT NOT NULL CHECK (closing_type IN ('monthly', 'yearly')),
    closed_by TEXT NOT NULL,
    income_summary_entries TEXT, -- JSON array
    retained_earnings_entry TEXT, -- JSON object
    closed_at INTEGER NOT NULL
  )
`);

// 6. Add account_code to journal_entries (backward compatible, nullable)
await runSQL(`ALTER TABLE journal_entries ADD COLUMN account_code TEXT`);

// 7. Seed default COA for Han Laptop (27 accounts)
// ... seed data SQL
```

---

### 1.3 Backend - API Routes

#### New API Routes

**[NEW] `backend/src/app/api/accounting/coa/route.ts`**
```typescript
// GET /api/accounting/coa?type=Asset&storeId=xxx
// POST /api/accounting/coa -- Create account (Owner only)
// PUT /api/accounting/coa/[id] -- Update account
// DELETE /api/accounting/coa/[id] -- Soft delete (Owner only)
```

**[NEW] `backend/src/app/api/accounting/general-ledger/route.ts`**
```typescript
// GET /api/accounting/general-ledger?accountCode=1000&from=2026-01-01&to=2026-01-31
// Returns: { account, openingBalance, entries[], closingBalance }
```

**[NEW] `backend/src/app/api/accounting/trial-balance/route.ts`**
```typescript
// GET /api/accounting/trial-balance?year=2026&month=1
// Returns: { accounts[], totalDebit, totalCredit, isBalanced }
```

**[NEW] `backend/src/app/api/accounting/income-statement/route.ts`**
```typescript
// GET /api/accounting/income-statement?year=2026&month=1
// Returns: structured P&L from General Ledger
```

**[NEW] `backend/src/app/api/accounting/balance-sheet/route.ts`**
```typescript
// GET /api/accounting/balance-sheet?year=2026&month=1
// Returns: { assets, liabilities, equity, isBalanced }
```

**[NEW] `backend/src/app/api/accounting/cash-flow/route.ts`**
```typescript
// GET /api/accounting/cash-flow?year=2026&month=1
// Returns: { operating, investing, financing, netChange, openingCash, closingCash }
```

**[NEW] `backend/src/app/api/accounting/equity-changes/route.ts`**
```typescript
// GET /api/accounting/equity-changes?year=2026&month=1
// Returns: { openingEquity, contributions, withdrawals, netIncome, closingEquity }
```

**[NEW] `backend/src/app/api/accounting/fixed-assets/route.ts`**
```typescript
// GET /api/accounting/fixed-assets
// POST /api/accounting/fixed-assets
// PUT /api/accounting/fixed-assets/[id]
// DELETE /api/accounting/fixed-assets/[id]
// POST /api/accounting/fixed-assets/[id]/depreciate -- Calculate depreciation
```

**[NEW] `backend/src/app/api/accounting/fiscal-periods/route.ts`**
```typescript
// GET /api/accounting/fiscal-periods
// POST /api/accounting/fiscal-periods -- Create period (auto on new month)
// POST /api/accounting/fiscal-periods/[id]/close -- Close period
// POST /api/accounting/fiscal-periods/[id]/reopen -- Reopen (Owner only)
```

**[NEW] `backend/src/app/api/accounting/journal-mapping/route.ts`**
```typescript
// POST /api/accounting/journal-mapping -- Map existing journal entries to COA
// Auto-maps by accountName → accountCode for backward compatibility
```

---

### 1.4 Frontend - Pages & Components

#### New Files

**[NEW] `src/pages/FinancialManagement.tsx`**
```
Main page with tabs:
├── Tab: Dashboard
│   └── KPI cards + summary charts
├── Tab: Bagan Akun (COA)
│   └── CRUD table with hierarchical view
├── Tab: Buku Besar (General Ledger)
│   └── Per-account ledger view
├── Tab: Neraca Saldo (Trial Balance)
│   └── Debit/Credit balance table
├── Tab: Laba Rugi (Income Statement)
│   └── Structured P&L report
├── Tab: Neraca (Balance Sheet)
│   └── Assets = Liabilities + Equity
├── Tab: Arus Kas (Cash Flow)
│   └── Operating/Investing/Financing
├── Tab: Perubahan Ekuitas (Equity Changes)
│   └── Equity movement report
└── Tab: Aset Tetap (Fixed Assets)
    └── Asset list + depreciation
```

**[NEW] `src/components/accounting/COATable.tsx`**
- Table with columns: Kode, Nama, Tipe, Saldo Awal, Status
- Inline edit capability
- Hierarchical indentation

**[NEW] `src/components/accounting/GeneralLedgerView.tsx`**
- Account selector dropdown
- Period selector
- Transactions list with running balance

**[NEW] `src/components/accounting/TrialBalanceTable.tsx`**
- Two-column (Debit/Credit) balance sheet
- Validation indicator (✅ Seimbang / ❌ Tidak Seimbang)

**[NEW] `src/components/accounting/IncomeStatementReport.tsx`**
- Hierarchical P&L structure
- Expandable sections

**[NEW] `src/components/accounting/BalanceSheetReport.tsx`**
- Current/Fixed Assets breakdown
- Liabilities breakdown
- Equity section

**[NEW] `src/components/accounting/CashFlowReport.tsx`**
- Three sections (Operating, Investing, Financing)
- Net change calculation

**[NEW] `src/components/accounting/FixedAssetsTable.tsx`**
- Asset list with depreciation status
- Add/Edit/Dispose functionality
- Depreciation schedule view

---

#### Modify Existing Files

**[MODIFY] `src/App.tsx`**
```tsx
// Add route:
const FinancialManagement = lazy(() => import("@/pages/FinancialManagement").then(m => ({ default: m.FinancialManagement })))

<Route path="/financial" element={<FinancialManagement />} />
```

**[MODIFY] `src/components/layout/Sidebar.tsx`**
```tsx
// Add "Keuangan" group with:
{ group: "Keuangan", items: [
  { title: "Manajemen Keuangan", href: "/financial", icon: Wallet },
  { title: "Piutang", href: "/piutang", icon: Receipt },
  { title: "Hutang", href: "/hutang", icon: CreditCard },
]}
```

---

## Phase 2: Advanced Features (Future)

### 2.1 Inventory Valuation
- Moving Average calculation
- Dedicated inventory valuation report

### 2.2 Financial Analytics
- Margin produk, margin merek
- Profit teknisi, profit cabang

### 2.3 Export Capabilities
- PDF/Excel/CSV for all financial reports

### 2.4 Audit Trail
- Old value/new value logging for financial changes

---

## Phase 3: Polish & Optimization (Future)

### 3.1 Interactive Dashboard
- Recharts integration
- Draggable KPI cards

### 3.2 Multi-Period Comparison
- Side-by-side period comparison

### 3.3 Print Optimization
- Store branding on prints

---

## Implementation Sequence

### Step 1: Database & Migration
1. Create `accounting.ts` schema
2. Modify `transactions.ts` and `schema.ts`
3. Run migration `migrate-prd.ts`
4. Seed default COA (27 accounts)

### Step 2: Core API Services
1. Create `AccountingService.ts` for calculations
2. Create `/api/accounting/coa` CRUD
3. Create `/api/accounting/general-ledger`
4. Create `/api/accounting/trial-balance`
5. Create `/api/accounting/income-statement`
6. Create `/api/accounting/balance-sheet`

### Step 3: Financial Reports API
1. Create `/api/accounting/cash-flow`
2. Create `/api/accounting/equity-changes`
3. Create `/api/accounting/fiscal-periods` with closing

### Step 4: Fixed Assets Module
1. Create `/api/accounting/fixed-assets`
2. Create depreciation calculation logic

### Step 5: Frontend Core
1. Create `FinancialManagement.tsx` page structure
2. Create COA management table
3. Create General Ledger view
4. Create Trial Balance table

### Step 6: Financial Report Views
1. Income Statement report
2. Balance Sheet report
3. Cash Flow report
4. Equity Changes report

### Step 7: Fixed Assets UI
1. Fixed Assets table
2. Depreciation schedule view
3. Add/Edit/Dispose modals

### Step 8: Navigation & Polish
1. Update Sidebar
2. Add to App.tsx routes
3. Connect to existing Reports page

---

## Verification Checklist

### Database
- [ ] All tables created
- [ ] Indexes created
- [ ] Foreign keys working
- [ ] Default COA seeded

### API
- [ ] COA CRUD working
- [ ] General Ledger calculates correctly
- [ ] Trial Balance validates (Debit = Credit)
- [ ] Income Statement matches General Ledger
- [ ] Balance Sheet validates (A = L + E)
- [ ] Period closing prevents new transactions
- [ ] Fixed assets depreciation calculates correctly

### Frontend
- [ ] All tabs render correctly
- [ ] Tables are sortable/filterable
- [ ] Forms validate input
- [ ] Print functionality works
- [ ] Mobile responsive

### Integration
- [ ] New journal entries use accountCode
- [ ] Existing journals backward compatible
- [ ] Dashboard KPIs match reports

---

## Soft Delete Policy
For instructions and rules on soft deleting transactions and journal entries, refer to the [Soft Delete Policy Specification](file:///c:/Users/inulf/OneDrive/Documents/Hanlaptop-2/backend/SoftDeletePolicy.md).
