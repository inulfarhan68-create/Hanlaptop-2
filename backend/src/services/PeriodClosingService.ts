import { db } from "@/db";
import {
    chartOfAccounts,
    fiscalPeriods,
    closingEntries,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { calculateAccountPeriodBalance, getIncomeStatement, getPeriodDates } from "./AccountingService";

export interface ClosingResult {
    success: boolean;
    closingEntryId?: string;
    revenueEntries: { accountCode: string; accountName: string; amount: number }[];
    expenseEntries: { accountCode: string; accountName: string; amount: number }[];
    netIncome: number;
    message: string;
}

/**
 * Close a fiscal period
 * Transfers Revenue and Expense balances to Laba Ditahan (Retained Earnings)
 */
export async function closeFiscalPeriod(
    storeId: string,
    periodId: string,
    userId: string
): Promise<ClosingResult> {
    // Check if period exists and is open
    const period = await db.query.fiscalPeriods.findFirst({
        where: and(
            eq(fiscalPeriods.id, periodId),
            eq(fiscalPeriods.storeId, storeId)
        )
    });

    if (!period) {
        return {
            success: false,
            revenueEntries: [],
            expenseEntries: [],
            netIncome: 0,
            message: 'Fiscal period not found'
        };
    }

    if (period.status === 'CLOSED' || period.status === 'ARCHIVED') {
        return {
            success: false,
            revenueEntries: [],
            expenseEntries: [],
            netIncome: 0,
            message: `Period is already ${period.status}`
        };
    }

    // Check if already closed
    const existingClosing = await db.query.closingEntries.findFirst({
        where: eq(closingEntries.fiscalPeriodId, periodId)
    });

    if (existingClosing) {
        return {
            success: false,
            revenueEntries: [],
            expenseEntries: [],
            netIncome: 0,
            message: 'Period is already closed'
        };
    }

    const year = period.year;
    const month = period.month || 1;

    // Get income statement for the period
    const incomeStatement = await getIncomeStatement(storeId, year, month);
    const netIncome = incomeStatement.netIncome;

    // Get all Revenue and Expense accounts to close
    const revenueExpenseAccounts = await db.query.chartOfAccounts.findMany({
        where: and(
            eq(chartOfAccounts.storeId, storeId),
            eq(chartOfAccounts.isActive, true)
        )
    });

    const { start, end } = getPeriodDates(year, month);
    const revenueEntries: { accountCode: string; accountName: string; amount: number }[] = [];
    const expenseEntries: { accountCode: string; accountName: string; amount: number }[] = [];

    // Separate revenue and expense entries
    for (const account of revenueExpenseAccounts) {
        if (account.subType === 'Header') continue;

        const balance = await calculateAccountPeriodBalance(storeId, account.code, start, end);

        if (account.type === 'Revenue' && balance !== 0) {
            revenueEntries.push({
                accountCode: account.code,
                accountName: account.name,
                amount: balance
            });
        } else if (account.type === 'Expense' && balance !== 0) {
            expenseEntries.push({
                accountCode: account.code,
                accountName: account.name,
                amount: Math.abs(balance)
            });
        }
    }

    // Create the closing entry record
    const closingEntryId = crypto.randomUUID();

    await db.insert(closingEntries).values({
        id: closingEntryId,
        storeId,
        fiscalPeriodId: periodId,
        closingType: month === 12 || !month ? 'yearly' : 'monthly',
        closedBy: userId,
        revenueEntries: JSON.stringify(revenueEntries),
        expenseEntries: JSON.stringify(expenseEntries),
        netIncome: netIncome,
        incomeSummaryAccount: '3300', // Laba/Rugi Tahun Berjalan
        retainedEarningsAccount: '3200', // Laba Ditahan
        closedAt: new Date()
    });

    // Update fiscal period status
    await db.update(fiscalPeriods)
        .set({
            status: 'CLOSED',
            closedBy: userId,
            closedAt: new Date(),
            updatedAt: new Date()
        })
        .where(eq(fiscalPeriods.id, periodId));

    return {
        success: true,
        closingEntryId,
        revenueEntries,
        expenseEntries,
        netIncome,
        message: `Period ${month}/${year} successfully closed. Net Income: ${netIncome}`
    };
}

/**
 * Reopen a closed fiscal period (Owner only)
 */
export async function reopenFiscalPeriod(
    storeId: string,
    periodId: string,
    userId: string
): Promise<{ success: boolean; message: string }> {
    const period = await db.query.fiscalPeriods.findFirst({
        where: and(
            eq(fiscalPeriods.id, periodId),
            eq(fiscalPeriods.storeId, storeId)
        )
    });

    if (!period) {
        return { success: false, message: 'Fiscal period not found' };
    }

    if (period.status !== 'CLOSED') {
        return { success: false, message: 'Period is not closed' };
    }

    // Delete closing entry
    await db.delete(closingEntries)
        .where(and(
            eq(closingEntries.fiscalPeriodId, periodId),
            eq(closingEntries.storeId, storeId)
        ));

    // Reopen period
    await db.update(fiscalPeriods)
        .set({
            status: 'OPEN',
            closedBy: null,
            closedAt: null,
            updatedAt: new Date()
        })
        .where(eq(fiscalPeriods.id, periodId));

    return { success: true, message: `Period ${period.month}/${period.year} reopened` };
}

/**
 * Get closing entry for a fiscal period
 */
export async function getClosingEntry(periodId: string) {
    const closing = await db.query.closingEntries.findFirst({
        where: eq(closingEntries.fiscalPeriodId, periodId)
    });

    if (!closing) return null;

    return {
        ...closing,
        revenueEntries: closing.revenueEntries
            ? JSON.parse(closing.revenueEntries as string)
            : [],
        expenseEntries: closing.expenseEntries
            ? JSON.parse(closing.expenseEntries as string)
            : []
    };
}

/**
 * Create or ensure fiscal period exists for current month
 */
export async function ensureFiscalPeriod(
    storeId: string,
    year: number,
    month: number
): Promise<string> {
    let period = await db.query.fiscalPeriods.findFirst({
        where: and(
            eq(fiscalPeriods.storeId, storeId),
            eq(fiscalPeriods.year, year),
            eq(fiscalPeriods.month, month)
        )
    });

    if (!period) {
        const periodId = crypto.randomUUID();
        await db.insert(fiscalPeriods).values({
            id: periodId,
            storeId,
            year,
            month,
            status: 'OPEN',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        return periodId;
    }

    return period.id;
}

/**
 * Get fiscal periods for a store
 */
export async function getFiscalPeriods(storeId: string, limit: number = 12) {
    const periods = await db.query.fiscalPeriods.findMany({
        where: eq(fiscalPeriods.storeId, storeId),
        orderBy: [desc(fiscalPeriods.year), desc(fiscalPeriods.month)]
    });

    return periods.slice(0, limit);
}
