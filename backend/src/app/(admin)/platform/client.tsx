"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Server, Users, UserX, CalendarClock, CheckCircle2, AlertTriangle, Wallet, Activity, Receipt, Package, Wrench } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

type Tenant = {
    id: string;
    name: string;
    isDemo: boolean;
    storeCount: number;
    planKey: string | null;
    status: string | null;
    currentPeriodEnd: string | null;
    lapsed: boolean;
    expiringInDays: number | null;
    usage: { transactions: number; inventory: number; serviceOrders: number };
    monthlyPrice: number | null;
};

type Summary = {
    mrr: number;
    payingTenants: number;
    trialing: number;
    expiringSoon: number;
    lapsed: number;
};

type ActivityEntry = {
    org: string;
    type: string;
    by: string | null;
    months: number | null;
    at: string;
};

type AssignablePlan = { key: string; name: string; priceMonthly: number | null };

const DURATIONS = [1, 3, 6, 12] as const;

/** subscriptionEvents.type is free-form text; anything unmapped shows raw. */
const ACTIVITY_LABELS: Record<string, string> = {
    manual_activation: "langganan diaktifkan",
    manual_renewal: "diperpanjang",
    past_due: "jatuh tempo",
    upgraded: "upgrade paket",
    trial_started: "mulai uji coba",
};

function formatDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function PlatformClient({
    organizations,
    plans,
    summary,
    activity,
    isImpersonating,
    currentOrgId,
}: {
    organizations: Tenant[];
    plans: AssignablePlan[];
    summary: Summary;
    activity: ActivityEntry[];
    isImpersonating: boolean;
    currentOrgId: string | null;
}) {
    const [loading, setLoading] = useState(false);
    // Which tenant's renewal form is open, plus its pending selections.
    const [renewing, setRenewing] = useState<string | null>(null);
    const [planKey, setPlanKey] = useState<string>("");
    const [months, setMonths] = useState<number>(1);
    const [saving, setSaving] = useState(false);

    const handleImpersonate = async (orgId: string) => {
        if (!confirm("Are you sure you want to impersonate this tenant? You will have full access to their data.")) return;
        setLoading(true);
        try {
            const res = await fetch("/api/auth/impersonate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ organizationId: orgId })
            });
            if (res.ok) {
                window.location.href = "/dashboard";
            } else {
                alert("Failed to start impersonation");
                setLoading(false);
            }
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    const handleStopImpersonation = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/auth/impersonate/stop", {
                method: "POST"
            });
            if (res.ok) {
                window.location.reload();
            } else {
                setLoading(false);
            }
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    const openRenew = (tenant: Tenant) => {
        setRenewing(tenant.id);
        setPlanKey(tenant.planKey ?? plans[0]?.key ?? "");
        setMonths(1);
    };

    const submitRenew = async (tenant: Tenant) => {
        if (!planKey) return;
        const plan = plans.find((p) => p.key === planKey);
        // Money already changed hands off-platform, so make the operator confirm
        // exactly what is about to be granted before it is granted.
        const ok = confirm(
            `Catat pembayaran manual untuk "${tenant.name}"?\n\n` +
            `Paket: ${plan?.name ?? planKey}\n` +
            `Durasi: ${months} bulan\n\n` +
            `Toko ini akan bisa menyimpan perubahan lagi.`
        );
        if (!ok) return;

        setSaving(true);
        try {
            const res = await fetch("/api/platform/subscriptions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ organizationId: tenant.id, planKey, months }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Gagal mencatat pembayaran");
                return;
            }
            toast.success(`${tenant.name} aktif sampai ${formatDate(data.currentPeriodEnd)}`);
            // Re-read from the server rather than patching local state: the period
            // is computed server-side and this page is the operator's source of truth.
            window.location.reload();
        } catch (error) {
            console.error(error);
            toast.error("Gagal menghubungi server");
        } finally {
            setSaving(false);
        }
    };

    const needsAttention = organizations.filter((o) => !o.isDemo && (o.lapsed || o.expiringInDays !== null));

    return (
        <div className="space-y-6">
            {/* The numbers an operator opens this page to find. MRR counts only
                what is actually being collected — paying plans, active, not
                lapsed — so it cannot be flattered by trials or the internal plan. */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border bg-card p-4">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Wallet className="h-3.5 w-3.5" /> Pendapatan / bulan</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums">{formatCurrency(summary.mrr)}</p>
                    <p className="text-xs text-muted-foreground">{summary.payingTenants} toko berbayar</p>
                </div>
                <div className="rounded-xl border bg-card p-4">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Activity className="h-3.5 w-3.5" /> Masa uji coba</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums">{summary.trialing}</p>
                    <p className="text-xs text-muted-foreground">belum membayar</p>
                </div>
                <div className={`rounded-xl border p-4 ${summary.expiringSoon > 0 ? "border-sky-300 bg-sky-50 dark:border-sky-900/60 dark:bg-sky-950/40" : "bg-card"}`}>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarClock className="h-3.5 w-3.5" /> Berakhir ≤7 hari</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums">{summary.expiringSoon}</p>
                    <p className="text-xs text-muted-foreground">perlu dihubungi</p>
                </div>
                <div className={`rounded-xl border p-4 ${summary.lapsed > 0 ? "border-amber-400 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40" : "bg-card"}`}>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5" /> Terkunci</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums">{summary.lapsed}</p>
                    <p className="text-xs text-muted-foreground">read-only</p>
                </div>
            </div>

            {needsAttention.length > 0 && (
                <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">{needsAttention.length} toko perlu perhatian</strong> — ditampilkan paling atas.
                </p>
            )}

            {isImpersonating && (
                <div className="flex justify-end">
                    <Button variant="destructive" onClick={handleStopImpersonation} disabled={loading} className="gap-2 font-bold">
                        <UserX className="h-4 w-4" /> Stop Impersonating
                    </Button>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {organizations.map((org) => (
                    <Card
                        key={org.id}
                        // A labelled group per tenant: the cards are otherwise an
                        // undifferentiated wall of identical controls to a screen reader.
                        role="group"
                        aria-label={org.name}
                        className={currentOrgId === org.id ? "border-primary shadow-md" : ""}
                    >
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xl flex items-center justify-between gap-2">
                                <span className="truncate">{org.name}</span>
                                {currentOrgId === org.id && <span className="shrink-0 text-xs bg-primary text-white px-2 py-1 rounded-full">Active</span>}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm space-y-2 mb-4">
                                <p className="text-muted-foreground flex items-center gap-2">
                                    <Server className="h-4 w-4" /> {org.storeCount} Stores
                                </p>

                                <p className="flex items-center gap-2">
                                    {org.lapsed ? (
                                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                                    ) : (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                    )}
                                    <span className="font-medium capitalize">
                                        {org.planKey ?? "Tanpa paket"}
                                    </span>
                                    <span className="text-muted-foreground">· {org.status ?? "—"}</span>
                                </p>

                                <p className="text-muted-foreground flex items-center gap-2">
                                    <CalendarClock className="h-4 w-4 shrink-0" />
                                    {org.lapsed ? "Berakhir " : "Sampai "}
                                    {formatDate(org.currentPeriodEnd)}
                                    {org.expiringInDays !== null && (
                                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-900 dark:bg-sky-950 dark:text-sky-100">
                                            {org.expiringInDays === 0 ? "hari ini" : org.expiringInDays === 1 ? "besok" : `${org.expiringInDays} hari lagi`}
                                        </span>
                                    )}
                                </p>

                                {/* Whether the shop is actually being worked in. A trial
                                    with stock and service orders is worth chasing; an
                                    empty one is not, and plan/status alone cannot tell
                                    them apart. */}
                                {!org.isDemo && (
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1" title="Transaksi"><Receipt className="h-3.5 w-3.5" />{org.usage.transactions}</span>
                                        <span className="flex items-center gap-1" title="Barang"><Package className="h-3.5 w-3.5" />{org.usage.inventory}</span>
                                        <span className="flex items-center gap-1" title="Order servis"><Wrench className="h-3.5 w-3.5" />{org.usage.serviceOrders}</span>
                                        {org.usage.transactions + org.usage.inventory + org.usage.serviceOrders === 0 && (
                                            <span className="text-amber-700 dark:text-amber-400">belum dipakai</span>
                                        )}
                                    </div>
                                )}

                                {org.lapsed && !org.isDemo && (
                                    <p className="text-xs text-amber-700 dark:text-amber-400">
                                        Toko ini read-only sampai pembayaran dicatat.
                                    </p>
                                )}
                                {org.isDemo && (
                                    <p className="text-xs text-muted-foreground">
                                        Tenant demo — read-only secara permanen.
                                    </p>
                                )}
                            </div>

                            {renewing === org.id && (
                                <div className="space-y-3 rounded-lg border bg-muted/40 p-3 mb-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium" htmlFor={`plan-${org.id}`}>Paket</label>
                                        <select
                                            id={`plan-${org.id}`}
                                            className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                                            value={planKey}
                                            onChange={(e) => setPlanKey(e.target.value)}
                                        >
                                            {plans.map((p) => (
                                                <option key={p.key} value={p.key}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-medium" htmlFor={`months-${org.id}`}>Durasi</label>
                                        <select
                                            id={`months-${org.id}`}
                                            className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                                            value={months}
                                            onChange={(e) => setMonths(Number(e.target.value))}
                                        >
                                            {DURATIONS.map((m) => (
                                                <option key={m} value={m}>{m} bulan</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex gap-2">
                                        {/* Every card renders the same button labels, so the
                                            accessible name has to carry the tenant or a screen
                                            reader hears "Catat pembayaran" N times with no way
                                            to tell which shop is about to be charged. */}
                                        <Button
                                            size="sm"
                                            className="flex-1"
                                            disabled={saving || !planKey}
                                            aria-label={`Catat pembayaran ${org.name}`}
                                            onClick={() => submitRenew(org)}
                                        >
                                            {saving ? "Menyimpan…" : "Catat pembayaran"}
                                        </Button>
                                        <Button size="sm" variant="ghost" disabled={saving} aria-label={`Batal ${org.name}`} onClick={() => setRenewing(null)}>
                                            Batal
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>

                        <CardFooter className="flex-col gap-2 items-stretch pt-0">
                            {renewing !== org.id && (
                                <Button
                                    variant={org.lapsed && !org.isDemo ? "default" : "outline"}
                                    className="w-full gap-2"
                                    aria-label={`${org.planKey ? "Perpanjang langganan" : "Aktifkan langganan"} ${org.name}`}
                                    onClick={() => openRenew(org)}
                                    disabled={loading || plans.length === 0}
                                >
                                    <CalendarClock className="h-4 w-4" />
                                    {org.planKey ? "Perpanjang / ubah paket" : "Aktifkan langganan"}
                                </Button>
                            )}

                            {!isImpersonating || currentOrgId !== org.id ? (
                                <Button
                                    variant="outline"
                                    className="w-full gap-2 border-primary/50 text-primary hover:bg-primary/10"
                                    aria-label={`Impersonate ${org.name}`}
                                    onClick={() => handleImpersonate(org.id)}
                                    disabled={loading}
                                >
                                    <Users className="h-4 w-4" /> Impersonate
                                </Button>
                            ) : (
                                <Button
                                    variant="secondary"
                                    className="w-full gap-2 opacity-50 cursor-not-allowed"
                                    disabled={true}
                                >
                                    Currently Impersonating
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {/* Money moves outside the app, so subscriptionEvents is the only
                record that a tenant was granted paid time — and until now it was
                written and never read. */}
            {activity.length > 0 && (
                <div className="rounded-xl border bg-card p-4">
                    <p className="mb-3 text-sm font-semibold">Aktivitas langganan terakhir</p>
                    <ul className="space-y-2 text-sm">
                        {activity.map((a, i) => (
                            <li key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-muted-foreground">
                                <span className="font-medium text-foreground">{a.org}</span>
                                <span>{ACTIVITY_LABELS[a.type] ?? a.type}</span>
                                {a.months !== null && <span>· {a.months} bulan</span>}
                                {a.by && <span className="truncate">· oleh {a.by}</span>}
                                <span className="ml-auto shrink-0 text-xs">{formatDate(a.at)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
