import { describe, it, expect } from "vitest";
import { resolveAccountCode, ACCOUNT_NAME_ALIASES } from "@/services/account-code-lookup";
import { DEFAULT_COA_ACCOUNTS } from "@/db/coa-accounts";

const codeOf = (name: string) => DEFAULT_COA_ACCOUNTS.find((a) => a.name === name)?.code;

describe("resolveAccountCode", () => {
    it("resolves every postable account in the chart to its own code", () => {
        for (const account of DEFAULT_COA_ACCOUNTS.filter((a) => a.subType !== "Header")) {
            expect(resolveAccountCode(account.name), account.name).toBe(account.code);
        }
    });

    it("refuses to post to a header account", () => {
        // Headers group their children in the report tree; posting to one puts
        // money on a line that is meant to be a sum. The chart has a header
        // named "PENDAPATAN", which used to shadow the revenue accounts.
        for (const header of DEFAULT_COA_ACCOUNTS.filter((a) => a.subType === "Header")) {
            expect(resolveAccountCode(header.name), header.name).not.toBe(header.code);
        }
    });

    it("points every alias at an account that actually exists", () => {
        // The bug this replaces: "Pendapatan Komisi" mapped to 4210, a code with
        // no row in the chart. Reports join the chart on the code, so those
        // entries were not mis-filed — they vanished from the report entirely.
        for (const [alias, target] of Object.entries(ACCOUNT_NAME_ALIASES)) {
            expect(codeOf(target), `alias "${alias}" targets "${target}"`).toBeDefined();
            expect(resolveAccountCode(alias)).toBe(codeOf(target));
        }
    });

    it("files service revenue under Pendapatan Servis, not consignment", () => {
        // The reported symptom: a service fee showed up in the report as
        // "Penjualan Konsinyasi", because the old table mapped it to 4140.
        expect(resolveAccountCode("Pendapatan Servis")).toBe(codeOf("Pendapatan Servis"));
        expect(resolveAccountCode("Pendapatan Servis")).not.toBe(codeOf("Penjualan Konsinyasi"));
    });

    it("keeps the expense categories apart", () => {
        // Half the expense accounts used to collapse onto 5270 (depreciation).
        const names = [
            "Beban Gaji Karyawan",
            "Beban Listrik & Internet",
            "Beban Sewa Tempat",
            "Beban Transportasi",
            "Beban Marketing",
            "Beban Administrasi",
            "Beban Penyusutan",
            "Beban Perbaikan",
        ];
        const codes = names.map((n) => resolveAccountCode(n));
        expect(new Set(codes).size).toBe(names.length);
        expect(codes.every(Boolean)).toBe(true);
    });

    it("is case- and whitespace-insensitive", () => {
        expect(resolveAccountCode("  kas  ")).toBe(codeOf("Kas"));
        expect(resolveAccountCode("PENDAPATAN SERVIS")).toBe(codeOf("Pendapatan Servis"));
    });

    it("returns null for an unknown name rather than guessing", () => {
        // The old lookup fell back to substring matching in both directions, so
        // an unrecognised name would silently land on whichever account happened
        // to share a word with it — real money filed under a plausible-looking
        // wrong account, which is worse than an obvious gap.
        expect(resolveAccountCode("Akun Karangan")).toBeNull();
        expect(resolveAccountCode("")).toBeNull();
        expect(resolveAccountCode(null)).toBeNull();
        expect(resolveAccountCode(undefined)).toBeNull();
    });

    it("never resolves two different accounts to the same code", () => {
        const seen = new Map<string, string>();
        for (const account of DEFAULT_COA_ACCOUNTS.filter((a) => a.subType !== "Header")) {
            const code = resolveAccountCode(account.name)!;
            expect(seen.has(code), `${account.name} collides with ${seen.get(code)}`).toBe(false);
            seen.set(code, account.name);
        }
    });
});
