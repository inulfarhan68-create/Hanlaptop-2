import type { Metadata } from "next";
import Link from "next/link";
import { Check, X, Store, Boxes, LineChart, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { getPublicPlans } from "@/lib/public/plans";
import { FEATURES, FEATURE_KEYS } from "@/lib/features";

export const metadata: Metadata = {
    title: "HanLaptop ERP — Software Kasir & Pembukuan untuk Toko Laptop",
    description:
        "ERP & POS lengkap untuk toko laptop: jual-beli, servis, tukar tambah, stok, dan pembukuan double-entry otomatis. Kelola satu atau banyak cabang dari satu tempat.",
};

// Prices/plans live in the DB (editable later via super-admin). Revalidate hourly
// so the pricing table reflects plan edits without a redeploy, while staying static-fast.
export const revalidate = 3600;

const VALUE_PROPS = [
    { icon: Store, title: "POS + Servis jadi satu", body: "Kasir, order servis, garansi, dan tukar tambah dalam satu alur. Nota & barcode langsung cetak." },
    { icon: Boxes, title: "Stok yang akurat", body: "Serial number, kondisi, konsinyasi, QC, dan transfer antar cabang — stok selalu cocok." },
    { icon: LineChart, title: "Pembukuan otomatis", body: "Setiap transaksi jadi jurnal double-entry. Laba-rugi, neraca, dan piutang real-time." },
    { icon: ShieldCheck, title: "Multi-cabang & peran", body: "Akses berbasis peran (owner, manager, kasir, teknisi) dengan isolasi data per cabang." },
];

function planLimitLine(label: string, value: number | null): string {
    return value === null ? `${label} tak terbatas` : `${value.toLocaleString("id-ID")} ${label}`;
}

export default async function ProductLandingPage() {
    const plans = await getPublicPlans();

    return (
        <main className="min-h-screen bg-background text-foreground">
            {/* Top bar */}
            <header className="border-b border-border">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
                    <span className="text-lg font-bold tracking-tight">HanLaptop <span className="text-primary">ERP</span></span>
                    <nav className="flex items-center gap-2">
                        <Link href="/login"><Button variant="ghost" size="sm">Masuk</Button></Link>
                        <Link href="/register"><Button size="sm">Daftar toko</Button></Link>
                    </nav>
                </div>
            </header>

            {/* Hero */}
            <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:py-24">
                <p className="mb-3 text-sm font-medium uppercase tracking-wider text-primary">ERP &amp; POS toko laptop</p>
                <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
                    Jalankan seluruh toko laptop Anda dari satu aplikasi
                </h1>
                <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
                    Jual-beli, servis, tukar tambah, stok, dan pembukuan — otomatis dan terhubung.
                    Untuk satu toko sampai banyak cabang.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    <Link href="/register"><Button size="lg" className="gap-2">Mulai gratis <ArrowRight className="h-4 w-4" /></Button></Link>
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

            {/* Pricing */}
            <section id="harga" className="mx-auto max-w-6xl px-4 py-16">
                <div className="mb-10 text-center">
                    <h2 className="text-3xl font-bold tracking-tight">Harga sederhana, per bulan</h2>
                    <p className="mt-2 text-muted-foreground">Mulai kecil, naik paket saat toko Anda tumbuh. Tanpa biaya tersembunyi.</p>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    {plans.map((plan, i) => {
                        const highlighted = i === 1; // middle tier
                        return (
                            <Card key={plan.key} className={highlighted ? "border-primary shadow-lg ring-1 ring-primary" : ""}>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-bold">{plan.name}</h3>
                                        {highlighted && (
                                            <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">Populer</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                                    <div className="pt-3">
                                        <span className="text-3xl font-extrabold">{formatCurrency(plan.priceMonthly)}</span>
                                        <span className="text-sm text-muted-foreground"> /bulan</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Link href={`/register?plan=${plan.key}`} className="block">
                                        <Button className="w-full" variant={highlighted ? "default" : "outline"}>Pilih {plan.name}</Button>
                                    </Link>
                                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                                        <li>{planLimitLine("cabang", plan.maxStores)}</li>
                                        <li>{planLimitLine("pengguna", plan.maxUsers)}</li>
                                        <li>{planLimitLine("transaksi/bulan", plan.maxTransactionsPerMonth)}</li>
                                    </ul>
                                    <ul className="space-y-1.5 border-t border-border pt-3 text-sm">
                                        {FEATURE_KEYS.map((k) => {
                                            const on = plan.features[k] === true;
                                            return (
                                                <li key={k} className={`flex items-center gap-2 ${on ? "" : "text-muted-foreground/60"}`}>
                                                    {on ? <Check className="h-4 w-4 text-primary" /> : <X className="h-4 w-4 opacity-50" />}
                                                    {FEATURES[k]}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </CardContent>
                            </Card>
                        );
                    })}
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
                    © {new Date().getFullYear()} HanLaptop ERP · <Link href="/" className="underline">Storefront Han Laptop</Link>
                </div>
            </footer>
        </main>
    );
}
