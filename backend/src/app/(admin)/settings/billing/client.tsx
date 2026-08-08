"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Clock, MessageCircle, Mail, Landmark, Send } from "lucide-react";

type Subscription = {
    planName: string | null;
    planKey: string;
    status: string;
    currentPeriodEnd: string;
    maxStores: number | null;
    maxUsers: number | null;
    maxTransactionsPerMonth: number | null;
};

type Plan = {
    key: string;
    name: string;
    priceMonthly: number | null;
    maxStores: number | null;
    maxUsers: number | null;
    maxTransactionsPerMonth: number | null;
};

type Invoice = {
    id: string;
    description: string | null;
    amount: number;
    status: string;
    createdAt: string;
};

type Contact = { whatsapp: string | null; email: string | null; bankInfo: string | null };

const STATUS_LABELS: Record<string, string> = {
    trialing: "Masa uji coba",
    active: "Aktif",
    past_due: "Jatuh tempo",
    canceled: "Dibatalkan",
    unpaid: "Belum dibayar",
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
    paid: "Lunas",
    unpaid: "Belum dibayar",
    void: "Dibatalkan",
};

function formatDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

/** Whole days from today until `iso`; negative once it has passed. */
function daysUntil(iso: string) {
    const end = new Date(iso);
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    return Math.round((startOfDay(end) - startOfDay(new Date())) / 86_400_000);
}

function quota(value: number | null) {
    return value === null ? "Tanpa batas" : value.toLocaleString("id-ID");
}

export default function BillingClient({
    subscription,
    lapsed,
    plans,
    invoices,
    organizationName,
    contact,
}: {
    subscription: Subscription | null;
    lapsed: boolean;
    plans: Plan[];
    invoices: Invoice[];
    organizationName: string;
    contact: Contact;
}) {
    const remaining = subscription ? daysUntil(subscription.currentPeriodEnd) : null;
    // Renewal is a conversation, not a checkout — surface it early while the shop
    // still has days left, not only once it is already locked.
    const endingSoon = remaining !== null && remaining >= 0 && remaining <= 7;
    const hasContact = Boolean(contact.whatsapp || contact.email || contact.bankInfo);

    // Clicking "Perpanjang" used to land here and offer nothing to do — no
    // contact configured meant a dead end, and even with one the shop could only
    // be told to go away and phone someone. This records the intent so the
    // operator sees it in their console.
    const [requesting, setRequesting] = useState(false);
    const [requested, setRequested] = useState(false);

    const requestRenewal = async () => {
        setRequesting(true);
        try {
            const res = await apiFetch("/api/subscription/request-renewal", { method: "POST" });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast.error(data.error || "Gagal mengirim permintaan");
                return;
            }
            setRequested(true);
            toast.success(data.message || "Permintaan terkirim");
        } catch {
            toast.error("Gagal menghubungi server");
        } finally {
            setRequesting(false);
        }
    };

    const waLink = contact.whatsapp
        ? `https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
              `Halo, saya ingin memperpanjang langganan HanLaptop POS untuk toko "${organizationName}".`
          )}`
        : null;

    return (
        <div className="space-y-6">
            <Card className={lapsed ? "border-amber-500" : endingSoon ? "border-amber-400/60" : undefined}>
                <CardHeader>
                    <CardTitle className="flex flex-wrap items-center gap-2">
                        <span>Paket {subscription?.planName ?? subscription?.planKey ?? "—"}</span>
                        {subscription && (
                            <span
                                className={
                                    lapsed
                                        ? "inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                                        : "inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
                                }
                            >
                                {lapsed ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                                {STATUS_LABELS[subscription.status] ?? subscription.status}
                            </span>
                        )}
                    </CardTitle>
                    <CardDescription>
                        {!subscription ? (
                            "Toko ini belum memiliki langganan aktif."
                        ) : lapsed ? (
                            <>
                                Masa aktif berakhir {formatDate(subscription.currentPeriodEnd)}. Data Anda
                                tetap tersimpan dan bisa dilihat serta diekspor, tetapi penyimpanan
                                perubahan dinonaktifkan sampai langganan diperpanjang.
                            </>
                        ) : (
                            <>
                                Aktif sampai {formatDate(subscription.currentPeriodEnd)}
                                {remaining !== null && remaining >= 0 && (
                                    <> · sisa {remaining} hari</>
                                )}
                            </>
                        )}
                    </CardDescription>
                </CardHeader>

                {subscription && (
                    <CardContent>
                        <dl className="grid gap-4 sm:grid-cols-3 text-sm">
                            <div>
                                <dt className="text-muted-foreground">Batas cabang</dt>
                                <dd className="font-medium">{quota(subscription.maxStores)}</dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">Batas pengguna</dt>
                                <dd className="font-medium">{quota(subscription.maxUsers)}</dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">Transaksi / bulan</dt>
                                <dd className="font-medium">{quota(subscription.maxTransactionsPerMonth)}</dd>
                            </div>
                        </dl>

                        {endingSoon && !lapsed && (
                            <p className="mt-4 flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
                                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>
                                    Masa aktif tinggal {remaining} hari. Perpanjang sebelum tanggal
                                    tersebut agar penyimpanan data tidak terhenti.
                                </span>
                            </p>
                        )}
                    </CardContent>
                )}
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Cara memperpanjang</CardTitle>
                    <CardDescription>
                        Pembayaran diproses manual. Setelah transfer dikonfirmasi, masa aktif toko
                        Anda langsung diperpanjang oleh admin.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {contact.bankInfo && (
                        <div className="flex items-start gap-3 rounded-md border p-3">
                            <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                                <p className="text-sm font-medium">Transfer ke</p>
                                <p className="whitespace-pre-line break-words text-sm text-muted-foreground">
                                    {contact.bankInfo}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Plain anchors, not <Button asChild>: this Button renders a <span>
                        rather than a Radix Slot, so the padding around the link text
                        would not be clickable. */}
                    <div className="flex flex-wrap gap-2">
                        {waLink && (
                            <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                            >
                                <MessageCircle className="h-4 w-4" /> Hubungi via WhatsApp
                            </a>
                        )}
                        {contact.email && (
                            <a
                                href={`mailto:${contact.email}?subject=${encodeURIComponent(`Perpanjangan langganan — ${organizationName}`)}`}
                                className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                            >
                                <Mail className="h-4 w-4" /> {contact.email}
                            </a>
                        )}
                    </div>

                    {/* No invented bank account or phone number: with nothing configured
                        the page says who to ask instead of printing a fake channel. */}
                    {!hasContact && (
                        <p className="text-sm text-muted-foreground">
                            Hubungi admin HanLaptop POS untuk memperpanjang langganan toko Anda.
                        </p>
                    )}

                    {/* Always present, with or without a contact channel: this is the
                        one action the shop can take from inside the app, and without
                        it a tenant with no configured contact has no route at all. */}
                    <div className="border-t pt-4">
                        {requested ? (
                            <p className="flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                                Permintaan perpanjangan sudah terkirim. Admin akan menghubungi Anda
                                untuk konfirmasi pembayaran.
                            </p>
                        ) : (
                            <>
                                <Button onClick={requestRenewal} disabled={requesting} className="gap-2">
                                    <Send className="h-4 w-4" />
                                    {requesting ? "Mengirim…" : "Saya ingin perpanjang"}
                                </Button>
                                <p className="mt-2 text-xs text-muted-foreground">
                                    Memberi tahu admin bahwa Anda ingin memperpanjang. Ini bukan
                                    pembayaran — admin tetap mengonfirmasi transfer Anda.
                                </p>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            {plans.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Pilihan paket</CardTitle>
                        <CardDescription>Sebutkan paket yang Anda inginkan saat menghubungi admin.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {plans.map((plan) => {
                                const isCurrent = subscription?.planKey === plan.key;
                                return (
                                    <div
                                        key={plan.key}
                                        className={`rounded-lg border p-4 ${isCurrent ? "border-primary bg-primary/5" : ""}`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="font-semibold">{plan.name}</p>
                                            {isCurrent && (
                                                <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-white">
                                                    Paket Anda
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {plan.priceMonthly === null
                                                ? "Hubungi kami"
                                                : `${formatCurrency(plan.priceMonthly)} / bulan`}
                                        </p>
                                        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                                            <li>{quota(plan.maxStores)} cabang</li>
                                            <li>{quota(plan.maxUsers)} pengguna</li>
                                            <li>{quota(plan.maxTransactionsPerMonth)} transaksi/bulan</li>
                                        </ul>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Riwayat tagihan</CardTitle>
                </CardHeader>
                <CardContent>
                    {invoices.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Belum ada tagihan.</p>
                    ) : (
                        <div className="space-y-3">
                            {invoices.map((inv) => (
                                <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-4">
                                    <div className="min-w-0">
                                        <p className="truncate font-medium">{inv.description ?? "Tagihan langganan"}</p>
                                        <p className="text-sm text-muted-foreground">{formatDate(inv.createdAt)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold">{formatCurrency(inv.amount)}</p>
                                        <p className={`text-sm ${inv.status === "paid" ? "text-emerald-600" : "text-amber-600"}`}>
                                            {INVOICE_STATUS_LABELS[inv.status] ?? inv.status}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
