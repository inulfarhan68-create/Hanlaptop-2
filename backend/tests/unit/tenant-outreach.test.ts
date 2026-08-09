import { describe, it, expect } from "vitest";
import { draftMessage, waLink, mailLink, type OutreachTenant } from "@/lib/tenant-outreach";

const base: OutreachTenant = {
    name: "Ruang Laptop",
    ownerName: "Fahmi Haq",
    ownerEmail: "owner@example.test",
    phone: "081216929402",
    currentPeriodEnd: "2026-08-21T00:00:00.000Z",
    lapsed: false,
    expiringInDays: null,
    pendingRequest: false,
    pendingUpgradePlan: null,
};

describe("draftMessage", () => {
    it("leads with the plan when an upgrade was asked for", () => {
        // The most specific fact wins: the operator needs to know what to grant.
        const msg = draftMessage({ ...base, pendingRequest: true, pendingUpgradePlan: "Pro" });
        expect(msg).toContain("upgrade ke paket Pro");
        expect(msg).toContain("Ruang Laptop");
    });

    it("thanks them for a plain renewal request", () => {
        const msg = draftMessage({ ...base, pendingRequest: true });
        expect(msg).toContain("perpanjangan");
        expect(msg).not.toContain("upgrade");
    });

    it("says the shop is read-only once the period has passed", () => {
        const msg = draftMessage({ ...base, lapsed: true });
        expect(msg).toContain("hanya bisa dibaca");
    });

    it("names the end date when it is close", () => {
        const msg = draftMessage({ ...base, expiringInDays: 5 });
        expect(msg).toContain("akan berakhir");
        expect(msg).not.toContain("hanya bisa dibaca");
    });

    it("falls back to a neutral check-in", () => {
        expect(draftMessage(base)).toContain("Ada yang bisa saya bantu?");
    });

    it("greets by first name, and copes without one", () => {
        expect(draftMessage(base).startsWith("Halo Fahmi,")).toBe(true);
        expect(draftMessage({ ...base, ownerName: null }).startsWith("Halo,")).toBe(true);
        expect(draftMessage({ ...base, ownerName: "   " }).startsWith("Halo,")).toBe(true);
    });

    it("never puts payment details in the draft", () => {
        // Rule 16: an invented account number in a message the operator is about
        // to send a customer is worse than no message at all. The real ones live
        // in env and are not on this page.
        for (const variant of [
            base,
            { ...base, pendingRequest: true },
            { ...base, lapsed: true },
            { ...base, expiringInDays: 3 },
            { ...base, pendingUpgradePlan: "Business" },
        ]) {
            const msg = draftMessage(variant);
            expect(msg).not.toMatch(/\b\d{6,}\b/); // no account-like number
            expect(msg.toLowerCase()).not.toContain("rekening");
        }
    });
});

describe("waLink", () => {
    it("converts a local number to country code and strips punctuation", () => {
        expect(waLink(base)).toContain("https://wa.me/6281216929402?");
        expect(waLink({ ...base, phone: "0812-1692-9402" })).toContain("wa.me/6281216929402?");
        expect(waLink({ ...base, phone: "+62 812 1692 9402" })).toContain("wa.me/6281216929402?");
    });

    it("carries the draft as an encoded query parameter", () => {
        const url = new URL(waLink({ ...base, pendingRequest: true }));
        expect(url.searchParams.get("text")).toBe(draftMessage({ ...base, pendingRequest: true }));
    });
});

describe("mailLink", () => {
    it("addresses the owner and encodes subject and body", () => {
        const link = mailLink({ ...base, pendingUpgradePlan: "Pro" });
        expect(link.startsWith("mailto:owner@example.test?")).toBe(true);
        const params = new URLSearchParams(link.split("?")[1]);
        expect(params.get("subject")).toBe("Upgrade paket Pro — Ruang Laptop");
        expect(params.get("body")).toBe(draftMessage({ ...base, pendingUpgradePlan: "Pro" }));
    });
});
