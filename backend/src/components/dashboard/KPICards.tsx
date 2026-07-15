"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Layers, Banknote, History, PlusCircle, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useTenant } from "@/components/TenantProvider";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from "recharts";

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

export function KPICards({ isOwner }: { isOwner: boolean }) {
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

  const { data: inventoryKpi } = useSWR('/api/inventory/kpi', async () => {
    const res = await apiFetch('/api/inventory/kpi');
    return res.json();
  });

  if (isLoading || !data) {
    return <div className="h-[200px] w-full bg-muted/20 rounded-xl animate-pulse"></div>;
  }

  const monthlyData = data.monthlyData || [];
  const lowStockCount = inventoryKpi?.lowStockCount || 0;
  const averageTxValue = data.totalTransactions > 0 ? Math.round(data.revenue / data.totalTransactions) : 0;

  return (
    <div className="grid gap-2 grid-cols-1 lg:grid-cols-4 animate-in fade-in">
      {/* 1. Hero Card: Net Profit + Kinerja Bisnis (Span 3) */}
      <Card className="lg:col-span-3 relative overflow-hidden flex flex-col">
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <CardContent className="p-3 md:p-6 flex-1 flex flex-col">
          <div className="flex flex-col lg:flex-row gap-3 md:gap-5 flex-1">
            {/* Left: Net Profit */}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">
                  {isOwner ? "Total Net Profit" : "Total Revenue"}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-3xl md:text-4xl font-bold tracking-tighter">
                    {formatCurrency(isOwner ? Math.round(data.netProfit || 0) : Math.round(data.revenue || 0))}
                  </span>
                  {(() => {
                    const len = monthlyData.length;
                    if (len < 2) return null;
                    const current = monthlyData[len - 1]?.totalRevenue || 0;
                    const previous = monthlyData[len - 2]?.totalRevenue || 0;
                    if (previous === 0) return (
                      <span className="inline-flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-cyan-400">
                        <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
                        Baru
                      </span>
                    );
                    const pctChange = ((current - previous) / previous) * 100;
                    const isPositive = pctChange >= 0;
                    return (
                      <span className={`inline-flex items-center gap-1.5 text-[10px] md:text-xs font-bold ${isPositive ? 'text-cyan-400' : 'text-rose-400'}`}>
                        {isPositive ? <TrendingUp className="h-3 w-3 md:h-4 md:w-4" /> : <TrendingDown className="h-3 w-3 md:h-4 md:w-4" />}
                        {isPositive ? '+' : ''}{pctChange.toFixed(1)}% vs bulan lalu
                      </span>
                    );
                  })()}
                </div>
              </div>
              {/* Compact Sparkline with XAxis */}
              <div className="w-full mt-4 flex-1 min-h-[90px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} dy={5} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '11px', padding: '6px 10px' }} formatter={(v: any) => [`Rp ${(v * 1000).toLocaleString('id-ID')}`, 'Sales']} />
                    <Area type="monotone" dataKey="sales" stroke="#06b6d4" strokeWidth={2.5} fill="url(#heroGrad)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Divider */}
            <div className="hidden lg:block w-px bg-border/40 self-stretch" />

            {/* Right: Kinerja Bisnis */}
            <div className="lg:w-60 flex flex-col justify-between">
              <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3 lg:mb-0">Kinerja Bisnis</p>
              <div className="flex-1 flex flex-col justify-between gap-1 mt-1">
                {[
                  ...(isOwner ? [{ label: 'Gross Margin', value: `${data.grossMargin}%`, badge: '▲ Sehat', color: 'text-cyan-500', bg: 'bg-cyan-500/10' }] : []),
                  { label: 'Total Transaksi', value: data.totalTransactions.toString(), badge: '▲ Aktif', color: 'text-blue-500', bg: 'bg-blue-500/10' },
                  { label: 'Rata-rata Transaksi', value: formatCurrency(averageTxValue), badge: '◉ Stabil', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                  { label: 'Peringatan Stok', value: `${lowStockCount} item`, badge: lowStockCount > 0 ? '▼ Periksa' : '◉ Aman', color: lowStockCount > 0 ? 'text-amber-500' : 'text-teal-500', bg: lowStockCount > 0 ? 'bg-amber-500/10' : 'bg-teal-500/10' },
                ].map((kpi) => (
                  <div key={kpi.label} className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5">{kpi.label}</p>
                      <p className="text-[11px] md:text-sm font-bold leading-tight">{kpi.value}</p>
                    </div>
                    <span className={`text-[9px] md:text-[10px] px-1.5 py-0.5 rounded-full font-medium ${kpi.bg} ${kpi.color}`}>{kpi.badge}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Card Desktop (Span 1) */}
      <Card className="hidden lg:flex flex-col lg:col-span-1 h-full">
        <CardHeader className="pb-2 pt-4 px-3 sm:px-5">
          <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-widest">Aksi Cepat</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-2 px-3 sm:px-5 pb-3 sm:pb-4">
          {[
            { to: "/transactions", icon: ShoppingCart, label: "Penjualan Baru", desc: "Catat pembelian pelanggan", cls: "bg-cyan-500/10 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20" },
            { to: "/transactions?mode=Pembelian", icon: PlusCircle, label: "Restock Barang", desc: "Tambah inventori baru", cls: "bg-muted/50 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-foreground border border-border" },
            { to: "/transactions?mode=Riwayat", icon: History, label: "Riwayat Transaksi", desc: "Lihat semua transaksi", cls: "bg-muted/50 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-foreground border border-border" },
          ].map(({ to, icon: Icon, label, desc, cls }) => (
            <Link
              key={label}
              href={to}
              className={`flex flex-row items-center justify-start gap-2 p-2.5 rounded-lg transition-all ${cls} whitespace-nowrap`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <div className="flex flex-col min-w-0 text-left">
                <span className="font-semibold text-xs leading-tight">{label}</span>
                <span className="text-[9px] opacity-70 mt-0.5 leading-tight">{desc}</span>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
