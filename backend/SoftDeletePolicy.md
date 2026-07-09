# Soft Delete Policy & Architecture Specification

## Policy Overview
To maintain accounting integrity and a robust audit trail, **hard deletions of financial records are strictly prohibited** in the production environment. Instead, a **soft delete pattern** is implemented for transactions and journal entries. 

All database records corresponding to transactions and accounting journals must retain a soft delete state via the `isVoided` attribute.

---

## 1. Database Schema
- **`transactions.isVoided`**: Boolean, defaults to `false`. When a transaction is deleted/cancelled, it is set to `true`.
- **`journal_entries.isVoided`**: Boolean, defaults to `false`. When a transaction is voided, all corresponding journal entries are marked `isVoided = true`.

---

## 2. Centralized Query Helpers
To prevent logic fragmentation and duplication, all operational queries must filter out voided records using the functional query helpers defined in [query-helpers.ts](file:///c:/Users/inulf/OneDrive/Documents/Hanlaptop-2/backend/src/db/query-helpers.ts):

- **`withActiveTransactions(...conds)`**: Combines any provided Drizzle conditions with `eq(transactions.isVoided, false)`.
- **`withActiveJournalEntries(...conds)`**: Combines any provided Drizzle conditions with `eq(journalEntries.isVoided, false)`.

### Usage Example
```typescript
import { withActiveTransactions } from "@/db/query-helpers";

// Fetching active transactions for a specific store
const activeTransactions = await db.query.transactions.findMany({
    where: withActiveTransactions(eq(transactions.storeId, storeId))
});
```

---

## 3. Operational Domain Constraints
The following areas **must automatically ignore** voided transactions and voided journal entries to prevent cash/reporting discrepancies:
- **Dashboard Metrics**: All sales, profit, and revenue calculations.
- **Expected Cash Calculations (Shifts)**: Opened and closed shifts cash calculations.
- **Financial Reports**: Trial Balance, Profit & Loss (Income Statement), Balance Sheet, Cash Flow.
- **Product & Inventory Analytics**: Dead stock and service revenue aggregations.
- **Alerts**: Overdue receivables (piutang) and payables (hutang) listings.
- **Warranty Checks**: Serial number searches must ignore voided items.

---

## 4. Exceptions & Audit Trail
- **General Ledger (GL)**: The GL lists active journals by default. However, it supports a `showVoided=true` query parameter for auditing.
- **Audit Logs**: Activity logs and system administration screens can retrieve all entries including voided ones to allow tracking of who voided which transaction and when.
- **Sequence Generation**: Invoice number generation (e.g. `INV/...`) must query all transactions (including voided ones) to prevent reusing the same sequence numbers and triggering unique constraint violations.

---

## 5. State Modifications & Payoffs
- **Blocked Actions**: A voided transaction cannot be updated, and its payment status cannot be marked as paid off.
- **Service Orders**: Syncing service order statuses to linked transactions must only target active transactions.
