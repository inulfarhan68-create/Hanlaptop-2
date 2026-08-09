/**
 * A shop's own name, address and phone — resolved, or admitted to be unknown.
 *
 * These three print on notas, service labels, flyers and WhatsApp messages that
 * a shop sends its own customers and suppliers. Every one of those call sites
 * used to end in `|| "HanLaptop"` (or the flagship's address and phone), so a
 * tenant whose settings had not loaded yet would hand its customer a receipt
 * under someone else's brand. CLAUDE.md rule 16: when the value is unknown, drop
 * the line — never invent one.
 *
 * `null` here means exactly "we do not know yet", and every caller is expected
 * to say nothing rather than guess. In practice it is a narrow window: the
 * settings API already falls back to the store's own row, and a store name is
 * required at registration.
 */

/** First candidate that is a non-blank string, else null. Never invents. */
export function pickIdentity(...candidates: (string | null | undefined)[]): string | null {
    for (const c of candidates) {
        if (typeof c === "string" && c.trim() !== "") return c.trim();
    }
    return null;
}

/**
 * A clause that disappears when the value is unknown.
 *
 * The reason this exists rather than a bare `?? ""`: the sentences these feed
 * read `kami dari *${shop}*`, which degrades to `kami dari **` — visibly broken
 * text sent to a real customer. Dropping the whole clause reads naturally.
 *
 *   `Halo Pak Budi${clause(", kami dari *", shop, "*")}. Ingin ...`
 */
export function clause(prefix: string, value: string | null, suffix = ""): string {
    return value ? `${prefix}${value}${suffix}` : "";
}

/**
 * Fill a user-authored WhatsApp template.
 *
 * Templates are the shop's own text and are written expecting every placeholder
 * to resolve — `Halo Kak {nama}, ini dengan *{toko}*.` cannot be repaired by
 * substituting an empty string. So a missing value is reported rather than
 * papered over, and the caller refuses to send.
 */
export function fillTemplate(
    template: string,
    vars: Record<string, string | null>,
): { text: string; missing: string[] } {
    const missing: string[] = [];
    let text = template;
    for (const [key, value] of Object.entries(vars)) {
        if (value === null) {
            if (template.includes(`{${key}}`)) missing.push(key);
            continue;
        }
        text = text.replaceAll(`{${key}}`, value);
    }
    return { text, missing };
}

/** Reads the browser-cached identity written by the shell when settings load. */
export function cachedIdentity(key: "storeName" | "storeAddress" | "storePhone" | "storeInstagram"): string | null {
    if (typeof window === "undefined") return null;
    return pickIdentity(localStorage.getItem(key));
}
