import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

vi.mock("@/db", async () => {
    const postgres = (await import("postgres")).default;
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const schema = await import("@/db/schema");
    const url = process.env.TEST_DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres";
    const client = postgres(url, { max: 1 });
    return { db: drizzle(client, { schema }) };
});

import { db } from "@/db";
import { organizations, stores, transactions, journalEntries, chartOfAccounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
    getIncomeStatement,
    getBalanceSheet,
    getTrialBalance,
    getCashFlow,
    getEquityChanges,
} from "@/services/AccountingService";

/**
 * Reporting is assembled from one grouped journal aggregate per period, so the
 * invariants worth locking down are that aggregate's boundaries: the period
 * window, the isVoided filter, and the store boundary. A regression in any of
 * those silently changes the reported figures rather than throwing.
 */

const ORG = "org-acct-rpt";
const STORE = "store-acct-rpt";
const OTHER_STORE = "store-acct-other";

const YEAR = 2026;
const MONTH = 7; // July

const IN_PERIOD = new Date(YEAR, MONTH - 1, 15);          // 15 Jul 2026
const BEFORE_PERIOD = new Date(YEAR, MONTH - 2, 20);      // 20 Jun 2026
const AFTER_PERIOD = new Date(YEAR, MONTH, 3);            // 3 Aug 2026

/**
 * Codes mirror `src/db/seed-coa.ts` — the report builders branch on the real chart
 * (`CASH_EQUIVALENTS` is 1110/1120/1130, COGS is 51xx, equity is 3100/3200), so a
 * made-up numbering silently changes which section an account lands in.
 */
const KAS = "1110";              // cash equivalent
const PIUTANG = "1140";
const PERSEDIAAN = "1150";
const UTANG_USAHA = "2110";
const MODAL = "3100";
const PENJUALAN = "4110";
const HPP = "5110";
const BEBAN_GAJI = "5210";

const COA = [
    { code: KAS, name: "Kas", type: "Asset", subType: "Cash", normalBalance: "Debit" },
    { code: PIUTANG, name: "Piutang Usaha", type: "Asset", subType: "Receivable", normalBalance: "Debit" },
    { code: PERSEDIAAN, name: "Persediaan Laptop", type: "Asset", subType: "Inventory", normalBalance: "Debit" },
    { code: UTANG_USAHA, name: "Utang Usaha", type: "Liability", subType: "Payable", normalBalance: "Credit" },
    { code: MODAL, name: "Modal Pemilik", type: "Equity", subType: "Capital", normalBalance: "Credit" },
    { code: PENJUALAN, name: "Penjualan Laptop", type: "Revenue", subType: "Sales", normalBalance: "Credit" },
    { code: HPP, name: "HPP Laptop", type: "Expense", subType: "COGS", normalBalance: "Debit" },
    { code: BEBAN_GAJI, name: "Beban Gaji Karyawan", type: "Expense", subType: "Payroll", normalBalance: "Debit" },
];

type Line = { code: string; debit?: number; credit?: number };

let txSeq = 0;

/** Post one balanced journal (a transaction plus its lines) at a given date. */
async function post(storeId: string, at: Date, lines: Line[], opts: { voided?: boolean } = {}) {
    const txId = `tx-acct-rpt-${++txSeq}`;
    await db.insert(transactions).values({
        id: txId,
        storeId,
        transactionType: "Penjualan",
        amount: 0,
        transactionDate: at,
        invoiceNumber: `RPT/${txId}`,
    });

    await db.insert(journalEntries).values(
        lines.map((l) => ({
            storeId,
            transactionId: txId,
            accountName: COA.find((a) => a.code === l.code)!.name,
            accountCode: l.code,
            debit: l.debit ?? 0,
            credit: l.credit ?? 0,
            isVoided: opts.voided ?? false,
            createdAt: at,
        }))
    );
}

async function cleanup() {
    for (const s of [STORE, OTHER_STORE]) {
        await db.delete(stores).where(eq(stores.id, s)); // cascades to COA, tx, journals
    }
    await db.delete(organizations).where(eq(organizations.id, ORG));
}

beforeAll(async () => {
    await cleanup();
    await db.insert(organizations).values({ id: ORG, name: "Acct Report Org" });
    await db.insert(stores).values([
        { id: STORE, organizationId: ORG, name: "Report Store" },
        { id: OTHER_STORE, organizationId: ORG, name: "Other Store" },
    ]);
    for (const s of [STORE, OTHER_STORE]) {
        await db.insert(chartOfAccounts).values(COA.map((a) => ({ ...a, storeId: s })));
    }

    // ── In-period activity (July 2026) ──
    // Cash sale 10,000,000 with COGS 6,000,000 released from inventory.
    await post(STORE, IN_PERIOD, [
        { code: KAS, debit: 10_000_000 },
        { code: PENJUALAN, credit: 10_000_000 },
    ]);
    await post(STORE, IN_PERIOD, [
        { code: HPP, debit: 6_000_000 },
        { code: PERSEDIAAN, credit: 6_000_000 },
    ]);
    // Credit sale 4,000,000 (COGS 2,500,000).
    await post(STORE, IN_PERIOD, [
        { code: PIUTANG, debit: 4_000_000 },
        { code: PENJUALAN, credit: 4_000_000 },
    ]);
    await post(STORE, IN_PERIOD, [
        { code: HPP, debit: 2_500_000 },
        { code: PERSEDIAAN, credit: 2_500_000 },
    ]);
    // Payroll 1,500,000 paid in cash.
    await post(STORE, IN_PERIOD, [
        { code: BEBAN_GAJI, debit: 1_500_000 },
        { code: KAS, credit: 1_500_000 },
    ]);

    // ── Noise that must NOT reach the July income statement ──
    // Voided sale inside the period.
    await post(STORE, IN_PERIOD, [
        { code: KAS, debit: 99_000_000 },
        { code: PENJUALAN, credit: 99_000_000 },
    ], { voided: true });
    // Opening capital before the period (balance-sheet only, not P&L).
    await post(STORE, BEFORE_PERIOD, [
        { code: KAS, debit: 20_000_000 },
        { code: MODAL, credit: 20_000_000 },
    ]);
    // Inventory purchased on credit before the period.
    await post(STORE, BEFORE_PERIOD, [
        { code: PERSEDIAAN, debit: 15_000_000 },
        { code: UTANG_USAHA, credit: 15_000_000 },
    ]);
    // Next-period sale.
    await post(STORE, AFTER_PERIOD, [
        { code: KAS, debit: 7_000_000 },
        { code: PENJUALAN, credit: 7_000_000 },
    ]);
    // Another store's sale — must never appear in this store's reports.
    await post(OTHER_STORE, IN_PERIOD, [
        { code: KAS, debit: 55_000_000 },
        { code: PENJUALAN, credit: 55_000_000 },
    ]);
});

afterAll(async () => {
    await cleanup();
});

describe("getIncomeStatement", () => {
    it("reports revenue, COGS, opex and profit for the period", async () => {
        const is = await getIncomeStatement(STORE, YEAR, MONTH);

        expect(is.revenue).toBe(14_000_000);       // 10jt cash + 4jt credit
        expect(is.cogs).toBe(8_500_000);           // 6jt + 2.5jt
        expect(is.grossProfit).toBe(5_500_000);
        expect(is.opex).toBe(1_500_000);           // payroll
        expect(is.operatingIncome).toBe(4_000_000);
        expect(is.netIncome).toBe(4_000_000);
        expect(is.period).toEqual({ year: YEAR, month: MONTH });
    });

    it("excludes voided journal entries", async () => {
        const is = await getIncomeStatement(STORE, YEAR, MONTH);
        // The voided 99jt sale would dwarf every figure if the filter regressed.
        expect(is.revenue).toBe(14_000_000);
    });

    it("excludes entries outside the period window", async () => {
        const july = await getIncomeStatement(STORE, YEAR, MONTH);
        expect(july.revenue).toBe(14_000_000); // neither the June capital nor the August sale

        const august = await getIncomeStatement(STORE, YEAR, MONTH + 1);
        expect(august.revenue).toBe(7_000_000);
        expect(august.cogs).toBe(0);
    });

    it("does not leak another store's entries", async () => {
        const other = await getIncomeStatement(OTHER_STORE, YEAR, MONTH);
        expect(other.revenue).toBe(55_000_000);
        expect(other.cogs).toBe(0);
    });

    it("groups accounts into named sections", async () => {
        const is = await getIncomeStatement(STORE, YEAR, MONTH);
        const byName = Object.fromEntries(is.sections.map((s) => [s.name, s]));

        expect(byName["PENDAPATAN"].total).toBe(14_000_000);
        expect(byName["PENDAPATAN"].accounts.map((a) => a.code)).toContain(PENJUALAN);
        expect(byName["HARGA POKOK PENJUALAN"].total).toBe(8_500_000);
        expect(byName["Beban Gaji Karyawan"].total).toBe(1_500_000);
    });
});

describe("getTrialBalance", () => {
    it("balances and excludes voided entries", async () => {
        const tb = await getTrialBalance(STORE, YEAR, MONTH);

        expect(tb.isBalanced).toBe(true);
        expect(tb.totalDebit).toBeCloseTo(tb.totalCredit, 2);
        // A voided pair balances on both sides, so assert the magnitude too.
        expect(tb.totalDebit).toBe(22_500_000);

        const codes = tb.accounts.map((a) => a.accountCode);
        expect(codes).toContain(PENJUALAN);
        expect(codes).toContain(HPP);
    });
});

describe("getBalanceSheet", () => {
    it("satisfies Aset = Kewajiban + Ekuitas", async () => {
        const bs = await getBalanceSheet(STORE, YEAR, MONTH);

        expect(bs.isBalanced).toBe(true);
        expect(bs.balanceEquation?.isBalanced).toBe(true);
        expect(bs.assets.total).toBeCloseTo(bs.liabilities.total + bs.equity.total, 2);
    });

    it("accumulates inception-to-date, so pre-period entries count", async () => {
        const bs = await getBalanceSheet(STORE, YEAR, MONTH);
        const byCode = Object.fromEntries(bs.assets.current.map((a) => [a.code, a.amount]));

        // Kas: 20jt opening + 10jt sale − 1.5jt payroll = 28.5jt
        expect(byCode[KAS]).toBe(28_500_000);
        // Piutang from the credit sale
        expect(byCode[PIUTANG]).toBe(4_000_000);
        // Persediaan: 15jt purchased − 8.5jt released = 6.5jt
        expect(byCode[PERSEDIAAN]).toBe(6_500_000);

        expect(bs.assets.total).toBe(39_000_000);
        expect(bs.liabilities.totalCurrent).toBe(15_000_000);
    });

    it("carries the period's net income into equity", async () => {
        const bs = await getBalanceSheet(STORE, YEAR, MONTH);
        expect(bs.equity.netIncome).toBe(4_000_000);
        expect(bs.equity.total).toBe(24_000_000); // Modal 20jt + laba 4jt
    });

    it("does not leak another store's balances", async () => {
        const bs = await getBalanceSheet(OTHER_STORE, YEAR, MONTH);
        const byCode = Object.fromEntries(bs.assets.current.map((a) => [a.code, a.amount]));
        expect(byCode[KAS]).toBe(55_000_000);
        expect(byCode[PIUTANG]).toBeUndefined(); // no receivable in the other store
    });
});

describe("getCashFlow", () => {
    it("opens with the pre-period cash balance and nets the period's movement", async () => {
        const cf = await getCashFlow(STORE, YEAR, MONTH);

        expect(cf.openingCash).toBe(20_000_000);           // June capital injection
        expect(cf.operating.total).toBe(8_500_000);        // 10jt in − 1.5jt out
        expect(cf.netChange).toBe(8_500_000);
        expect(cf.closingCash).toBe(28_500_000);
        expect(cf.closingCash).toBe(cf.openingCash + cf.netChange);
    });
});

describe("getEquityChanges", () => {
    it("reconciles opening equity, net income and withdrawals", async () => {
        const ec = await getEquityChanges(STORE, YEAR, MONTH);

        expect(ec.openingEquity).toBe(20_000_000);         // Modal 3100 before July
        expect(ec.netIncome).toBe(4_000_000);
        expect(ec.withdrawals).toBe(0);
        expect(ec.closingEquity).toBe(
            ec.openingEquity + ec.netIncome - ec.withdrawals
        );
    });
});
