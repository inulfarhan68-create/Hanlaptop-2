import { db } from "@/db";
import {
    chartOfAccounts,
    fiscalPeriods,
    fixedAssets,
    depreciationEntries,
    closingEntries,
    journalEntries,
    transactions
} from "@/db/schema";
import { desc, eq, and, gte, lte, or, inArray, sql } from "drizzle-orm";
import { CASH_EQUIVALENTS } from "../constants/accounting";

// ── Types ────────────────────────────────────────────────────────────────────

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
export type PeriodStatus = 'OPEN' | 'CLOSED' | 'ARCHIVED';
export type FixedAssetStatus = 'active' | 'disposed' | 'fully_depreciated';

export interface AccountBalance {
    accountCode: string;
    accountName: string;
    accountType: AccountType;
    openingBalance: number;
    totalDebit: number;
    totalCredit: number;
    closingBalance: number;
    normalBalance: 'Debit' | 'Credit';
}

export interface JournalEntryWithBalance {
    id: string;
    transactionId: string;
    accountName: string;
    accountCode: string | null;
    debit: number;
    credit: number;
    createdAt: Date;
    runningBalance: number;
    transactionType?: string | null;
    invoiceNumber?: string | null;
}

export interface TrialBalanceRow {
    accountCode: string;
    accountName: string;
    accountType: AccountType;
    debit: number;
    credit: number;
}

export interface IncomeStatementSection {
    name: string;
    accounts: { code: string; name: string; amount: number }[];
    total: number;
}

export interface IncomeStatementData {
    period: { year: number; month: number };
    sections: IncomeStatementSection[];
    grossProfit: number;
    operatingIncome: number;
    netIncome: number;
    // Extended fields
    revenue?: number;
    cogs?: number;
    opex?: number;
    otherIncome?: number;
    otherExpense?: number;
    incomeBeforeTax?: number;
    tax?: number;
}

export interface BalanceSheetData {
    period: { year: number; month: number };
    assets: {
        current: { code: string; name: string; amount: number }[];
        fixed: { code: string; name: string; amount: number }[];
        totalCurrent: number;
        totalFixed: number;
        total: number;
    };
    liabilities: {
        current: { code: string; name: string; amount: number }[];
        longTerm: { code: string; name: string; amount: number }[];
        totalCurrent: number;
        totalLongTerm: number;
        total: number;
    };
    equity: {
        accounts: { code: string; name: string; amount: number }[];
        calculated: number;
        total: number;
        netIncome?: number;
    };
    isBalanced: boolean;
    balanceEquation?: {
        assets: number;
        liabilities: number;
        equity: number;
        isBalanced: boolean;
    };
}

export interface CashFlowSection {
    name: string;
    items: { description: string; amount: number }[];
    total: number;
}

export interface CashFlowData {
    period: { year: number; month: number };
    operating: CashFlowSection;
    investing: CashFlowSection;
    financing: CashFlowSection;
    netChange: number;
    openingCash: number;
    closingCash: number;
}

export interface EquityChangesData {
    period: { year: number; month: number };
    openingEquity: number;
    contributions: number;
    withdrawals: number;
    netIncome: number;
    closingEquity: number;
}

// ── Helper Functions ──────────────────────────────────────────────────────────

/**
 * Get the start and end date of a fiscal period
 */
export function getPeriodDates(year: number, month: number): { start: Date; end: Date } {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    return { start, end };
}

/**
 * Calculate account balance from journal entries
 */
export async function calculateAccountBalance(
    storeId: string,
    accountCode: string,
    asOfDate: Date
): Promise<{ totalDebit: number; totalCredit: number; balance: number }> {
    const account = await db.query.chartOfAccounts.findFirst({
        where: and(
            eq(chartOfAccounts.storeId, storeId),
            eq(chartOfAccounts.code, accountCode)
        )
    });

    if (!account) {
        return { totalDebit: 0, totalCredit: 0, balance: 0 };
    }

    const entries = await db.select({
        totalDebit: sql<number>`SUM(${journalEntries.debit})`,
        totalCredit: sql<number>`SUM(${journalEntries.credit})`
    })
    .from(journalEntries)
    .where(and(
        eq(journalEntries.storeId, storeId),
        eq(journalEntries.accountCode, accountCode),
        eq(journalEntries.isVoided, false),
        lte(journalEntries.createdAt, asOfDate)
    ));

    const totalDebit = Number(entries[0]?.totalDebit) || 0;
    const totalCredit = Number(entries[0]?.totalCredit) || 0;
    const openingBalance = account.openingBalance || 0;

    // Calculate balance based on normal balance type
    let balance: number;
    if (account.normalBalance === 'Debit') {
        balance = openingBalance + totalDebit - totalCredit;
    } else {
        balance = openingBalance + totalCredit - totalDebit;
    }

    return { totalDebit, totalCredit, balance };
}

/**
 * Get fiscal period for a given date
 */
export async function getFiscalPeriod(storeId: string, year: number, month?: number) {
    if (month) {
        return await db.query.fiscalPeriods.findFirst({
            where: and(
                eq(fiscalPeriods.storeId, storeId),
                eq(fiscalPeriods.year, year),
                eq(fiscalPeriods.month, month)
            )
        });
    } else {
        // Yearly period
        return await db.query.fiscalPeriods.findFirst({
            where: and(
                eq(fiscalPeriods.storeId, storeId),
                eq(fiscalPeriods.year, year),
                sql`${fiscalPeriods.month} IS NULL`
            )
        });
    }
}

/**
 * Check if a period is closed
 */
export async function isPeriodClosed(storeId: string, year: number, month: number): Promise<boolean> {
    const period = await getFiscalPeriod(storeId, year, month);
    return period?.status === 'CLOSED' || period?.status === 'ARCHIVED';
}

// ── General Ledger ───────────────────────────────────────────────────────────

/**
 * Get General Ledger entries for an account within a period
 */
export async function getGeneralLedger(
    storeId: string,
    accountCode: string,
    year: number,
    month: number
): Promise<{
    account: typeof chartOfAccounts.$inferSelect;
    openingBalance: number;
    entries: JournalEntryWithBalance[];
    closingBalance: number;
}> {
    const { start, end } = getPeriodDates(year, month);

    // Get account info
    const account = await db.query.chartOfAccounts.findFirst({
        where: and(
            eq(chartOfAccounts.storeId, storeId),
            eq(chartOfAccounts.code, accountCode)
        )
    });

    if (!account) {
        throw new Error(`Account ${accountCode} not found`);
    }

    // Get opening balance (before period start)
    const openingResult = await calculateAccountBalance(storeId, accountCode, new Date(start.getTime() - 1));
    const openingBalance = account.openingBalance + openingResult.totalDebit - openingResult.totalCredit;
    const adjustedOpening = account.normalBalance === 'Debit'
        ? account.openingBalance + openingResult.totalDebit - openingResult.totalCredit
        : account.openingBalance + openingResult.totalCredit - openingResult.totalDebit;

    // Get journal entries for the period
    const journalData = await db.select({
        id: journalEntries.id,
        transactionId: journalEntries.transactionId,
        accountName: journalEntries.accountName,
        accountCode: journalEntries.accountCode,
        debit: journalEntries.debit,
        credit: journalEntries.credit,
        createdAt: journalEntries.createdAt,
        transactionType: transactions.transactionType,
        invoiceNumber: transactions.invoiceNumber
    })
    .from(journalEntries)
    .leftJoin(transactions, eq(journalEntries.transactionId, transactions.id))
    .where(and(
        eq(journalEntries.storeId, storeId),
        eq(journalEntries.accountCode, accountCode),
        eq(journalEntries.isVoided, false),
        gte(journalEntries.createdAt, start),
        lte(journalEntries.createdAt, end)
    ))
    .orderBy(journalEntries.createdAt);

    // Calculate running balance
    let runningBalance = adjustedOpening;
    const entries: JournalEntryWithBalance[] = journalData.map(entry => {
        const debit = Number(entry.debit) || 0;
        const credit = Number(entry.credit) || 0;

        if (account.normalBalance === 'Debit') {
            runningBalance = runningBalance + debit - credit;
        } else {
            runningBalance = runningBalance + credit - debit;
        }

        return {
            ...entry,
            runningBalance
        };
    });

    return {
        account,
        openingBalance: adjustedOpening,
        entries,
        closingBalance: runningBalance
    };
}

// ── Trial Balance ────────────────────────────────────────────────────────────

/**
 * Generate Trial Balance for a period
 */
export async function getTrialBalance(
    storeId: string,
    year: number,
    month: number
): Promise<{
    accounts: TrialBalanceRow[];
    totalDebit: number;
    totalCredit: number;
    isBalanced: boolean;
}> {
    const { start, end } = getPeriodDates(year, month);

    // Get all active accounts
    const accounts = await db.query.chartOfAccounts.findMany({
        where: and(
            eq(chartOfAccounts.storeId, storeId),
            eq(chartOfAccounts.isActive, true)
        ),
        orderBy: chartOfAccounts.code
    });

    const trialBalanceRows: TrialBalanceRow[] = [];

    // One grouped aggregate for the whole chart instead of a SUM per account.
    const activityMap = await getAccountActivityMap(storeId, start, end);

    for (const account of accounts) {
        const balance = balanceFromActivity(account, activityMap);

        // A negative balance lands on the opposite column of its normal side.
        let debit = 0;
        let credit = 0;

        if (account.normalBalance === 'Debit') {
            if (balance >= 0) {
                debit = balance;
            } else {
                credit = Math.abs(balance);
            }
        } else {
            if (balance >= 0) {
                credit = balance;
            } else {
                debit = Math.abs(balance);
            }
        }

        if (debit !== 0 || credit !== 0) {
            trialBalanceRows.push({
                accountCode: account.code,
                accountName: account.name,
                accountType: account.type as AccountType,
                debit,
                credit
            });
        }
    }

    const totalDebit = trialBalanceRows.reduce((sum, row) => sum + row.debit, 0);
    const totalCredit = trialBalanceRows.reduce((sum, row) => sum + row.credit, 0);

    return {
        accounts: trialBalanceRows,
        totalDebit,
        totalCredit,
        isBalanced: Math.abs(totalDebit - totalCredit) < 0.01
    };
}

// ── Income Statement ──────────────────────────────────────────────────────────

/**
 * Calculate account balance within a specific period
 */
export async function calculateAccountPeriodBalance(
    storeId: string,
    accountCode: string,
    start: Date,
    end: Date
): Promise<number> {
    const account = await db.query.chartOfAccounts.findFirst({
        where: and(
            eq(chartOfAccounts.storeId, storeId),
            eq(chartOfAccounts.code, accountCode)
        )
    });

    if (!account) return 0;

    const activity = await db.select({
        totalDebit: sql<number>`SUM(${journalEntries.debit})`,
        totalCredit: sql<number>`SUM(${journalEntries.credit})`
    })
    .from(journalEntries)
    .where(and(
        eq(journalEntries.storeId, storeId),
        eq(journalEntries.accountCode, accountCode),
        eq(journalEntries.isVoided, false),
        gte(journalEntries.createdAt, start),
        lte(journalEntries.createdAt, end)
    ));

    const periodDebit = Number(activity[0]?.totalDebit) || 0;
    const periodCredit = Number(activity[0]?.totalCredit) || 0;

    if (account.normalBalance === 'Debit') {
        return (account.openingBalance || 0) + periodDebit - periodCredit;
    } else {
        return (account.openingBalance || 0) + periodCredit - periodDebit;
    }
}

/**
 * Journal activity for one account within a window.
 */
type AccountActivity = { debit: number; credit: number };

/**
 * Sum every account's journal activity for a window in ONE grouped query.
 *
 * The report builders used to call `calculateAccountPeriodBalance` per account,
 * and each call costs two sequential round-trips (a COA lookup + a SUM). Against
 * a pooled remote Postgres that is ~250ms apiece, so a 60-account chart spent
 * ~30s in latency alone — the balance sheet compounded it by also awaiting a
 * full income statement. One GROUP BY answers all of it.
 */
async function getAccountActivityMap(
    storeId: string,
    start: Date,
    end: Date
): Promise<Map<string, AccountActivity>> {
    const rows = await db.select({
        accountCode: journalEntries.accountCode,
        totalDebit: sql<number>`SUM(${journalEntries.debit})`,
        totalCredit: sql<number>`SUM(${journalEntries.credit})`
    })
    .from(journalEntries)
    .where(and(
        eq(journalEntries.storeId, storeId),
        eq(journalEntries.isVoided, false),
        gte(journalEntries.createdAt, start),
        lte(journalEntries.createdAt, end)
    ))
    .groupBy(journalEntries.accountCode);

    const map = new Map<string, AccountActivity>();
    for (const row of rows) {
        if (!row.accountCode) continue;
        map.set(row.accountCode, {
            debit: Number(row.totalDebit) || 0,
            credit: Number(row.totalCredit) || 0
        });
    }
    return map;
}

/**
 * Balance of one account from a prefetched activity map. Mirrors
 * `calculateAccountPeriodBalance` exactly (opening balance + normal-balance
 * direction), minus the round-trips.
 */
function balanceFromActivity(
    account: { code: string; normalBalance: string | null; openingBalance: number | null },
    activity: Map<string, AccountActivity>
): number {
    const a = activity.get(account.code);
    const periodDebit = a?.debit ?? 0;
    const periodCredit = a?.credit ?? 0;
    const opening = account.openingBalance || 0;

    return account.normalBalance === 'Debit'
        ? opening + periodDebit - periodCredit
        : opening + periodCredit - periodDebit;
}

/**
 * Section name mapping for expense subTypes
 */
const EXPENSE_SECTION_NAMES: Record<string, string> = {
    'COGS': 'Harga Pokok Penjualan',
    'Payroll': 'Beban Gaji Karyawan',
    'Utilities': 'Beban Listrik & Internet',
    'Rent': 'Beban Sewa Tempat',
    'Travel': 'Beban Transportasi',
    'Marketing': 'Beban Marketing',
    'Admin': 'Beban Administrasi',
    'Depreciation': 'Beban Penyusutan',
    'Maintenance': 'Beban Perbaikan',
    'Insurance': 'Beban Asuransi',
    'Tax': 'Beban Pajak',
    'Finance': 'Beban Bunga',
    'WriteOff': 'Beban Penurunan Nilai Persediaan',
    'Other': 'Beban Lainnya'
};

/**
 * Generate Income Statement (Laporan Laba Rugi) for a period
 * Follows SAK Indonesia format
 */
export async function getIncomeStatement(
    storeId: string,
    year: number,
    month: number
): Promise<IncomeStatementData> {
    const { start, end } = getPeriodDates(year, month);

    // === PENDAPATAN Section ===
    const revenueSection: IncomeStatementSection = {
        name: 'PENDAPATAN',
        accounts: [],
        total: 0
    };

    // One COA fetch plus one grouped activity aggregate powers every section
    // below; the per-section account lists are derived in memory using the same
    // predicates the individual queries used.
    const [allAccounts, activityMap] = await Promise.all([
        db.query.chartOfAccounts.findMany({
            where: and(
                eq(chartOfAccounts.storeId, storeId),
                eq(chartOfAccounts.isActive, true)
            ),
            orderBy: chartOfAccounts.code
        }),
        getAccountActivityMap(storeId, start, end)
    ]);

    // type = Revenue, or code 4xxx / 6xxx
    const revenueAccounts = allAccounts.filter(a =>
        a.type === 'Revenue' || a.code.startsWith('4') || a.code.startsWith('6')
    );

    let totalRevenue = 0;

    for (const account of revenueAccounts) {
        // Skip header accounts
        if (account.subType === 'Header') continue;

        const balance = balanceFromActivity(account, activityMap);

        // Revenue accounts normally have credit balance (positive = income)
        // But retur/diskon have debit normal balance
        let displayAmount = balance;
        if (account.normalBalance === 'Debit') {
            // Retur and discount reduce revenue
            displayAmount = -Math.abs(balance);
        }

        if (balance !== 0) {
            // Categorize
            if (account.code.startsWith('4') && account.subType !== 'Return' && account.subType !== 'Discount') {
                revenueSection.accounts.push({ code: account.code, name: account.name, amount: balance });
                totalRevenue += balance;
            } else if (account.subType === 'Return' || account.subType === 'Discount') {
                // Retur & Diskon - negative to reduce revenue
                revenueSection.accounts.push({ code: account.code, name: account.name, amount: -Math.abs(balance) });
                totalRevenue -= Math.abs(balance);
            } else if (account.code.startsWith('6')) {
                // Other revenue (6xxx)
                revenueSection.accounts.push({ code: account.code, name: account.name, amount: balance });
                totalRevenue += balance;
            }
        }
    }

    const sections: IncomeStatementSection[] = [];

    // Add revenue section if has items
    if (revenueSection.accounts.length > 0) {
        revenueSection.total = totalRevenue;
        sections.push(revenueSection);
    }

    // === HARGA POKOK PENJUALAN Section ===
    const cogsSection: IncomeStatementSection = {
        name: 'HARGA POKOK PENJUALAN',
        accounts: [],
        total: 0
    };

    // COGS accounts (subType COGS, or code 51xxx)
    const cogsAccounts = allAccounts.filter(a => a.subType === 'COGS' || a.code.startsWith('51'));

    let totalCogs = 0;
    for (const account of cogsAccounts) {
        if (account.subType === 'Header') continue;
        const balance = balanceFromActivity(account, activityMap);
        if (balance !== 0) {
            cogsSection.accounts.push({ code: account.code, name: account.name, amount: Math.abs(balance) });
            totalCogs += Math.abs(balance);
        }
    }

    if (cogsSection.accounts.length > 0) {
        cogsSection.total = totalCogs;
        sections.push(cogsSection);
    }

    const grossProfit = totalRevenue - totalCogs;

    // === BEBAN OPERASIONAL Section ===
    const opexSection: IncomeStatementSection = {
        name: 'BEBAN OPERASIONAL',
        accounts: [],
        total: 0
    };

    // Get expense accounts (5xxx, 7xxx)
    const expenseAccounts = allAccounts.filter(a => a.type === 'Expense');

    // Group expenses by subType
    const expenseBySubType: Record<string, { code: string; name: string; amount: number }[]> = {};

    for (const account of expenseAccounts) {
        if (account.subType === 'Header') continue;
        if (account.code.startsWith('51')) continue; // Already in COGS

        const balance = balanceFromActivity(account, activityMap);
        if (balance !== 0) {
            const subType = account.subType || 'Other';
            if (!expenseBySubType[subType]) {
                expenseBySubType[subType] = [];
            }
            expenseBySubType[subType].push({ code: account.code, name: account.name, amount: Math.abs(balance) });
        }
    }

    let totalOpex = 0;

    // Add expenses in proper order
    const expenseOrder = ['Payroll', 'Utilities', 'Rent', 'Travel', 'Marketing', 'Admin', 'Depreciation', 'Maintenance', 'Insurance', 'Tax', 'Finance', 'WriteOff', 'Other'];

    for (const subType of expenseOrder) {
        if (expenseBySubType[subType] && expenseBySubType[subType].length > 0) {
            const sectionName = EXPENSE_SECTION_NAMES[subType] || subType;
            const sectionTotal = expenseBySubType[subType].reduce((sum, item) => sum + item.amount, 0);

            sections.push({
                name: sectionName,
                accounts: expenseBySubType[subType],
                total: sectionTotal
            });

            totalOpex += sectionTotal;
        }
    }

    const operatingIncome = grossProfit - totalOpex;

    // === PENDAPATAN/BEBAN LAINNYA Section ===
    const otherIncomeSection: IncomeStatementSection = {
        name: 'PENDAPATAN DAN BEBAN LAINNYA',
        accounts: [],
        total: 0
    };

    let totalOtherIncome = 0;
    let totalOtherExpense = 0;

    for (const account of allAccounts) {
        // Other revenue (6xxx) - non-operating income
        if (account.code.startsWith('6') && account.type === 'Revenue' && account.subType !== 'Header') {
            const balance = balanceFromActivity(account, activityMap);
            if (balance !== 0) {
                otherIncomeSection.accounts.push({ code: account.code, name: account.name, amount: balance });
                totalOtherIncome += balance;
            }
        }
        // Other expense (7xxx)
        if (account.code.startsWith('7') && account.type === 'Expense' && account.subType !== 'Header') {
            const balance = balanceFromActivity(account, activityMap);
            if (balance !== 0) {
                otherIncomeSection.accounts.push({ code: account.code, name: account.name, amount: -Math.abs(balance) });
                totalOtherExpense -= Math.abs(balance);
            }
        }
    }

    if (otherIncomeSection.accounts.length > 0) {
        otherIncomeSection.total = totalOtherIncome + totalOtherExpense;
        sections.push(otherIncomeSection);
    }

    const incomeBeforeTax = operatingIncome + (totalOtherIncome + totalOtherExpense);

    // === BEBAN PAJAK Section (if any) ===
    let totalTax = 0;
    const taxAccounts = expenseAccounts.filter(a => a.subType === 'Tax');
    for (const account of taxAccounts) {
        if (account.subType === 'Header') continue;
        const balance = balanceFromActivity(account, activityMap);
        if (balance !== 0) {
            totalTax += Math.abs(balance);
        }
    }

    const netIncome = incomeBeforeTax - totalTax;

    return {
        period: { year, month },
        sections,
        grossProfit,
        operatingIncome,
        netIncome,
        // Extended data for detailed view
        revenue: totalRevenue,
        cogs: totalCogs,
        opex: totalOpex,
        otherIncome: totalOtherIncome,
        otherExpense: Math.abs(totalOtherExpense),
        incomeBeforeTax,
        tax: totalTax
    };
}

// ── Balance Sheet ─────────────────────────────────────────────────────────────

/**
 * Calculate total equity from equity accounts
 */
async function calculateTotalEquity(
    storeId: string,
    asOfDate: Date
): Promise<number> {
    const equityAccounts = await db.query.chartOfAccounts.findMany({
        where: and(
            eq(chartOfAccounts.storeId, storeId),
            eq(chartOfAccounts.type, 'Equity'),
            eq(chartOfAccounts.isActive, true)
        )
    });

    let totalEquity = 0;

    for (const account of equityAccounts) {
        if (account.subType === 'Header') continue;

        const balance = await calculateAccountPeriodBalance(storeId, account.code, new Date(2000, 0, 1), asOfDate);
        totalEquity += balance;
    }

    return totalEquity;
}

/**
 * Generate Balance Sheet (Neraca) for a period
 * Follows SAK Indonesia format: Aset = Kewajiban + Ekuitas
 */
export async function getBalanceSheet(
    storeId: string,
    year: number,
    month: number
): Promise<BalanceSheetData> {
    const { start, end } = getPeriodDates(year, month);
    const asOfDate = end;

    // Inception-to-date activity: one grouped aggregate covering every account,
    // fetched alongside the chart of accounts and the income statement.
    const inception = new Date(2000, 0, 1);
    const [accounts, activityMap, incomeStmt] = await Promise.all([
        db.query.chartOfAccounts.findMany({
            where: and(
                eq(chartOfAccounts.storeId, storeId),
                eq(chartOfAccounts.isActive, true)
            ),
            orderBy: chartOfAccounts.code
        }),
        getAccountActivityMap(storeId, inception, asOfDate),
        getIncomeStatement(storeId, year, month)
    ]);

    // === ASET LANCAR ===
    const currentAssets: { code: string; name: string; amount: number }[] = [];
    // === ASET TETAP (NET) ===
    const fixedAssets: { code: string; name: string; amount: number }[] = [];
    // === KEWAJIBAN LANCAR ===
    const currentLiabilities: { code: string; name: string; amount: number }[] = [];
    // === KEWAJIBAN JANGKA PANJANG ===
    const longTermLiabilities: { code: string; name: string; amount: number }[] = [];
    // === EKUITAS ===
    const equityAccountsList: { code: string; name: string; amount: number }[] = [];

    let totalCurrentAssets = 0;
    let totalFixedAssets = 0;
    let totalCurrentLiabilities = 0;
    let totalLongTermLiabilities = 0;
    let totalEquity = 0;

    // Accumulated depreciation is a contra account applied to every fixed asset —
    // resolve its balance once instead of re-querying it inside the loop.
    const accDeprAccount = accounts.find(a => a.code === '1230');
    const accDeprBalance = accDeprAccount ? balanceFromActivity(accDeprAccount, activityMap) : 0;

    for (const account of accounts) {
        if (account.subType === 'Header') continue;

        const balance = balanceFromActivity(account, activityMap);

        if (account.type === 'Asset') {
            // Skip accumulated depreciation as it's a contra account
            if (account.subType === 'Contra') continue;

            if (account.subType === 'Fixed' || account.code.startsWith('12')) {
                // Fixed Asset - show net value
                let netValue = balance;

                if (accDeprAccount) {
                    netValue = balance - Math.abs(accDeprBalance); // Accumulated depreciation reduces asset value
                }

                if (netValue !== 0) {
                    fixedAssets.push({ code: account.code, name: account.name, amount: netValue });
                    totalFixedAssets += netValue;
                }
            } else {
                // Current Asset (1xxx except 12xx)
                if (balance !== 0) {
                    currentAssets.push({ code: account.code, name: account.name, amount: balance });
                    totalCurrentAssets += balance;
                }
            }
        } else if (account.type === 'Liability') {
            // Kewajiban
            if (account.code.startsWith('22')) {
                // Jangka Panjang
                longTermLiabilities.push({ code: account.code, name: account.name, amount: Math.abs(balance) });
                totalLongTermLiabilities += Math.abs(balance);
            } else {
                // Lancar
                currentLiabilities.push({ code: account.code, name: account.name, amount: Math.abs(balance) });
                totalCurrentLiabilities += Math.abs(balance);
            }
        } else if (account.type === 'Equity') {
            // Ekuitas
            if (balance !== 0) {
                equityAccountsList.push({ code: account.code, name: account.name, amount: balance });
                totalEquity += balance;
            }
        }
    }

    // Current-period earnings belong in equity (fetched above, in parallel).
    const netIncome = incomeStmt.netIncome;
    
    if (netIncome !== 0) {
        equityAccountsList.push({ 
            code: '3999', // Virtual code for Current Year Earnings
            name: 'Laba Bersih Periode Berjalan', 
            amount: netIncome 
        });
        totalEquity += netIncome;
    }

    const totalAssets = totalCurrentAssets + totalFixedAssets;
    const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;

    // Check balance: Aset = Kewajiban + Ekuitas
    const calculatedEquity = totalAssets - totalLiabilities;
    const isBalanced = Math.abs(totalEquity - calculatedEquity) < 1; // Allow 1 IDR difference for rounding

    return {
        period: { year, month },
        assets: {
            current: currentAssets,
            fixed: fixedAssets,
            totalCurrent: totalCurrentAssets,
            totalFixed: totalFixedAssets,
            total: totalAssets
        },
        liabilities: {
            current: currentLiabilities,
            longTerm: longTermLiabilities,
            totalCurrent: totalCurrentLiabilities,
            totalLongTerm: totalLongTermLiabilities,
            total: totalLiabilities
        },
        equity: {
            accounts: equityAccountsList,
            calculated: calculatedEquity,
            total: totalEquity,
            // Add net income from current period
            netIncome: netIncome
        },
        isBalanced,
        // Balance equation check
        balanceEquation: {
            assets: totalAssets,
            liabilities: totalLiabilities,
            equity: totalEquity,
            isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1
        }
    };
}

// ── Cash Flow ─────────────────────────────────────────────────────────────────

/**
 * Generate Cash Flow Statement (Laporan Arus Kas)
 */
export async function getCashFlow(
    storeId: string,
    year: number,
    month: number
): Promise<CashFlowData> {
    const { start, end } = getPeriodDates(year, month);

    // Cash accounts for opening/closing calculation
    const cashAccounts = CASH_EQUIVALENTS; // Kas, Bank, QRIS
    const inception = new Date(2000, 0, 1);
    const beforeStart = new Date(start.getTime() - 1);

    // Every figure below reads a disjoint slice of the ledger, so they all resolve
    // in parallel: the opening-cash balances come from one grouped aggregate
    // instead of a per-account round-trip, and the in/out flows share a single
    // scan (they differ only in which column they sum).
    const [cashCoaRows, openingActivity, flows, assetPurchases, loans] = await Promise.all([
        db.select({
            code: chartOfAccounts.code,
            normalBalance: chartOfAccounts.normalBalance,
            openingBalance: chartOfAccounts.openingBalance
        })
        .from(chartOfAccounts)
        .where(and(
            eq(chartOfAccounts.storeId, storeId),
            inArray(chartOfAccounts.code, cashAccounts)
        )),

        getAccountActivityMap(storeId, inception, beforeStart),

        db.select({
            inflow: sql<number>`SUM(${journalEntries.debit})`,
            outflow: sql<number>`SUM(${journalEntries.credit})`
        })
        .from(journalEntries)
        .where(and(
            eq(journalEntries.storeId, storeId),
            inArray(journalEntries.accountCode, cashAccounts),
            eq(journalEntries.isVoided, false),
            gte(journalEntries.createdAt, start),
            lte(journalEntries.createdAt, end)
        )),

        db.select({
            total: sql<number>`SUM(${journalEntries.debit})`
        })
        .from(journalEntries)
        .innerJoin(chartOfAccounts, eq(journalEntries.accountCode, chartOfAccounts.code))
        .where(and(
            eq(journalEntries.storeId, storeId),
            eq(chartOfAccounts.subType, 'Fixed'),
            eq(journalEntries.isVoided, false),
            gte(journalEntries.createdAt, start),
            lte(journalEntries.createdAt, end)
        )),

        db.select({
            total: sql<number>`SUM(${journalEntries.credit} - ${journalEntries.debit})`
        })
        .from(journalEntries)
        .where(and(
            eq(journalEntries.storeId, storeId),
            eq(journalEntries.accountCode, '2210'), // Hutang Bank
            eq(journalEntries.isVoided, false),
            gte(journalEntries.createdAt, start),
            lte(journalEntries.createdAt, end)
        ))
    ]);

    // Calculate opening cash (before period start)
    let openingCash = 0;
    for (const code of cashAccounts) {
        const account = cashCoaRows.find(a => a.code === code);
        if (!account) continue; // unknown account contributes nothing, as before
        openingCash += balanceFromActivity(account, openingActivity);
    }

    // Operating activities (from cash-related journal entries)
    const operatingItems: { description: string; amount: number }[] = [];
    let operatingTotal = 0;

    // Uang Masuk (Cash Inflows) -> Debit on Cash Accounts
    operatingTotal = Number(flows[0]?.inflow) || 0;
    operatingItems.push({ description: 'Penerimaan dari Pelanggan', amount: operatingTotal });

    // Uang Keluar (Cash Outflows) -> Credit on Cash Accounts
    const cashPaid = Number(flows[0]?.outflow) || 0;
    if (cashPaid > 0) {
        operatingItems.push({ description: 'Pembayaran ke Pemasok & Karyawan', amount: -cashPaid });
        operatingTotal -= cashPaid;
    }

    // Investing activities (fixed asset purchases)
    const investingItems: { description: string; amount: number }[] = [];
    let investingTotal = 0;

    const assetPurchasesTotal = Number(assetPurchases[0]?.total) || 0;
    if (assetPurchasesTotal > 0) {
        investingItems.push({ description: 'Pembelian Aset Tetap', amount: -assetPurchasesTotal });
        investingTotal = -assetPurchasesTotal;
    }

    // Financing activities (loans, owner contributions)
    const financingItems: { description: string; amount: number }[] = [];
    let financingTotal = 0;

    const loanChange = Number(loans[0]?.total) || 0;
    if (loanChange !== 0) {
        financingItems.push({
            description: loanChange > 0 ? 'Pinjaman Baru' : 'Pembayaran Cicilan',
            amount: loanChange
        });
        financingTotal = loanChange;
    }

    const netChange = operatingTotal + investingTotal + financingTotal;
    const closingCash = openingCash + netChange;

    return {
        period: { year, month },
        operating: { name: 'Arus Kas Operasi', items: operatingItems, total: operatingTotal },
        investing: { name: 'Arus Kas Investasi', items: investingItems, total: investingTotal },
        financing: { name: 'Arus Kas Pendanaan', items: financingItems, total: financingTotal },
        netChange,
        openingCash,
        closingCash
    };
}

// ── Equity Changes ────────────────────────────────────────────────────────────

/**
 * Generate Statement of Changes in Equity
 */
export async function getEquityChanges(
    storeId: string,
    year: number,
    month: number
): Promise<EquityChangesData> {
    const { start, end } = getPeriodDates(year, month);

    // This endpoint is fetched on every visit to the reports page, so it resolves
    // its four independent reads in parallel and takes the opening balances of
    // Modal Pemilik (3100) / Laba Ditahan (3200) from one grouped aggregate.
    const inception = new Date(2000, 0, 1);
    const beforeStart = new Date(start.getTime() - 1);
    const EQUITY_CODES = ['3100', '3200'];

    const [equityCoaRows, openingActivity, incomeStmt, prive] = await Promise.all([
        db.select({
            code: chartOfAccounts.code,
            normalBalance: chartOfAccounts.normalBalance,
            openingBalance: chartOfAccounts.openingBalance
        })
        .from(chartOfAccounts)
        .where(and(
            eq(chartOfAccounts.storeId, storeId),
            inArray(chartOfAccounts.code, EQUITY_CODES)
        )),

        getAccountActivityMap(storeId, inception, beforeStart),

        getIncomeStatement(storeId, year, month),

        // Contributions and withdrawals (Prive)
        db.select({
            total: sql<number>`SUM(${journalEntries.debit})`
        })
        .from(journalEntries)
        .where(and(
            eq(journalEntries.storeId, storeId),
            eq(journalEntries.accountCode, '3200'), // Laba Ditahan / Prive
            eq(journalEntries.isVoided, false),
            gte(journalEntries.createdAt, start),
            lte(journalEntries.createdAt, end)
        ))
    ]);

    // Calculate opening equity (beginning of period)
    let openingEquity = 0;
    for (const code of EQUITY_CODES) {
        const account = equityCoaRows.find(a => a.code === code);
        if (!account) continue; // unknown account contributes nothing, as before
        openingEquity += balanceFromActivity(account, openingActivity);
    }

    const netIncome = incomeStmt.netIncome;

    const withdrawals = Number(prive[0]?.total) || 0;

    const closingEquity = openingEquity + netIncome - withdrawals;

    return {
        period: { year, month },
        openingEquity,
        contributions: 0, // Would require tracking owner contributions separately
        withdrawals,
        netIncome,
        closingEquity
    };
}

// ── Fixed Assets ──────────────────────────────────────────────────────────────

/**
 * Calculate straight-line depreciation for a fixed asset
 */
export function calculateMonthlyDepreciation(
    purchasePrice: number,
    salvageValue: number,
    usefulLifeMonths: number
): number {
    if (usefulLifeMonths <= 0) return 0;
    return (purchasePrice - salvageValue) / usefulLifeMonths;
}

/**
 * Calculate accumulated depreciation for a fixed asset up to a date
 */
export async function calculateAccumulatedDepreciation(
    storeId: string,
    fixedAssetId: string,
    asOfDate: Date
): Promise<number> {
    const result = await db.select({
        total: sql<number>`SUM(${depreciationEntries.amount})`
    })
    .from(depreciationEntries)
    .innerJoin(fiscalPeriods, eq(depreciationEntries.fiscalPeriodId, fiscalPeriods.id))
    .where(and(
        eq(depreciationEntries.fixedAssetId, fixedAssetId),
        sql`${fiscalPeriods.year} * 100 + COALESCE(${fiscalPeriods.month}, 0) <= ${asOfDate.getFullYear() * 100 + asOfDate.getMonth() + 1}`
    ));

    return Number(result[0]?.total) || 0;
}

/**
 * Get fixed assets with current depreciation status
 */
export async function getFixedAssetsWithDepreciation(storeId: string) {
    const assets = await db.query.fixedAssets.findMany({
        where: eq(fixedAssets.storeId, storeId),
        orderBy: fixedAssets.code
    });

    const now = new Date();
    const assetsWithDepreciation = [];

    for (const asset of assets) {
        const accumulatedDepreciation = await calculateAccumulatedDepreciation(storeId, asset.id, now);
        const monthlyDepreciation = calculateMonthlyDepreciation(
            asset.purchasePrice,
            asset.salvageValue,
            asset.usefulLifeMonths
        );
        const netBookValue = asset.purchasePrice - accumulatedDepreciation;
        const remainingMonths = asset.salvageValue >= netBookValue
            ? 0
            : Math.ceil((netBookValue - asset.salvageValue) / monthlyDepreciation);

        // Determine status
        let status: FixedAssetStatus = asset.status as FixedAssetStatus;
        if (netBookValue <= asset.salvageValue && status === 'active') {
            status = 'fully_depreciated';
        }

        assetsWithDepreciation.push({
            ...asset,
            accumulatedDepreciation,
            monthlyDepreciation,
            netBookValue,
            remainingMonths,
            status
        });
    }

    return assetsWithDepreciation;
}
