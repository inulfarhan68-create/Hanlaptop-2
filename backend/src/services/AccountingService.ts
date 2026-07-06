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
}

export interface BalanceSheetData {
    period: { year: number; month: number };
    assets: {
        current: { code: string; name: string; amount: number }[];
        fixed: { code: string; name: string; amount: number }[];
        total: number;
    };
    liabilities: {
        current: { code: string; name: string; amount: number }[];
        longTerm: { code: string; name: string; amount: number }[];
        total: number;
    };
    equity: {
        accounts: { code: string; name: string; amount: number }[];
        total: number;
    };
    isBalanced: boolean;
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

    for (const account of accounts) {
        // Get period activity
        const activity = await db.select({
            totalDebit: sql<number>`SUM(${journalEntries.debit})`,
            totalCredit: sql<number>`SUM(${journalEntries.credit})`
        })
        .from(journalEntries)
        .where(and(
            eq(journalEntries.storeId, storeId),
            eq(journalEntries.accountCode, account.code),
            eq(journalEntries.isVoided, false),
            gte(journalEntries.createdAt, start),
            lte(journalEntries.createdAt, end)
        ));

        const periodDebit = Number(activity[0]?.totalDebit) || 0;
        const periodCredit = Number(activity[0]?.totalCredit) || 0;

        // Calculate balance
        let debit = 0;
        let credit = 0;

        if (account.normalBalance === 'Debit') {
            const balance = (account.openingBalance || 0) + periodDebit - periodCredit;
            if (balance >= 0) {
                debit = balance;
            } else {
                credit = Math.abs(balance);
            }
        } else {
            const balance = (account.openingBalance || 0) + periodCredit - periodDebit;
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
 * Generate Income Statement (Laporan Laba Rugi) for a period
 */
export async function getIncomeStatement(
    storeId: string,
    year: number,
    month: number
): Promise<IncomeStatementData> {
    const { start, end } = getPeriodDates(year, month);

    const sections: IncomeStatementSection[] = [];

    // Get revenue accounts
    const revenueAccounts = await db.query.chartOfAccounts.findMany({
        where: and(
            eq(chartOfAccounts.storeId, storeId),
            eq(chartOfAccounts.type, 'Revenue'),
            eq(chartOfAccounts.isActive, true)
        ),
        orderBy: chartOfAccounts.code
    });

    // Calculate revenue
    const revenueItems: { code: string; name: string; amount: number }[] = [];
    let totalRevenue = 0;

    for (const account of revenueAccounts) {
        if (account.code.startsWith('4') && account.subType !== 'Header') {
            const balance = await calculateAccountPeriodBalance(storeId, account.code, start, end);
            if (balance !== 0) {
                revenueItems.push({ code: account.code, name: account.name, amount: balance });
                totalRevenue += balance;
            }
        }
    }

    if (revenueItems.length > 0) {
        sections.push({ name: 'Pendapatan', accounts: revenueItems, total: totalRevenue });
    }

    // Get expense accounts (grouped by subType)
    const expenseAccounts = await db.query.chartOfAccounts.findMany({
        where: and(
            eq(chartOfAccounts.storeId, storeId),
            eq(chartOfAccounts.type, 'Expense'),
            eq(chartOfAccounts.isActive, true)
        ),
        orderBy: chartOfAccounts.code
    });

    // Group expenses by section
    const expenseGroups: Record<string, { code: string; name: string; amount: number }[]> = {
        'COGS': [],
        'Payroll': [],
        'Utilities': [],
        'Rent': [],
        'Depreciation': [],
        'Other': []
    };

    let totalExpenses = 0;

    for (const account of expenseAccounts) {
        if (account.subType === 'Header') continue;

        const balance = await calculateAccountPeriodBalance(storeId, account.code, start, end);
        if (balance !== 0) {
            const group = account.subType || 'Other';
            if (!expenseGroups[group]) {
                expenseGroups[group] = [];
            }
            expenseGroups[group].push({ code: account.code, name: account.name, amount: Math.abs(balance) });
            totalExpenses += Math.abs(balance);
        }
    }

    // Add expense sections
    for (const [groupName, items] of Object.entries(expenseGroups)) {
        if (items.length > 0) {
            const sectionName = groupName === 'COGS' ? 'Harga Pokok Penjualan' :
                               groupName === 'Payroll' ? 'Beban Gaji' :
                               groupName === 'Utilities' ? 'Beban Utilitas' :
                               groupName === 'Rent' ? 'Beban Sewa' :
                               groupName === 'Depreciation' ? 'Beban Penyusutan' : 'Beban Lainnya';
            sections.push({
                name: sectionName,
                accounts: items,
                total: items.reduce((sum, item) => sum + item.amount, 0)
            });
        }
    }

    const grossProfit = totalRevenue - (sections.find(s => s.name === 'Harga Pokok Penjualan')?.total || 0);
    const operatingIncome = totalRevenue - totalExpenses;
    const netIncome = operatingIncome;

    return {
        period: { year, month },
        sections,
        grossProfit,
        operatingIncome,
        netIncome
    };
}

/**
 * Calculate account balance within a specific period
 */
async function calculateAccountPeriodBalance(
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

// ── Balance Sheet ─────────────────────────────────────────────────────────────

/**
 * Generate Balance Sheet (Neraca) for a period
 */
export async function getBalanceSheet(
    storeId: string,
    year: number,
    month: number
): Promise<BalanceSheetData> {
    const { start, end } = getPeriodDates(year, month);

    // Get all active accounts
    const accounts = await db.query.chartOfAccounts.findMany({
        where: and(
            eq(chartOfAccounts.storeId, storeId),
            eq(chartOfAccounts.isActive, true)
        ),
        orderBy: chartOfAccounts.code
    });

    const currentAssets: { code: string; name: string; amount: number }[] = [];
    const fixedAssets: { code: string; name: string; amount: number }[] = [];
    const currentLiabilities: { code: string; name: string; amount: number }[] = [];
    const longTermLiabilities: { code: string; name: string; amount: number }[] = [];
    const equityAccounts: { code: string; name: string; amount: number }[] = [];

    for (const account of accounts) {
        const balance = await calculateAccountPeriodBalance(storeId, account.code, new Date(2000, 0, 1), end);

        if (account.type === 'Asset') {
            if (account.subType === 'Fixed' || account.code.startsWith('12')) {
                fixedAssets.push({ code: account.code, name: account.name, amount: balance });
            } else {
                currentAssets.push({ code: account.code, name: account.name, amount: balance });
            }
        } else if (account.type === 'Liability') {
            if (account.code.startsWith('22')) {
                longTermLiabilities.push({ code: account.code, name: account.name, amount: Math.abs(balance) });
            } else {
                currentLiabilities.push({ code: account.code, name: account.name, amount: Math.abs(balance) });
            }
        } else if (account.type === 'Equity') {
            equityAccounts.push({ code: account.code, name: account.name, amount: balance });
        }
    }

    // Subtract accumulated depreciation from fixed assets
    const accumulatedDepr = fixedAssets.find(a => a.code === '1230');
    if (accumulatedDepr) {
        accumulatedDepr.amount = Math.abs(accumulatedDepr.amount);
    }

    const totalAssets = currentAssets.reduce((sum, a) => sum + a.amount, 0) +
                        fixedAssets.reduce((sum, a) => sum + a.amount, 0);
    const totalLiabilities = currentLiabilities.reduce((sum, a) => sum + a.amount, 0) +
                            longTermLiabilities.reduce((sum, a) => sum + a.amount, 0);
    const totalEquity = totalAssets - totalLiabilities;

    return {
        period: { year, month },
        assets: {
            current: currentAssets,
            fixed: fixedAssets,
            total: totalAssets
        },
        liabilities: {
            current: currentLiabilities,
            longTerm: longTermLiabilities,
            total: totalLiabilities
        },
        equity: {
            accounts: equityAccounts,
            total: totalEquity
        },
        isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
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
    const cashAccounts = ['1110', '1120', '1130']; // Kas, Bank, QRIS

    // Calculate opening cash (before period start)
    let openingCash = 0;
    for (const code of cashAccounts) {
        openingCash += await calculateAccountPeriodBalance(storeId, code, new Date(2000, 0, 1), new Date(start.getTime() - 1));
    }

    // Operating activities (from cash-related journal entries)
    const operatingItems: { description: string; amount: number }[] = [];
    let operatingTotal = 0;

    // Cash received from customers (all revenue accounts credited)
    const cashInflows = await db.select({
        total: sql<number>`SUM(${journalEntries.credit})`
    })
    .from(journalEntries)
    .where(and(
        eq(journalEntries.storeId, storeId),
        inArray(journalEntries.accountCode, cashAccounts),
        eq(journalEntries.isVoided, false),
        gte(journalEntries.createdAt, start),
        lte(journalEntries.createdAt, end)
    ));

    operatingTotal = Number(cashInflows[0]?.total) || 0;
    operatingItems.push({ description: 'Penerimaan dari Pelanggan', amount: operatingTotal });

    // Cash paid to suppliers/employees (from expense accounts debited)
    const cashOutflows = await db.select({
        total: sql<number>`SUM(${journalEntries.debit})`
    })
    .from(journalEntries)
    .where(and(
        eq(journalEntries.storeId, storeId),
        inArray(journalEntries.accountCode, cashAccounts),
        eq(journalEntries.isVoided, false),
        gte(journalEntries.createdAt, start),
        lte(journalEntries.createdAt, end)
    ));

    const cashPaid = Number(cashOutflows[0]?.total) || 0;
    if (cashPaid > 0) {
        operatingItems.push({ description: 'Pembayaran ke Pemasok & Karyawan', amount: -cashPaid });
        operatingTotal -= cashPaid;
    }

    // Investing activities (fixed asset purchases)
    const investingItems: { description: string; amount: number }[] = [];
    let investingTotal = 0;

    const assetPurchases = await db.select({
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
    ));

    const assetPurchasesTotal = Number(assetPurchases[0]?.total) || 0;
    if (assetPurchasesTotal > 0) {
        investingItems.push({ description: 'Pembelian Aset Tetap', amount: -assetPurchasesTotal });
        investingTotal = -assetPurchasesTotal;
    }

    // Financing activities (loans, owner contributions)
    const financingItems: { description: string; amount: number }[] = [];
    let financingTotal = 0;

    const loans = await db.select({
        total: sql<number>`SUM(${journalEntries.credit} - ${journalEntries.debit})`
    })
    .from(journalEntries)
    .where(and(
        eq(journalEntries.storeId, storeId),
        eq(journalEntries.accountCode, '2210'), // Hutang Bank
        eq(journalEntries.isVoided, false),
        gte(journalEntries.createdAt, start),
        lte(journalEntries.createdAt, end)
    ));

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

    // Calculate opening equity (beginning of period)
    let openingEquity = 0;

    // Modal Pemilik (3100)
    openingEquity += await calculateAccountPeriodBalance(storeId, '3100', new Date(2000, 0, 1), new Date(start.getTime() - 1));

    // Laba Ditahan (3200)
    openingEquity += await calculateAccountPeriodBalance(storeId, '3200', new Date(2000, 0, 1), new Date(start.getTime() - 1));

    // Get net income from current period
    const incomeStmt = await getIncomeStatement(storeId, year, month);
    const netIncome = incomeStmt.netIncome;

    // Calculate contributions and withdrawals (Prive)
    const prive = await db.select({
        total: sql<number>`SUM(${journalEntries.debit})`
    })
    .from(journalEntries)
    .where(and(
        eq(journalEntries.storeId, storeId),
        eq(journalEntries.accountCode, '3200'), // Laba Ditahan / Prive
        eq(journalEntries.isVoided, false),
        gte(journalEntries.createdAt, start),
        lte(journalEntries.createdAt, end)
    ));

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
