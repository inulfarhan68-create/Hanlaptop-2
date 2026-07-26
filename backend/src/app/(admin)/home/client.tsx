"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { 
  ShoppingCart, 
  Wrench, 
  PackagePlus, 
  CreditCard, 
  History, 
  Package, 
  BarChart3, 
  Settings,
  ArrowRight,
  ChevronRight,
  X,
  Users,
  Wallet,
  ArrowDownCircle,
  BookOpen,
  ClipboardCheck,
  ArrowLeftRight,
  Coins,
  ShieldCheck,
  ShieldQuestion,
  Truck
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Format Rupiah
const formatRp = (num: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num || 0);
};

const MAIN_FEATURES = [
  { name: "Penjualan", icon: ShoppingCart, href: "/transactions?tab=sales", color: "text-blue-500", bg: "bg-blue-500/10" },
  { name: "Manajemen Servis", icon: Wrench, href: "/services", color: "text-purple-500", bg: "bg-purple-500/10" },
  { name: "Beli Stok", icon: PackagePlus, href: "/procurement", color: "text-fuchsia-600", bg: "bg-fuchsia-600/10" },
  { name: "Pengeluaran", icon: CreditCard, href: "/transactions?tab=expenses", color: "text-rose-500", bg: "bg-rose-500/10" },
  { name: "Riwayat", icon: History, href: "/transactions", color: "text-amber-500", bg: "bg-amber-500/10" },
  { name: "Inventori", icon: Package, href: "/inventory", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { name: "Laporan", icon: BarChart3, href: "/reports", color: "text-teal-500", bg: "bg-teal-500/10" },
  { name: "Pengaturan", icon: Settings, href: "/settings", color: "text-slate-500", bg: "bg-slate-500/10" },
];

const ALL_FEATURES = [
  { name: "Pelanggan", icon: Users, href: "/customers" },
  { name: "Supplier", icon: Truck, href: "/suppliers" },
  { name: "Karyawan & Gaji", icon: Wallet, href: "/payroll" },
  { name: "Hutang", icon: ArrowDownCircle, href: "/hutang" },
  { name: "Piutang", icon: BookOpen, href: "/piutang" },
  { name: "Stok Opname", icon: ClipboardCheck, href: "/opname" },
  { name: "Transfer Stok", icon: ArrowLeftRight, href: "/transfer" },
  { name: "Rekonsiliasi Bank", icon: Coins, href: "/reconciliation" },
  { name: "Passport & Garansi", icon: ShieldCheck, href: "/passports" },
  { name: "Persetujuan", icon: ShieldQuestion, href: "/approvals" },
];

export default function HomeClient({ user }: { user: any }) {
  const router = useRouter();
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  // Fetch Dashboard API for KPIs and Recent History
  const { data, isLoading } = useSWR((process.env.NEXT_PUBLIC_API_URL || '') + '/api/dashboard');
  
  const kpi = data?.kpi || { totalAssets: 0, kasAndBank: 0, persediaan: 0, revenue: 0, netIncome: 0 };
  const recentTransactions = data?.recentTransactions || [];

  return (
    <div className="flex-1 pb-24 md:pb-8 bg-background min-h-screen">
      
      {/* HEADER & HERO CARD */}
      <div className="bg-primary pt-6 pb-20 px-4 rounded-b-[2.5rem] relative overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-black/10 blur-2xl pointer-events-none" />
        
        <div className="relative z-10">
          <p className="text-white/80 text-sm font-medium">Selamat datang,</p>
          <h1 className="text-white text-2xl font-bold mt-1 tracking-tight truncate">
            {user?.name || "Admin"}
          </h1>
        </div>
      </div>

      {/* OVERLAPPING KPI CARD */}
      <div className="px-4 -mt-16 relative z-20">
        <div className="bg-card rounded-[2rem] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-border/50">
          
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-bold text-muted-foreground tracking-wider uppercase mb-1">
                Total Aset Tersedia
              </p>
              {isLoading ? (
                <Skeleton className="h-8 w-40" />
              ) : (
                <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
                  {formatRp(kpi.totalAssets)}
                </h2>
              )}
            </div>
            
            {/* Simple static month indicator for visual similarity */}
            <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* KAS & BANK */}
            <div className="bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/20 dark:to-card p-3 rounded-2xl border border-blue-100 dark:border-blue-900/30">
              <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5 mb-1.5">
                <Wallet className="w-3 h-3 text-blue-500" />
                KAS & BANK
              </p>
              {isLoading ? <Skeleton className="h-5 w-24" /> : <p className="font-bold text-foreground">{formatRp(kpi.kasAndBank)}</p>}
            </div>
            
            {/* PERSEDIAAN */}
            <div className="bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-950/20 dark:to-card p-3 rounded-2xl border border-amber-100 dark:border-amber-900/30">
              <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5 mb-1.5">
                <Package className="w-3 h-3 text-amber-500" />
                PERSEDIAAN
              </p>
              {isLoading ? <Skeleton className="h-5 w-24" /> : <p className="font-bold text-foreground">{formatRp(kpi.persediaan)}</p>}
            </div>

            {/* PENDAPATAN */}
            <div className="bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-card p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
              <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5 mb-1.5">
                <BarChart3 className="w-3 h-3 text-emerald-500" />
                PENDAPATAN
              </p>
              {isLoading ? <Skeleton className="h-5 w-24" /> : <p className="font-bold text-emerald-600 dark:text-emerald-500">{formatRp(kpi.revenue)}</p>}
            </div>

            {/* LABA BERSIH */}
            <div className="bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-950/20 dark:to-card p-3 rounded-2xl border border-purple-100 dark:border-purple-900/30">
              <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5 mb-1.5">
                <BarChart3 className="w-3 h-3 text-purple-500" />
                LABA BERSIH
              </p>
              {isLoading ? <Skeleton className="h-5 w-24" /> : <p className="font-bold text-purple-600 dark:text-purple-500">{formatRp(kpi.netIncome)}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* MENU FITUR */}
      <div className="px-5 mt-8">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-foreground tracking-tight">Menu Fitur</h3>
          <button 
            onClick={() => setShowAllFeatures(true)}
            className="text-primary text-xs font-bold hover:underline flex items-center gap-1"
          >
            Semua Fitur <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-y-6 gap-x-2">
          {MAIN_FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <Link key={feat.name} href={feat.href} className="flex flex-col items-center gap-2 group">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300",
                  "bg-card shadow-sm border border-border group-hover:scale-105 group-active:scale-95"
                )}>
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", feat.bg)}>
                    <Icon className={cn("w-5 h-5", feat.color)} />
                  </div>
                </div>
                <span className="text-[10px] font-medium text-center text-muted-foreground group-hover:text-foreground leading-tight px-1">
                  {feat.name}
                </span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* ANALISIS CEPAT BANNER */}
      <div className="px-4 mt-8">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2rem] p-5 flex items-center justify-between shadow-lg shadow-blue-500/20 relative overflow-hidden">
          {/* Subtle background waves */}
          <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMjAwIj48cGF0aCBkPSJNMCAxMDBDMTAwIDEwMCAxNTAgMCAyMDAgMHMxMDAgMTAwIDIwMCAxMDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==')] bg-no-repeat bg-center" />
          
          <div className="relative z-10">
            <p className="text-white/80 text-[10px] font-bold uppercase tracking-wider mb-1">Analisis Cepat</p>
            <p className="text-white font-bold text-sm leading-tight max-w-[140px]">Lihat grafik performa toko</p>
          </div>
          <Link href="/dashboard" className="relative z-10 bg-white text-blue-600 hover:bg-blue-50 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm">
            Buka Statistik
          </Link>
        </div>
      </div>

      {/* RIWAYAT TERBARU */}
      <div className="px-5 mt-8 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-foreground tracking-tight">Riwayat Terbaru</h3>
          <Link href="/transactions" className="text-primary text-xs font-bold hover:underline flex items-center gap-1">
            Semua <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="bg-card rounded-2xl p-4 border border-border flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))
          ) : recentTransactions.length === 0 ? (
            <div className="text-center py-6 bg-card border border-border border-dashed rounded-2xl">
              <p className="text-xs text-muted-foreground font-medium">Belum ada riwayat transaksi.</p>
            </div>
          ) : (
            recentTransactions.map((tx: any) => {
              const isIncome = ["Penjualan", "Pemasukan", "Pelunasan"].includes(tx.transactionType);
              const isExpense = ["Pembelian", "Pengeluaran"].includes(tx.transactionType);
              const color = isIncome ? "text-emerald-500" : isExpense ? "text-rose-500" : "text-blue-500";
              const bg = isIncome ? "bg-emerald-500/10" : isExpense ? "bg-rose-500/10" : "bg-blue-500/10";
              
              return (
                <Link key={tx.id} href={`/transactions?id=${tx.id}`} className="block">
                  <div className="bg-card hover:bg-muted/50 rounded-2xl p-4 border border-border flex items-center gap-4 transition-colors">
                    <div className={cn("w-12 h-12 rounded-full flex items-center justify-center shrink-0", bg)}>
                      {isIncome ? <ShoppingCart className={cn("w-5 h-5", color)} /> : 
                       isExpense ? <CreditCard className={cn("w-5 h-5", color)} /> : 
                       <ArrowLeftRight className={cn("w-5 h-5", color)} />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-0.5">
                        <p className="font-bold text-sm text-foreground truncate">{tx.transactionType}</p>
                        <p className={cn("font-bold text-sm whitespace-nowrap ml-2", color)}>
                          {isExpense ? "-" : "+"}{formatRp(tx.totalAmount || tx.grandTotal)}
                        </p>
                      </div>
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <p className="truncate">{tx.customerName || tx.supplierName || "Umum"}</p>
                        <p className="whitespace-nowrap ml-2">
                          {new Date(tx.transactionDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* SEMUA FITUR DRAWER (Custom Bottom Sheet) */}
      <div 
        className={cn(
          "fixed inset-0 z-[100] transition-opacity duration-300",
          showAllFeatures ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAllFeatures(false)} />
        <div 
          className={cn(
            "absolute bottom-0 left-0 right-0 bg-card rounded-t-[2rem] border-t border-border shadow-2xl transition-transform duration-300 flex flex-col max-h-[85vh]",
            showAllFeatures ? "translate-y-0" : "translate-y-full"
          )}
        >
          <div className="flex justify-center pt-3 pb-2 shrink-0">
            <div className="w-12 h-1.5 bg-muted rounded-full" />
          </div>
          
          <div className="px-5 pb-4 flex justify-between items-center shrink-0">
            <h2 className="text-xl font-bold tracking-tight">Semua Fitur</h2>
            <button 
              onClick={() => setShowAllFeatures(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors text-muted-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto px-5 pb-10 space-y-2">
            {ALL_FEATURES.map((feat) => (
              <Link 
                key={feat.name} 
                href={feat.href} 
                onClick={() => setShowAllFeatures(false)}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <feat.icon className="w-5 h-5" />
                </div>
                <span className="flex-1 font-semibold text-sm">{feat.name}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
