import { describe, it, expect } from "vitest";
import { toPayloadItems, isServiceOnlyCart, type CartLine } from "@/lib/sales-cart";

const stocked: CartLine = { id: "inv-1", name: "Thinkpad T480", price: 4_500_000, qty: 1 };
const adhoc: CartLine = { id: "adhoc-1700000000-0", name: "Ganti pasta prosesor", price: 50_000, qty: 1, isAdhoc: true };

describe("toPayloadItems", () => {
    it("sends a stocked line with its inventory id and no label", () => {
        const [line] = toPayloadItems([stocked]);
        expect(line.inventoryId).toBe("inv-1");
        expect(line.itemName).toBeUndefined();
    });

    it("sends an ad-hoc fee with a null inventory id and its own label", () => {
        // The cart id is local ("adhoc-…"). Sending it as an inventoryId would
        // look like a real one to the server and fail the stock lookup — and the
        // difference is invisible in the UI, which is why it is pinned here.
        const [line] = toPayloadItems([adhoc]);
        expect(line.inventoryId).toBeNull();
        expect(line.itemName).toBe("Ganti pasta prosesor");
        expect(line.unitPrice).toBe(50_000);
    });

    it("keeps a mixed cart in order and distinguishes the two kinds", () => {
        const items = toPayloadItems([stocked, adhoc]);
        expect(items.map((i) => i.inventoryId)).toEqual(["inv-1", null]);
    });

    it("applies the per-unit discount to the price it sends", () => {
        const items = toPayloadItems([stocked], (l) => (l.isAdhoc ? 0 : 500_000));
        expect(items[0].unitPrice).toBe(4_000_000);
    });

    it("never lets a local cart id reach the server as an inventory id", () => {
        for (const line of toPayloadItems([adhoc, stocked, { ...adhoc, id: "adhoc-x" }])) {
            expect(String(line.inventoryId ?? "")).not.toContain("adhoc-");
        }
    });
});

describe("isServiceOnlyCart", () => {
    it("is true when every line is a service line", () => {
        expect(isServiceOnlyCart([{ category: "Jasa Servis" }, { category: "Jasa Servis" }])).toBe(true);
    });

    it("is false as soon as one physical item is present", () => {
        // Mixed carts must stay "Penjualan": that branch is the one that moves
        // stock and books HPP for the laptop.
        expect(isServiceOnlyCart([{ category: "Jasa Servis" }, { category: "Laptop Bekas" }])).toBe(false);
    });

    it("is false for an empty cart", () => {
        expect(isServiceOnlyCart([])).toBe(false);
    });
});
