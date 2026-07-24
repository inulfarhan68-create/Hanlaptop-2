import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, X, Store, Boxes, LineChart, ShieldCheck, ArrowRight, Sparkles, Building2, CheckCircle2, Cpu, HardDrive, MessageCircle, Globe, FileText, Zap, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DemoButton } from "@/components/marketing/DemoButton";
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
        ? <Check className="h-5 w-5 text-primary mx-auto" strokeWidth={3} />
        : <span className="block text-center text-muted-foreground/30 font-bold">—</span>;
}

export default async function ProductLandingPage() {
    const plans = await getPublicPlans();

    return (
        <main className="min-h-screen bg-background text-foreground relative overflow-hidden">

            {/* Top bar (Sticky) */}
            <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl transition-all duration-300">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
                    <span className="text-lg font-bold tracking-tight">HanLaptop <span className="text-primary">POS</span></span>
                    <nav className="flex items-center gap-2">
                        <ThemeToggle />
                        <Link href="/login"><Button variant="ghost" size="sm">Masuk</Button></Link>
                        <Link href="/register"><Button size="sm">Daftar toko</Button></Link>
                    </nav>
                </div>
            </header>

            {/* Hero Split Layout */}
            <section className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24 z-10">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
                    {/* Left: Content */}
                    <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-6 animate-in fade-in duration-700">
                            <Sparkles className="h-3 w-3" /> POS &amp; ERP toko laptop, komputer, HP
                        </div>
                        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl leading-[1.1] text-foreground animate-in fade-in duration-700 delay-150">
                            Satu aplikasi untuk seluruh <span className="text-primary">toko Anda</span>
                        </h1>
                        <p className="mt-6 text-xl text-muted-foreground font-medium max-w-2xl animate-in fade-in duration-700 delay-300">
                            Jual-beli, servis, tukar tambah, stok, dan pembukuan — terpusat, otomatis, dan aman. Dari satu toko sampai puluhan cabang.
                        </p>
                        <div className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-4 animate-in fade-in duration-700 delay-500">
                            <Link href="/register">
                                <Button size="lg" className="h-14 px-8 text-lg font-bold gap-2 hover:scale-105 transition-all duration-300 rounded-lg">
                                    Mulai sekarang <ArrowRight className="h-5 w-5" />
                                </Button>
                            </Link>
                            <DemoButton className="h-14 px-8 text-lg font-bold rounded-lg gap-2 hover:bg-muted transition-all duration-300" />
                            <Link href="#harga">
                                <Button size="lg" variant="ghost" className="h-14 px-6 text-lg font-bold rounded-lg hover:bg-muted transition-all duration-300">
                                    Lihat harga
                                </Button>
                            </Link>
                        </div>

                        <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-muted-foreground font-medium animate-in fade-in duration-700 delay-700">
                            <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Tanpa kartu kredit</div>
                            <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Setup 5 menit</div>
                            <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Coba demo tanpa daftar</div>
                        </div>
                    </div>
                    
                    {/* Right: Floating Mockup with Video Overlay */}
                    <div className="relative mx-auto w-full max-w-[500px] lg:max-w-none animate-in fade-in duration-1000 delay-500 group cursor-pointer">
                        <div className="relative rounded-xl border border-border bg-background shadow-2xl overflow-hidden transition-transform duration-1000 group-hover:-translate-y-2">
                            <Image 
                                src="/images/pos_dashboard.png" 
                                alt="Dashboard POS HanLaptop" 
                                width={800} 
                                height={600} 
                                className="w-full h-auto object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                priority
                            />
                            
                            {/* Play Button Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/5 transition-colors">
                                <div className="w-16 h-16 rounded-full bg-primary/90 text-primary-foreground shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform backdrop-blur-sm">
                                    <Play className="h-6 w-6 ml-1" fill="currentColor" />
                                </div>
                            </div>
                        </div>
                        
                        {/* Decorative background element behind image */}
                        <div className="absolute -inset-4 rounded-xl bg-primary/10 blur-2xl -z-10" />
                    </div>
                </div>
            </section>
            
            {/* Trusted By Banner */}
            <section className="border-y border-border bg-muted/30 mb-24">
                <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">Dipercaya oleh</p>
                    <div className="flex flex-wrap justify-center gap-8 md:gap-12 items-center">
                        <div className="flex items-center gap-2 font-bold text-lg"><Store className="h-5 w-5"/> Han Laptop</div>
                        <div className="flex items-center gap-2 font-bold text-lg"><Building2 className="h-5 w-5"/> Mega Komputer</div>
                        <div className="flex items-center gap-2 font-bold text-lg"><ShieldCheck className="h-5 w-5"/> FixIT Store</div>
                        <div className="flex items-center gap-2 font-bold text-lg"><Boxes className="h-5 w-5"/> Gudang IT</div>
                    </div>
                </div>
            </section>

            {/* Bento Grid Features */}
            <section className="relative mx-auto max-w-6xl px-4 pb-24 z-10">
                <div className="mb-14 text-center">
                    <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Semua fitur dalam satu ekosistem</h2>
                    <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">Sistem modular yang dirancang khusus untuk alur kerja toko retail dan servis modern.</p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:auto-rows-[300px]">
                    {/* Item 1: POS & Servis (Span 2 cols) */}
                    <div className="lg:col-span-2 relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow group">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent z-0" />
                        <div className="relative z-10 flex flex-col sm:flex-row h-full">
                            <div className="p-8 sm:w-1/2 flex flex-col justify-center">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                                    <Store className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="text-2xl font-bold mb-3">{VALUE_PROPS[0].title}</h3>
                                <p className="text-muted-foreground font-medium">{VALUE_PROPS[0].body}</p>
                            </div>
                            <div className="sm:w-1/2 relative h-48 sm:h-full overflow-hidden">
                                <Image 
                                    src="/images/pos_dashboard.png" 
                                    alt="POS Interface"
                                    width={600}
                                    height={400}
                                    className="absolute top-8 left-8 sm:top-12 sm:left-0 rounded-tl-xl shadow-2xl object-cover w-[120%] h-auto group-hover:scale-105 transition-transform duration-700"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Item 2: Stok (Span 1 col) */}
                    <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                        <div className="p-8 flex-1">
                            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-6">
                                <Boxes className="h-6 w-6 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">{VALUE_PROPS[1].title}</h3>
                            <p className="text-sm text-muted-foreground font-medium">{VALUE_PROPS[1].body}</p>
                        </div>
                        <div className="relative h-32 w-full overflow-hidden mt-auto">
                            <Image 
                                src="/images/pos_inventory.png" 
                                alt="Inventory Scanner"
                                width={400}
                                height={300}
                                className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-t-xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] w-[85%] h-auto object-cover group-hover:-translate-y-2 transition-transform duration-500"
                            />
                        </div>
                    </div>

                    {/* Item 3: Pembukuan (Span 1 col) */}
                    <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                        <div className="p-8 flex-1">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
                                <LineChart className="h-6 w-6 text-emerald-600" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">{VALUE_PROPS[2].title}</h3>
                            <p className="text-sm text-muted-foreground font-medium">{VALUE_PROPS[2].body}</p>
                        </div>
                        <div className="relative h-32 w-full overflow-hidden mt-auto">
                            <Image 
                                src="/images/pos_chart.png" 
                                alt="Accounting Chart"
                                width={400}
                                height={300}
                                className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-t-xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] w-[85%] h-auto object-cover group-hover:-translate-y-2 transition-transform duration-500"
                            />
                        </div>
                    </div>

                    {/* Item 4: Multi-cabang (Span 2 cols) */}
                    <div className="lg:col-span-2 relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow flex items-center p-8 sm:p-12">
                        <div className="w-full flex flex-col sm:flex-row items-center gap-8 text-center sm:text-left">
                            <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                                <ShieldCheck className="h-10 w-10 text-purple-600" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold mb-3">{VALUE_PROPS[3].title}</h3>
                                <p className="text-muted-foreground font-medium text-lg">{VALUE_PROPS[3].body}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonial Section */}
            <section className="mx-auto max-w-6xl px-4 pb-24 z-10">
                <div className="rounded-3xl bg-primary text-primary-foreground p-10 md:p-16 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <svg width="200" height="200" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                        </svg>
                    </div>
                    
                    <div className="relative z-10 grid md:grid-cols-5 gap-10 items-center">
                        <div className="md:col-span-3">
                            <h3 className="text-2xl md:text-3xl font-bold leading-snug mb-6">
                                "Semenjak pindah ke HanLaptop POS, saya tidak pernah lagi dipusingkan dengan stok sparepart yang hilang atau nota servis yang terselip. Semua beres dalam satu klik."
                            </h3>
                            <div className="font-bold text-lg">Budi Santoso</div>
                            <div className="text-primary-foreground/80 font-medium">Pemilik, Budi Komputer Service</div>
                        </div>
                        
                        <div className="md:col-span-2 flex flex-col gap-4">
                            <div className="flex gap-4 items-center">
                                <div className="text-4xl font-black">2.5x</div>
                                <div className="text-sm font-medium leading-tight">Kecepatan<br/>Pelayanan</div>
                            </div>
                            <div className="w-full h-px bg-primary-foreground/20" />
                            <div className="flex gap-4 items-center">
                                <div className="text-4xl font-black">100%</div>
                                <div className="text-sm font-medium leading-tight">Akurasi<br/>Stok Gudang</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing cards */}
            <section id="harga" className="relative mx-auto max-w-6xl px-4 py-24 z-10">
                <div className="mb-14 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <h2 className="text-4xl font-extrabold tracking-tight">Pilih paket yang tepat</h2>
                    <p className="mt-4 text-lg text-muted-foreground">Mulai kecil, naik paket saat toko Anda tumbuh. Tanpa biaya tersembunyi.</p>
                </div>

                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                    {plans.map((plan, i) => {
                        const popular = plan.key === POPULAR_KEY;
                        const price = priceLabel(plan);
                        const hl = CARD_HIGHLIGHTS[plan.key];
                        return (
                            <div key={plan.key} className={`animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-${300 + (i * 200)}`}>
                                <Card className={`h-full flex flex-col relative transition-all duration-300 hover:-translate-y-2 ${popular ? 'border-primary ring-2 ring-primary bg-primary/5 shadow-md' : 'premium-card hover:border-primary/30'}`}>
                                    {popular && (
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-bold tracking-wider shadow-sm">
                                            PALING POPULER
                                        </div>
                                    )}
                                    <CardHeader className="space-y-4 pb-4">
                                        <div>
                                            <h3 className="text-2xl font-bold">{plan.name}</h3>
                                            {plan.bestFor && <p className="text-sm text-muted-foreground mt-1 font-medium">{plan.bestFor}</p>}
                                        </div>
                                        <div className="pt-2">
                                            <span className="text-4xl font-black">{price.main}</span>
                                            <span className="text-sm text-muted-foreground font-medium"> {price.sub}</span>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-6 flex-1 flex flex-col">
                                        <Link href={`/register?plan=${plan.key}`} className="block w-full">
                                            <Button className={`w-full h-12 text-md font-bold rounded-lg transition-all duration-300 ${popular ? 'bg-primary hover:bg-primary/90 hover:scale-105 shadow-sm' : 'hover:bg-muted'}`} variant={popular ? "default" : "outline"}>
                                                {plan.priceMonthly === null ? "Hubungi kami" : `Pilih ${plan.name}`}
                                            </Button>
                                        </Link>
                                        
                                        <div className="flex-1 space-y-4">
                                            <ul className="space-y-2.5 text-sm font-medium">
                                                <li className="flex items-center gap-2">
                                                    <Check className="h-4 w-4 text-primary" /> {limitValue(plan.maxUsers, "user")}
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <Check className="h-4 w-4 text-primary" /> {limitValue(plan.maxStores, "cabang")}
                                                </li>
                                            </ul>
                                            {hl && (
                                                <ul className="space-y-3 border-t border-border/50 pt-5 text-sm">
                                                    {hl.lead && <li className="font-bold text-foreground">{hl.lead}</li>}
                                                    {hl.items.map((it) => (
                                                        <li key={it} className="flex items-start gap-2 text-muted-foreground font-medium">
                                                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                                            <span>{it}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        );
                    })}
                </div>

                <p className="mt-10 text-center text-sm text-muted-foreground font-medium">
                    Starter bisa menagih <span className="font-bold text-foreground">jasa servis di kasir</span>; sistem <span className="font-bold text-foreground">work-order &amp; tracking</span> penuh ada di Pro.
                </p>
            </section>

            {/* Comparison table */}
            <section className="mx-auto max-w-6xl px-4 pb-24 z-10 relative">
                <h2 className="mb-10 text-center text-3xl font-extrabold tracking-tight">Perbandingan lengkap</h2>
                <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
                    <table className="w-full min-w-[720px] text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/50">
                                <th className="px-6 py-5 text-left font-bold text-foreground uppercase tracking-wider text-xs w-[30%]">Fitur</th>
                                {plans.map((p) => (
                                    <th key={p.key} className={`px-6 py-5 text-center font-bold text-xs uppercase tracking-wider ${p.key === POPULAR_KEY ? "text-primary bg-primary/5 border-t-[3px] border-primary" : "text-foreground"}`}>{p.name}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-border/30 hover:bg-muted/20 dark:hover:bg-muted/10 transition-colors">
                                <td className="px-6 py-4 font-semibold text-foreground">Jumlah User</td>
                                {plans.map((p) => (<td key={p.key} className={`px-6 py-4 text-center font-medium ${p.key === POPULAR_KEY ? 'bg-primary/5' : ''}`}>{p.maxUsers === null ? "Unlimited" : p.maxUsers}</td>))}
                            </tr>
                            <tr className="border-b border-border/30 hover:bg-muted/20 dark:hover:bg-muted/10 transition-colors">
                                <td className="px-6 py-4 font-semibold text-foreground">Jumlah Cabang</td>
                                {plans.map((p) => (<td key={p.key} className={`px-6 py-4 text-center font-medium ${p.key === POPULAR_KEY ? 'bg-primary/5' : ''}`}>{p.maxStores === null ? "Unlimited" : p.maxStores}</td>))}
                            </tr>
                            {COMPARE_GROUPS.map((grp) => (
                                <Fragment key={grp.group}>
                                    <tr className="border-b border-border/50 bg-muted/40">
                                        <td colSpan={1 + plans.length} className="px-6 py-3 text-xs font-bold uppercase tracking-widest text-foreground">{grp.group}</td>
                                    </tr>
                                    {grp.keys.map((key) => (
                                        <tr key={key} className="border-b border-border/30 hover:bg-muted/10 transition-colors last:border-0 group">
                                            <td className="px-6 py-4 font-medium text-muted-foreground group-hover:text-foreground transition-colors">{FEATURES[key]}</td>
                                            {plans.map((p) => (<td key={p.key} className={`px-6 py-4 ${p.key === POPULAR_KEY ? 'bg-primary/5' : ''}`}><TickCell on={p.features[key] === true} /></td>))}
                                        </tr>
                                    ))}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Add-ons */}
            <section className="mx-auto max-w-6xl px-4 pb-24 z-10 relative">
                <div className="mb-10 text-center animate-in fade-in duration-700">
                    <h2 className="flex items-center justify-center gap-2 text-3xl font-extrabold tracking-tight"><Sparkles className="h-6 w-6 text-primary" /> Add-on Ekstra</h2>
                    <p className="mt-3 text-lg text-muted-foreground font-medium">Tambahkan kapan saja di paket mana pun. Ditagih terpisah.</p>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {ADDONS.map((a, i) => {
                        const isAi = a.key.startsWith('ai');
                        
                        let Icon = Zap;
                        if (a.key === 'aiSpec') Icon = Cpu;
                        else if (a.key === 'aiOcr') Icon = FileText;
                        else if (a.key === 'aiPricing') Icon = LineChart;
                        else if (a.key === 'whatsapp') Icon = MessageCircle;
                        else if (a.key === 'customDomain') Icon = Globe;
                        else if (a.key === 'storage') Icon = HardDrive;

                        return (
                            <div key={a.key} className={`animate-in fade-in duration-700 delay-${i * 100}`}>
                                <Card className={`premium-card premium-card-hover h-full relative overflow-hidden ${isAi ? 'border-primary/20 bg-primary/5' : ''}`}>
                                    {isAi && (
                                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
                                    )}
                                    <CardContent className="pt-6 relative z-10">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isAi ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-foreground'}`}>
                                                <Icon className="h-6 w-6" />
                                            </div>
                                            {isAi && (
                                                <span className="px-2.5 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-black tracking-wider flex items-center gap-1">
                                                    <Sparkles className="w-3 h-3"/> AI
                                                </span>
                                            )}
                                            {a.key === 'whatsapp' && (
                                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold tracking-wider">
                                                    POPULER
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-lg mb-2">{a.name}</h3>
                                        <p className="text-sm text-muted-foreground font-medium leading-relaxed">{a.desc}</p>
                                    </CardContent>
                                </Card>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* FAQ Section */}
            <section className="mx-auto max-w-4xl px-4 pb-24 z-10 relative">
                <div className="mb-10 text-center">
                    <h2 className="text-3xl font-extrabold tracking-tight">Pertanyaan yang Sering Diajukan</h2>
                    <p className="mt-3 text-lg text-muted-foreground font-medium">Bebaskan keraguan Anda sebelum memulai.</p>
                </div>
                
                <div className="space-y-4">
                    {[
                        { q: "Apakah data toko saya aman?", a: "Sangat aman. Setiap toko beroperasi di lingkungan terisolasi (tenant-isolation) dan dicadangkan secara harian. Hanya Anda dan staf dengan peran yang diizinkan yang dapat melihat data Anda." },
                        { q: "Apakah saya bisa memakai barcode scanner?", a: "Tentu. Sistem kami mendukung penuh barcode scanner plug-and-play standar (USB/Bluetooth), serta laci kasir (cash drawer) dan printer thermal." },
                        { q: "Apakah saya butuh kartu kredit untuk mendaftar?", a: "Tidak. Anda bisa mendaftar paket Starter atau mencoba fitur dasar tanpa memasukkan kartu kredit. Upgrade kapan saja saat toko Anda berkembang." },
                        { q: "Bagaimana cara memindahkan data stok lama saya?", a: "Anda dapat menggunakan fitur 'Import Massal' dari file Excel/CSV untuk memindahkan seluruh daftar barang dan stok dalam hitungan menit." }
                    ].map((faq, i) => (
                        <details key={i} className="group border border-border bg-card rounded-lg overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                            <summary className="flex items-center justify-between font-bold cursor-pointer p-6 hover:bg-muted/50 transition-colors">
                                {faq.q}
                                <span className="transition-transform group-open:rotate-180">
                                    <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                                </span>
                            </summary>
                            <div className="p-6 pt-0 text-muted-foreground leading-relaxed font-medium">
                                {faq.a}
                            </div>
                        </details>
                    ))}
                </div>
            </section>

            {/* Final CTA */}
            <section className="border-t border-border bg-muted/30">
                <div className="relative mx-auto max-w-6xl px-4 py-24 text-center z-10">
                    <h2 className="text-4xl font-extrabold tracking-tight text-foreground">Siap merapikan operasional toko Anda?</h2>
                    <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground font-medium">Bergabung dengan ratusan toko komputer dan servis lainnya. Daftar sekarang, kelola seluruh data secara terpusat, aman, dan terisolasi.</p>
                    <div className="mt-8 flex justify-center">
                        <Link href="/register">
                            <Button size="lg" className="h-14 px-10 text-lg font-bold gap-3 hover:scale-105 transition-all duration-300 rounded-lg bg-primary text-primary-foreground shadow-sm hover:shadow-md">
                                Daftarkan toko Anda <ArrowRight className="h-5 w-5" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            <footer className="border-t border-border">
                <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-muted-foreground">
                    © {new Date().getFullYear()} HanLaptop POS · <Link href="/" className="underline">Storefront Han Laptop</Link>
                </div>
            </footer>
            
            {/* Floating WhatsApp Widget */}
            <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-1000">
                <Link href="https://wa.me/6281234567890" target="_blank" rel="noopener noreferrer">
                    <div className="relative group">
                        {/* Ping animation behind */}
                        <div className="absolute inset-0 rounded-full bg-emerald-500 opacity-20 animate-ping" />
                        
                        <Button size="icon" className="h-14 w-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                            <MessageCircle className="h-7 w-7" />
                        </Button>
                        
                        {/* Tooltip */}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 mr-4 px-3 py-1.5 bg-foreground text-background text-sm font-bold rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                            Chat dengan Tim Sales
                        </div>
                    </div>
                </Link>
            </div>
        </main>
    );
}
