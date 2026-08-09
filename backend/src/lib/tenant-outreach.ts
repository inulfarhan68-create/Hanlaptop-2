/**
 * Turning "this shop is waiting on you" into a message you can actually send.
 *
 * Billing is settled by hand, so every signal in the operator console ends in a
 * conversation. The console knew who was waiting but not how to reach them, so
 * answering a renewal request meant leaving the page and digging an address out
 * of the database — which in practice means it waits until you remember.
 *
 * No integration and no credentials: these build `wa.me` and `mailto:` URLs that
 * open the operator's own WhatsApp or mail client with the text already drafted.
 * Nothing is sent until they send it.
 */
export type OutreachTenant = {
    name: string;
    ownerName: string | null;
    ownerEmail: string | null;
    phone: string | null;
    currentPeriodEnd: string | null;
    lapsed: boolean;
    expiringInDays: number | null;
    pendingRequest: boolean;
    pendingUpgradePlan: string | null;
};

function formatDate(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * What to say, drawn from the tenant's own situation — most specific first: a
 * named upgrade beats a plain renewal, which beats the state of their period.
 *
 * Only facts already on the card go in: shop name, plan, the date their period
 * ends. Deliberately NO payment details — those live in env (BILLING_*), are not
 * on this page, and inventing an account number into a message the operator is
 * about to send a customer is exactly the failure CLAUDE.md rule 16 exists to
 * prevent.
 */
export function draftMessage(org: OutreachTenant): string {
    const hi = org.ownerName?.trim() ? `Halo ${org.ownerName.trim().split(/\s+/)[0]}` : "Halo";
    const shop = `toko ${org.name}`;
    if (org.pendingUpgradePlan) {
        return `${hi}, terima kasih sudah mengajukan upgrade ke paket ${org.pendingUpgradePlan} untuk ${shop}. Saya kirimkan detail pembayarannya ya.`;
    }
    if (org.pendingRequest) {
        return `${hi}, terima kasih sudah mengajukan perpanjangan langganan untuk ${shop}. Saya kirimkan detail pembayarannya ya.`;
    }
    if (org.lapsed) {
        return `${hi}, langganan ${shop} sudah berakhir pada ${formatDate(org.currentPeriodEnd)} dan aplikasinya sekarang hanya bisa dibaca. Kalau mau diperpanjang, saya bantu prosesnya.`;
    }
    if (org.expiringInDays !== null) {
        return `${hi}, langganan ${shop} akan berakhir pada ${formatDate(org.currentPeriodEnd)}. Kalau mau diperpanjang, saya bantu prosesnya.`;
    }
    return `${hi}, saya ingin menanyakan kabar penggunaan HanLaptop POS di ${shop}. Ada yang bisa saya bantu?`;
}

/**
 * wa.me wants a country-coded number and nothing else — no +, spaces or dashes.
 * Indonesian numbers are stored as typed, usually starting 0.
 */
export function waLink(org: OutreachTenant): string {
    const number = (org.phone ?? "").replace(/[^0-9]/g, "").replace(/^0/, "62");
    return `https://wa.me/${number}?text=${encodeURIComponent(draftMessage(org))}`;
}

export function mailLink(org: OutreachTenant): string {
    const subject = org.pendingUpgradePlan
        ? `Upgrade paket ${org.pendingUpgradePlan} — ${org.name}`
        : `Langganan HanLaptop POS — ${org.name}`;
    return `mailto:${org.ownerEmail ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(draftMessage(org))}`;
}
