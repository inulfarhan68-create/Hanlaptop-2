import type { Metadata } from "next";
import Link from "next/link";
import { Check, X, Store, Boxes, LineChart, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { getPublicPlans, type PublicPlan } from "@/lib/public/plans";
import type { FeatureKey } from "@/lib/features";

export const metadata: Metadata = {
    title: "HanLaptop POS — Software Kasir, Servis & Pembukuan Toko Laptop",
    description:
        "POS & ERP untuk toko laptop, komputer, HP, dan servis: jual-beli, servis, tukar tambah, stok, dan pembukuan otomatis. Dari satu toko sampai jaringan cabang.",
};

// Prices/plans live in the DB (editable later via super-admin). Revalidate hourly
// so the pricing table reflects plan edits without a redeploy, while staying static-fast.
export const revalidate = 3600;

const POPULAR_KEY = "pro";

const VALUE_PROPS = [
    { icon: Store, title: "POS + Servis jadi satu", body: "Kasir, order servis, garansi, dan tukar tambah dalam satu alur. Nota & barcode langsung cetak." },
    { icon: Boxes, title: "Stok yang akurat", body: "Serial number, kondisi, konsinyasi, QC, dan transfer antar cabang — stok selalu cocok." },
    { icon: LineChart, title: "Pembukuan otomatis", body: "Setiap transaksi jadi jurnal double-entry. Laba-rugi, neraca, dan piutang real-time." },
    { icon: ShieldCheck, title: "Multi-cabang & peran", body: "Akses berbasis peran (owner, manager, kasir, teknisi) dengan isolasi data per cabang." },
];

// Curated card highlights (marketing copy per tier). The full, feature-flag-driven
// ✓/✗ matrix lives in the comparison table below.
const CARD_HIGHLIGHTS: Record<string, { lead?: string; items: string[] }> = {
    starter: { items: ["POS, Inventory & Pembelian", "Customer, Supplier & Buyback", "Shift kasir, nota digital & katalog online"] },
    pro: { lead: "Semua Starter +", items: ["Modul Servis lengkap (work order, tracking, garansi, device passport)", "Akuntansi & laporan keuangan penuh", "Sampai 5 user + role & permission"] },
    business: { lead: "Semua Pro +", items: ["Sampai 5 cabang: transfer & konsolidasi laporan", "Stock opname, QC & purchase order", "Audit trail, approval workflow & HR"] },
    enterprise: { lead: "Semua Business +", items: ["Unlimited user & cabang", "API integration & white-label", "Import data, training, priority support & SLA"] },
};

// Full comparison rows, driven by the plan feature flags.
const COMPARE_ROWS: { label: string; key: FeatureKey }[] = [
    { label: "POS Penjualan", key: "pos" },
    { label: "Inventory", key: "inventory" },
    { label: "Pembelian", key: "purchasing" },
    { label: "Customer & Supplier", key: "customersSuppliers" },
    { label: "Buyback / Trade-In", key: "buyback" },
    { label: "Shift Kasir", key: "shift" },
    { label: "Katalog Online", key: "catalog" },
    { label: "Modul Servis (Work Order, Tracking, Garansi)", key: "service" },
    { label: "Laporan Keuangan (COA, L/R, Neraca, Arus Kas)", key: "accountingReports" },
    { label: "Role & Permission", key: "roles" },
    { label: "Multi Cabang", key: "multiStore" },
    { label: "Stock Opname", key: "stockOpname" },
    { label: "Quality Control", key: "qc" },
    { label: "Purchase Order", key: "procurement" },
    { label: "Audit Trail", key: "auditTrail" },
    { label: "Approval Workflow", key: "approvals" },
    { label: "HR & Komisi Teknisi", key: "hr" },
    { label: "API Integration", key: "api" },
    { label: "White Label", key: "whiteLabel" },
];

function priceLabel(p: PublicPlan): { main: string; sub: string } {
    if (p.priceMonthly === null) return { main: "Custom", sub: "Hubungi kami" };
    return { main: formatCurrency(p.priceMonthly), sub: "/bulan" };
}

function limitValue(v: number | null, unit: string): string {
    return v === null ? "Unlimited" : `${v} ${unit}`;
}

function TickCell({ on }: { on: boolean }) {
    return on
        ? <Check className="mx-auto h-4 w-4 text-primary" aria-label="ya" />
        : <X className="mx-auto h-4 w-4 text-muted-foreground/40" aria-label="tidak" />;
}

export default async function ProductLandingPage() {
    const plans = await getPublicPlans();

    return (
        <main className="min-h-screen bg-background text-foreground">
            {/* Top bar */}
            <header className="border-b border-border">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
                    <span className="text-lg font-bold tracking-tight">HanLaptop <span className="text-primary">POS</span></span>
                    <nav className="flex items-center gap-2">
                        <Link href="/login"><Button variant="ghost" size="sm">Masuk</Button></Link>
                        <Link href="/register"><Button size="sm">Daftar toko</Button></Link>
                    </nav>
                </div>
            </header>

            {/* Hero */}
            <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:py-24">
                <p className="mb-3 text-sm font-medium uppercase tracking-wider text-primary">POS &amp; ERP toko laptop, komputer, HP &amp; servis</p>
                <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
                    Jalankan seluruh toko Anda dari satu aplikasi
                </h1>
                <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
                    Jual-beli, servis, tukar tambah, stok, dan pembukuan — otomatis dan terhubung.
                    Dari satu toko sampai jaringan cabang.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    <Link href="/register"><Button size="lg" className="gap-2">Mulai sekarang <ArrowRight className="h-4 w-4" /></Button></Link>
                    <Link href="#harga"><Button size="lg" variant="outline">Lihat harga</Button></Link>
                </div>
            </section>

            {/* Value props */}
            <section className="mx-auto max-w-6xl px-4 pb-8">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {VALUE_PROPS.map((v) => (
                        <Card key={v.title}>
                            <CardContent className="pt-6">
                                <v.icon className="mb-3 h-6 w-6 text-primary" />
                                <h3 className="mb-1 font-semibold">{v.title}</h3>
                                <p className="text-sm text-muted-foreground">{v.body}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Pricing cards */}
            <section id="harga" className="mx-auto max-w-6xl px-4 py-16">
                <div className="mb-10 text-center">
                    <h2 className="text-3xl font-bold tracking-tight">Harga sederhana, per bulan</h2>
                    <p className="mt-2 text-muted-foreground">Mulai kecil, naik paket saat toko Anda tumbuh. Tanpa biaya tersembunyi.</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {plans.map((plan) => {
                        const popular = plan.key === POPULAR_KEY;
                        const price = priceLabel(plan);
                        const hl = CARD_HIGHLIGHTS[plan.key];
                        return (
                            <Card key={plan.key} className={popular ? "border-primary shadow-lg ring-1 ring-primary" : ""}>
                                <CardHeader className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-bold">{plan.name}</h3>
                                        {popular && (
                                            <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">Paling Populer</span>
                                        )}
                                    </div>
                                    {plan.bestFor && <p className="text-sm text-muted-foreground">{plan.bestFor}</p>}
                                    <div>
                                        <span className="text-3xl font-extrabold">{price.main}</span>
                                        <span className="text-sm text-muted-foreground"> {price.sub}</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Link href={`/register?plan=${plan.key}`} className="block">
                                        <Button className="w-full" variant={popular ? "default" : "outline"}>
                                            {plan.priceMonthly === null ? "Hubungi kami" : `Pilih ${plan.name}`}
                                        </Button>
                                    </Link>
                                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                                        <li>{limitValue(plan.maxUsers, "user")}</li>
                                        <li>{limitValue(plan.maxStores, "cabang")}</li>
                                    </ul>
                                    {hl && (
                                        <ul className="space-y-1.5 border-t border-border pt-3 text-sm">
                                            {hl.lead && <li className="font-medium text-foreground">{hl.lead}</li>}
                                            {hl.items.map((it) => (
                                                <li key={it} className="flex items-start gap-2">
                                                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                                    <span>{it}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </section>

            {/* Comparison table */}
            <section className="mx-auto max-w-6xl px-4 pb-16">
                <h2 className="mb-6 text-center text-2xl font-bold tracking-tight">Perbandingan lengkap</h2>
                <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full min-w-[640px] text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/40">
                                <th className="px-4 py-3 text-left font-semibold">Fitur</th>
                                {plans.map((p) => (
                                    <th key={p.key} className={`px-4 py-3 text-center font-semibold ${p.key === POPULAR_KEY ? "text-primary" : ""}`}>{p.name}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-border">
                                <td className="px-4 py-2.5 text-muted-foreground">Jumlah User</td>
                                {plans.map((p) => (
                                    <td key={p.key} className="px-4 py-2.5 text-center">{p.maxUsers === null ? "Unlimited" : p.maxUsers}</td>
                                ))}
                            </tr>
                            <tr className="border-b border-border">
                                <td className="px-4 py-2.5 text-muted-foreground">Jumlah Cabang</td>
                                {plans.map((p) => (
                                    <td key={p.key} className="px-4 py-2.5 text-center">{p.maxStores === null ? "Unlimited" : p.maxStores}</td>
                                ))}
                            </tr>
                            {COMPARE_ROWS.map((row) => (
                                <tr key={row.key} className="border-b border-border last:border-0">
                                    <td className="px-4 py-2.5 text-muted-foreground">{row.label}</td>
                                    {plans.map((p) => (
                                        <td key={p.key} className="px-4 py-2.5"><TickCell on={p.features[row.key] === true} /></td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Final CTA */}
            <section className="border-t border-border bg-muted/40">
                <div className="mx-auto max-w-6xl px-4 py-16 text-center">
                    <h2 className="text-2xl font-bold tracking-tight">Siap merapikan toko Anda?</h2>
                    <p className="mx-auto mt-2 max-w-xl text-muted-foreground">Daftarkan toko Anda dalam beberapa menit. Data tiap toko terisolasi dan aman.</p>
                    <div className="mt-6">
                        <Link href="/register"><Button size="lg" className="gap-2">Daftarkan toko Anda <ArrowRight className="h-4 w-4" /></Button></Link>
                    </div>
                </div>
            </section>

            <footer className="border-t border-border">
                <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-muted-foreground">
                    © {new Date().getFullYear()} HanLaptop POS · <Link href="/" className="underline">Storefront Han Laptop</Link>
                </div>
            </footer>
        </main>
    );
}
