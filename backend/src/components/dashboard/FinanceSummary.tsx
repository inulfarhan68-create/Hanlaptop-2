"use client";

import useSWR from "swr";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Layers, Banknote } from "lucide-react";
import Link from "next/link";
import { useTenant } from "@/components/TenantProvider";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

const renderGrowthBadge = (value: number | string | null | undefined, isExpense: boolean = false) => {
  if (value === null || value === undefined) return null;
  if (value === "Baru") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] md:text-[10px] font-bold border text-cyan-500 bg-cyan-500/10 border-cyan-500/20 animate-in fade-in zoom-in duration-300">
        <TrendingUp className="h-2.5 w-2.5 md:h-3 md:w-3" /> Baru vs bulan lalu
      </span>
    );
  }
  const numVal = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numVal)) return null;

  const isGood = isExpense ? numVal <= 0 : numVal >= 0;
  const isZero = numVal === 0;

  let colorClass = "";
  if (isZero) {
    colorClass = "text-muted-foreground bg-muted/20 border-muted/30";
  } else if (isGood) {
    colorClass = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
  } else {
    colorClass = "text-rose-500 bg-rose-500/10 border-rose-500/20";
  }

  const Icon = numVal >= 0 ? TrendingUp : TrendingDown;
  const sign = numVal > 0 ? "+" : "";

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] md:text-[10px] font-bold border ${colorClass} animate-in fade-in zoom-in duration-300`}>
      {!isZero && <Icon className="h-2.5 w-2.5 md:h-3 md:w-3" />}
      {sign}{numVal}% vs bulan lalu
    </span>
  );
};

export function FinanceSummary({ isOwner }: { isOwner: boolean }) {
  const { activeStore } = useTenant();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  const { data, isLoading } = useSWR(
    ["dashboard", activeStore?.id, from, to],
    async () => {
      const q = new URLSearchParams();
      if (from) q.append("from", from);
      if (to) q.append("to", to);
      const res = await apiFetch(`/api/dashboard?${q.toString()}`);
      return res.json();
    }
  );

  if (!isOwner) return null;
  if (isLoading || !data) return <div className="h-[200px] w-full bg-muted/20 rounded-xl animate-pulse"></div>;

  return (
    <div className="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 animate-in fade-in">
      {/* 1. Top Left: Total Aset */}
      <Card className="lg:col-span-2 rounded-xl border border-teal-200/50 dark:border-border bg-gradient-to-br from-teal-50/80 to-cyan-50/80 dark:from-card dark:to-card dark:bg-card backdrop-blur-xl text-black dark:text-white shadow-md overflow-hidden relative flex flex-col justify-between min-h-[120px] ">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="p-3 md:p-4 relative z-10 flex-1 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="p-1 bg-cyan-500/20 rounded-md text-cyan-600 dark:text-cyan-400 shrink-0">
                <Layers className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </div>
              <span className="font-medium text-xs uppercase tracking-wider">Aset Bersih (Net Asset)</span>
            </div>
            {data.totalAssets > 0 && (
              <span className="bg-background/40 px-2 py-0.5 rounded-full text-[10px] font-semibold shadow-sm flex items-center gap-1 border border-border/50 text-foreground">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                ROA: {((data.netProfit / data.totalAssets) * 100).toFixed(1)}%
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl lg:text-3xl font-bold tracking-tight drop-shadow-sm text-black dark:text-white">
              {formatCurrency(Math.round(data.totalAssets - (data.liabilities || 0)))}
            </span>
            {renderGrowthBadge(data.growth?.assets)}
          </div>
          <p className="text-xs mt-1 opacity-70">Aset Kotor: {formatCurrency(Math.round(data.totalAssets))}</p>
          
          {/* Asset Composition Mini Bar */}
          {data.totalAssets > 0 && (
            <div className="w-full h-1 bg-muted rounded-full mt-2 flex overflow-hidden opacity-80">
              <div className="h-full bg-cyan-400" style={{ width: `${(data.kasLiquid / data.totalAssets) * 100}%` }} title="Kas Liquid" />
              <div className="h-full bg-blue-500" style={{ width: `${(data.piutang / data.totalAssets) * 100}%` }} title="Piutang" />
              <div className="h-full bg-teal-400" style={{ width: `${((data.inventoryStats?.totalValue ?? 0) / data.totalAssets) * 100}%` }} title="Stok Barang" />
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-2 mb-3 mx-3 relative z-10 flex-1 content-end">
          <div className="bg-white/90 dark:bg-black/40 rounded-xl p-2.5 border border-white/60 dark:border-white/10 shadow-sm flex flex-col">
            <span className="flex items-center gap-1.5 text-[9px] md:text-[10px] uppercase tracking-wider mb-0.5 opacity-80">
              <div className="w-2 h-2 rounded-full bg-cyan-400" /> Kas Liquid
            </span>
            <span className="font-bold text-xs md:text-sm truncate">{formatCurrency(Math.round(data.kasLiquid ?? 0))}</span>
          </div>
          <div className="bg-white/90 dark:bg-black/40 rounded-xl p-2.5 border border-white/60 dark:border-white/10 shadow-sm flex flex-col">
            <span className="flex items-center gap-1.5 text-[9px] md:text-[10px] uppercase tracking-wider mb-0.5 opacity-80">
              <div className="w-2 h-2 rounded-full bg-teal-400" /> Stok Barang
            </span>
            <span className="font-bold text-xs md:text-sm truncate">{formatCurrency(Math.round(data.inventoryStats?.totalValue ?? 0))}</span>
          </div>
          <div className="bg-white/90 dark:bg-black/40 rounded-xl p-2.5 border border-white/60 dark:border-white/10 shadow-sm flex flex-col">
            <span className="flex items-center gap-1.5 text-[9px] md:text-[10px] uppercase tracking-wider mb-0.5 opacity-80">
              <div className="w-2 h-2 rounded-full bg-blue-500" /> Piutang
            </span>
            <span className="font-bold text-xs md:text-sm truncate">{formatCurrency(Math.round(data.piutang ?? 0))}</span>
          </div>
          <div className="bg-white/90 dark:bg-black/40 rounded-xl p-2.5 border border-white/60 dark:border-white/10 shadow-sm flex flex-col">
            <span className="flex items-center gap-1.5 text-[9px] md:text-[10px] uppercase tracking-wider mb-0.5 opacity-80">
              <div className="w-2 h-2 rounded-full bg-rose-500" /> Utang
            </span>
            <span className="font-bold text-xs md:text-sm truncate text-rose-500">{formatCurrency(Math.round(data.liabilities ?? 0))}</span>
          </div>
        </div>
      </Card>

      {/* 2. Arus Kas & Margin (Span 2) */}
      <Card className="lg:col-span-2 rounded-xl border border-cyan-200/50 dark:border-border bg-gradient-to-br from-cyan-50/80 to-blue-50/80 dark:from-card dark:to-card dark:bg-card backdrop-blur-xl text-black dark:text-white shadow-md overflow-hidden relative flex flex-col justify-between min-h-[140px] ">
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-24 h-24 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="p-3 md:p-4 flex-1 flex flex-col relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm md:text-base tracking-wide">Arus Kas</span>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-[10px] md:text-xs px-3 rounded-full" asChild>
              <Link href="/reports">Laporan</Link>
            </Button>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center text-center mt-1 mb-3 w-full">
            <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center justify-center gap-1.5 opacity-80 w-full">
               <Banknote className="h-3.5 w-3.5 text-cyan-500" /> Total Revenue
            </span>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 w-full justify-items-center mb-1">
              <div />
              <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-black dark:text-white">
                {formatCurrency(Math.round(data.revenue || 0))}
              </h3>
              <div className="justify-self-start">
                {renderGrowthBadge(data.growth?.revenue)}
              </div>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 w-full justify-items-center">
              <div />
              <div className="text-xs md:text-sm font-medium opacity-80">
                Net Profit: <span className="font-bold">{formatCurrency(Math.round(data.netProfit || 0))}</span>
              </div>
              <div className="justify-self-start">
                {renderGrowthBadge(data.growth?.netProfit)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 p-3 rounded-xl border border-white/60 dark:border-white/10 bg-white/80 dark:bg-black/40 shadow-sm mb-3">
            <div className="flex flex-col border-r border-gray-200 dark:border-white/10 pr-2">
              <span className="text-[10px] md:text-xs text-muted-foreground font-medium mb-0.5">COGS (HPP)</span>
              <span className="text-xs md:text-sm font-bold truncate">{formatCurrency(Math.round(data.cogs || 0))}</span>
            </div>
            <div className="flex flex-col border-r border-gray-200 dark:border-white/10 px-2">
              <span className="text-[10px] md:text-xs text-muted-foreground font-medium mb-0.5">Beban (Opex)</span>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-xs md:text-sm font-bold truncate">{formatCurrency(Math.round(data.expenses || 0))}</span>
                {data.growth?.expenses !== undefined && data.growth?.expenses !== null && (
                  <span className={`text-[9px] font-bold ${
                    data.growth.expenses === "Baru" 
                      ? 'text-cyan-500' 
                      : (data.growth.expenses <= 0 ? 'text-emerald-500' : 'text-rose-500')
                  }`}>
                    {data.growth.expenses === "Baru" 
                      ? 'Baru' 
                      : `${data.growth.expenses > 0 ? '+' : ''}${data.growth.expenses}%`}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col pl-2">
              <span className="text-[10px] md:text-xs text-muted-foreground font-medium mb-0.5">Gross Profit</span>
              <span className="text-xs md:text-sm font-bold text-cyan-500 truncate">{formatCurrency(Math.round((data.revenue || 0) - (data.cogs || 0)))}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
