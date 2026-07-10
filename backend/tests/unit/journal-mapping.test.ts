import { describe, it, expect, vi } from "vitest";

// JournalMappingService imports the DB client at module load, but the pure
// function under test (getAccountCodeFromName) never touches it. Mock the DB
// module so the test stays fast and free of side effects.
vi.mock("@/db", () => ({ db: {} }));

import { getAccountCodeFromName } from "@/services/JournalMappingService";
import { ACCOUNT_CODES } from "@/constants/accounting";

describe("getAccountCodeFromName", () => {
    it("returns null for null or empty input", () => {
        expect(getAccountCodeFromName(null)).toBeNull();
        expect(getAccountCodeFromName("")).toBeNull();
    });

    it("maps the core sales/COGS account names used by TransactionService", () => {
        // These are the exact account names TransactionService writes for a sale.
        expect(getAccountCodeFromName("Penjualan Laptop")).toBe(ACCOUNT_CODES.PENJUALAN_LAPTOP);
        expect(getAccountCodeFromName("HPP Laptop")).toBe(ACCOUNT_CODES.HPP_LAPTOP);
        expect(getAccountCodeFromName("Persediaan")).toBe(ACCOUNT_CODES.PERSEDIAAN_LAPTOP);
        expect(getAccountCodeFromName("Piutang Usaha")).toBe(ACCOUNT_CODES.PIUTANG_USAHA);
    });

    it("maps liquid + service + consignment account names", () => {
        expect(getAccountCodeFromName("Kas")).toBe(ACCOUNT_CODES.KAS);
        expect(getAccountCodeFromName("Bank")).toBe(ACCOUNT_CODES.BANK);
        expect(getAccountCodeFromName("QRIS")).toBe(ACCOUNT_CODES.QRIS);
        expect(getAccountCodeFromName("Pendapatan Servis")).toBe(ACCOUNT_CODES.PENDAPATAN_SERVIS);
        expect(getAccountCodeFromName("Utang Konsinyasi")).toBe(ACCOUNT_CODES.HUTANG_KONSINYASI);
        expect(getAccountCodeFromName("Pendapatan Komisi")).toBe(ACCOUNT_CODES.PENDAPATAN_LAIN_LAIN);
    });

    it("is case-insensitive via the lowercase alias entries", () => {
        expect(getAccountCodeFromName("kas")).toBe(ACCOUNT_CODES.KAS);
        expect(getAccountCodeFromName("KAS")).toBe(ACCOUNT_CODES.KAS);
    });

    it("falls back to Beban Lain-lain (5600) for unknown 'biaya' categories", () => {
        // Fallback branch: unknown name starting with beban/biaya → "5600".
        expect(getAccountCodeFromName("Biaya Tak Terduga")).toBe("5600");
    });

    it("returns null for a name that matches nothing and is not an expense", () => {
        expect(getAccountCodeFromName("Xyz Nonexistent Account")).toBeNull();
    });
});
