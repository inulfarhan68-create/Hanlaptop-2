/**
 * Turning the register's cart into the payload the transactions API expects.
 *
 * The one rule worth pinning: an ad-hoc service fee has no inventory row behind
 * it, so it must travel as `inventoryId: null` plus its own label. Sending its
 * local cart id instead would look like a real inventory id to the server, which
 * would then fail the stock lookup — or, worse on a future schema, match
 * something. The distinction is invisible in the UI, so it is pinned here.
 */
export type CartLine = {
    id: string;
    name: string;
    price: number;
    qty: number;
    isAdhoc?: boolean;
    serialNumbers?: string[];
};

export type PayloadItem = {
    inventoryId: string | null;
    itemName?: string;
    quantity: number;
    unitPrice: number;
    serialNumbers?: string[];
};

export function toPayloadItems(
    cart: CartLine[],
    discountPerUnit: (line: CartLine) => number = () => 0,
): PayloadItem[] {
    return cart.map((c) => ({
        inventoryId: c.isAdhoc ? null : c.id,
        itemName: c.isAdhoc ? c.name : undefined,
        quantity: c.qty,
        unitPrice: c.price - discountPerUnit(c),
        serialNumbers: c.serialNumbers,
    }));
}

/** Whether a cart is nothing but service lines — stocked or ad-hoc. */
export function isServiceOnlyCart(cart: { category?: string }[]): boolean {
    return cart.length > 0 && cart.every((c) => c.category === "Jasa Servis");
}
