import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { Check, X, Store, Boxes, LineChart, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { getPublicPlans, type PublicPlan } from "@/lib/public/plans";
import { FEATURES, ADDONS, type FeatureKey } from "@/lib/features";

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

// Curated card highlights (marketing copy per tier). Full ✓/✗ matrix in the table below.
const CARD_HIGHLIGHTS: Record<string, { lead?: string; items: string[] }> = {
    starter: { items: ["POS jual + jasa, restock, pengeluaran, modal/prive", "Inventory dasar + cetak barcode", "Nota digital, export & laporan dasar"] },
    pro: { lead: "Semua Starter +", items: ["Modul Servis + Device Passport", "Katalog online, flyer & buyback", "Akuntansi (COA, piutang/hutang, laporan keuangan)", "3 user + role & permission"] },
    business: { lead: "Semua Pro +", items: ["Multi-cabang + transfer stok", "Stock opname, QC & purchase order", "Akuntansi lanjutan (jurnal, aset tetap, closing, rekonsiliasi)", "HR & payroll, audit & approval"] },
    enterprise: { lead: "Semua Business +", items: ["Unlimited user & cabang", "API & white-label", "Dedicated support & integrasi custom"] },
};

// Full comparison, grouped by area. Row labels come from FEATURES; ✓/✗ from plan flags.
const COMPARE_GROUPS: { group: string; keys: FeatureKey[] }[] = [
    { group: "Operasional & POS", keys: ["dashboard", "pos", "shift", "invoice", "customersSuppliers", "exportReports", "basicReports"] },
    { group: "Inventory", keys: ["inventory", "barangJasa", "printBarcode", "specSummary", "agingInventory", "markdown", "bulkImport", "consignment", "devicePassport", "stockOpname", "qc", "stockTransfer", "purchaseOrder"] },
    { group: "Penjualan & Katalog", keys: ["buyback", "catalog", "flyer"] },
    { group: "Servis", keys: ["service", "technicianCommission"] },
    { group: "Akuntansi & Keuangan", keys: ["accounting", "generalJournal", "bankReconciliation", "fixedAssets", "closingPeriod"] },
    { group: "Tim, Cabang & Kontrol", keys: ["roles", "multiStore", "hr", "auditTrail", "approvals"] },
    { group: "Enterprise", keys: ["api", "whiteLabel"] },
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

                <p className="mt-6 text-center text-sm text-muted-foreground">
                    Starter bisa menagih <span className="font-medium text-foreground">jasa servis di kasir</span>; sistem <span className="font-medium text-foreground">work-order &amp; tracking</span> penuh ada di Pro.
                </p>
            </section>

            {/* Comparison table */}
            <section className="mx-auto max-w-6xl px-4 pb-16">
                <h2 className="mb-6 text-center text-2xl font-bold tracking-tight">Perbandingan lengkap</h2>
                <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full min-w-[720px] text-sm">
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
                                {plans.map((p) => (<td key={p.key} className="px-4 py-2.5 text-center">{p.maxUsers === null ? "Unlimited" : p.maxUsers}</td>))}
                            </tr>
                            <tr className="border-b border-border">
                                <td className="px-4 py-2.5 text-muted-foreground">Jumlah Cabang</td>
                                {plans.map((p) => (<td key={p.key} className="px-4 py-2.5 text-center">{p.maxStores === null ? "Unlimited" : p.maxStores}</td>))}
                            </tr>
                            {COMPARE_GROUPS.map((grp) => (
                                <Fragment key={grp.group}>
                                    <tr className="border-b border-border bg-muted/30">
                                        <td colSpan={1 + plans.length} className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{grp.group}</td>
                                    </tr>
                                    {grp.keys.map((key) => (
                                        <tr key={key} className="border-b border-border last:border-0">
                                            <td className="px-4 py-2.5 text-muted-foreground">{FEATURES[key]}</td>
                                            {plans.map((p) => (<td key={p.key} className="px-4 py-2.5"><TickCell on={p.features[key] === true} /></td>))}
                                        </tr>
                                    ))}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Add-ons */}
            <section className="mx-auto max-w-6xl px-4 pb-16">
                <div className="mb-6 text-center">
                    <h2 className="flex items-center justify-center gap-2 text-2xl font-bold tracking-tight"><Sparkles className="h-5 w-5 text-primary" /> Add-on</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Tambahkan kapan saja di paket mana pun. Ditagih terpisah.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {ADDONS.map((a) => (
                        <Card key={a.key}>
                            <CardContent className="pt-5">
                                <h3 className="font-semibold">{a.name}</h3>
                                <p className="text-sm text-muted-foreground">{a.desc}</p>
                            </CardContent>
                        </Card>
                    ))}
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
