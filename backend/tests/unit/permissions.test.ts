import { describe, it, expect } from "vitest";
import { hasPermission, Permissions } from "@/lib/permissions";

describe("hasPermission (PBAC matrix)", () => {
    it("grants the global owner every permission", () => {
        for (const permission of Object.values(Permissions)) {
            expect(hasPermission("owner", permission)).toBe(true);
        }
    });

    it("lets kasir create transactions but not delete inventory or read the ledger", () => {
        expect(hasPermission("kasir", Permissions.TRANSACTION_CREATE)).toBe(true);
        expect(hasPermission("kasir", Permissions.INVENTORY_READ)).toBe(true);
        expect(hasPermission("kasir", Permissions.INVENTORY_DELETE)).toBe(false);
        expect(hasPermission("kasir", Permissions.TRANSACTION_VOID)).toBe(false);
        expect(hasPermission("kasir", Permissions.LEDGER_READ)).toBe(false);
    });

    it("restricts teknisi to service + inventory read", () => {
        expect(hasPermission("teknisi", Permissions.SERVICE_UPDATE_STATUS)).toBe(true);
        expect(hasPermission("teknisi", Permissions.INVENTORY_READ)).toBe(true);
        expect(hasPermission("teknisi", Permissions.TRANSACTION_CREATE)).toBe(false);
        expect(hasPermission("teknisi", Permissions.INVENTORY_EDIT)).toBe(false);
    });

    it("keeps investor read-only (can read/export ledger, cannot create)", () => {
        expect(hasPermission("investor", Permissions.LEDGER_READ)).toBe(true);
        expect(hasPermission("investor", Permissions.LEDGER_EXPORT)).toBe(true);
        expect(hasPermission("investor", Permissions.TRANSACTION_CREATE)).toBe(false);
        expect(hasPermission("investor", Permissions.INVENTORY_CREATE)).toBe(false);
    });

    it("denies everything for an unknown role", () => {
        expect(hasPermission("nonexistent", Permissions.INVENTORY_READ)).toBe(false);
        expect(hasPermission("", Permissions.TRANSACTION_READ)).toBe(false);
    });
});
