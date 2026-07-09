import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { DollarSign, Package, TrendingUp, TrendingDown, ShoppingCart, AlertCircle, ArrowRight, Banknote, Layers, History, PlusCircle, Tag } from "lucide-react"
import useSWR from "swr"

interface OverviewTabProps {
  data: any;
  inventoryStats?: {
    laptop: { qty: number; value: number };
    sparepart: { qty: number; value: number };
    aksesoris: { qty: number; value: number };
    total: { qty: number; value: number };
  };
  inventoryKpi?: any;
  isOwner: boolean;
  formatCurrency: (value: number) => string;
}

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

export function OverviewTab({ data, inventoryStats, inventoryKpi, isOwner, formatCurrency }: OverviewTabProps) {
  const monthlyData = data.monthlyData || []
  const recentTransactions = data.recentTransactions || []

  // Get low stock count from KPI data (no need to fetch all items)
  const lowStockCount = inventoryKpi?.lowStockCount || 0;

  // Use aggregated inventory stats from KPI API
  const stats = inventoryStats || data.inventoryStats || {
    laptop: { qty: 0, value: 0 },
    sparepart: { qty: 0, value: 0 },
    aksesoris: { qty: 0, value: 0 },
    total: { qty: 0, value: 0 }
  }

  const averageTxValue = data.totalTransactions > 0 ? Math.round(data.revenue / data.totalTransactions) : 0;

  const { data: markdownRecommendations } = useSWR(isOwner ? (import.meta.env.VITE_API_URL || '') + '/api/inventory/markdown-recommendations' : null)

  return (
    <div className="flex flex-col gap-2 animate-in fade-in">
      {/* Top Row: Responsive Grid 3/1 */}
      <div className="order-3 lg:order-1 grid gap-2 grid-cols-1 lg:grid-cols-4">
        
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
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '11px', padding: '6px 10px' }} formatter={(v) => [`${v}k`, 'Sales']} />
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

        {/* 3. Quick Actions Card Desktop (Span 1) */}
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
                to={to}
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

      <div className="order-1 lg:order-2 grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {isOwner && (
          <>
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
                    <span className="bg-background/40 px-2 py-0.5 rounded-full text-[10px] font-semibold  shadow-sm flex items-center gap-1 border border-border/50 text-foreground">
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
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm md:text-base tracking-wide">Arus Kas</span>
                  </div>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] md:text-xs px-3 rounded-full" asChild>
                    <Link to="/reports">Laporan</Link>
                  </Button>
                </div>
                
                {/* Center Main Value */}
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

                {/* Separated Values Box */}
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
          </>
        )}
      </div>

      {/* Quick Actions Mobile */}
      <div className="order-2 lg:hidden">
        <Card className="flex flex-col h-full">
          <CardHeader className="pb-2 pt-4 px-3 sm:px-5">
            <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-widest">Aksi Cepat</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-row gap-2 px-3 sm:px-5 pb-3 sm:pb-4 overflow-x-auto scrollbar-none">
            {[
              { to: "/transactions", icon: ShoppingCart, label: "Penjualan Baru", desc: "Catat pembelian pelanggan", cls: "bg-cyan-500/10 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20" },
              { to: "/transactions?mode=Pembelian", icon: PlusCircle, label: "Restock Barang", desc: "Tambah inventori baru", cls: "bg-muted/50 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-foreground border border-border" },
              { to: "/transactions?mode=Riwayat", icon: History, label: "Riwayat Transaksi", desc: "Lihat semua transaksi", cls: "bg-muted/50 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-foreground border border-border" },
            ].map(({ to, icon: Icon, label, desc, cls }) => (
              <Link
                key={label}
                to={to}
                className={`flex-1 flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-2 min-w-[80px] p-2 md:p-2.5 rounded-lg transition-all ${cls} whitespace-nowrap`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <div className="flex flex-col min-w-0 text-center md:text-left">
                  <span className="font-semibold text-[9px] md:text-xs leading-tight">{label}</span>
                  <span className="text-[9px] opacity-70 mt-0.5 leading-tight hidden lg:block">{desc}</span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="order-4 grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Active Inventory Summary Card */}
        {data.inventoryStats && (
          <Card className="hover:border-primary/30 transition-colors lg:col-span-2">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  Active Inventory
                </CardTitle>
                <CardDescription>Ringkasan stok barang saat ini</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild><Link to="/inventory">Lihat Semua</Link></Button>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "Laptop", qty: data.inventoryStats.laptopQty, value: Math.round(data.inventoryStats.laptopValue || 0), color: "text-sky-500", bg: "bg-sky-500/10" },
                  { label: "Sparepart", qty: data.inventoryStats.spareQty, value: Math.round(data.inventoryStats.spareValue || 0), color: "text-cyan-500", bg: "bg-cyan-500/10" },
                  { label: "Aksesoris", qty: data.inventoryStats.aksesorisQty, value: Math.round(data.inventoryStats.aksesorisValue || 0), color: "text-blue-500", bg: "bg-blue-500/10" },
                  { label: "Total Stok", qty: data.inventoryStats.totalQty, value: Math.round(data.inventoryStats.totalValue || 0), color: "text-teal-500", bg: "bg-teal-500/10" },
                ].map((stat) => (
                  <div key={stat.label} className={`rounded-xl p-3 ${stat.bg}`}>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${stat.color} mb-1`}>{stat.label}</p>
                    {stat.qty !== null && <p className="text-xl font-bold">{stat.qty} <span className="text-xs font-normal text-muted-foreground">unit</span></p>}
                    <p className="text-[11px] font-semibold text-muted-foreground truncate">{formatCurrency(stat.value)}</p>
                  </div>
                ))}
              </div>
              
              {/* Inventory Composition Bar */}
              {data.inventoryStats.totalQty > 0 && (
                <div className="pt-1">
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-muted-foreground">Komposisi Inventori (Unit)</span>
                  </div>
                  <div className="h-2 w-full rounded-full flex overflow-hidden">
                    <div 
                      className="bg-sky-500 h-full" 
                      style={{ width: `${(data.inventoryStats.laptopQty / data.inventoryStats.totalQty) * 100}%` }}
                      title={`Laptop: ${data.inventoryStats.laptopQty}`}
                    />
                    <div 
                      className="bg-cyan-500 h-full" 
                      style={{ width: `${(data.inventoryStats.spareQty / data.inventoryStats.totalQty) * 100}%` }}
                      title={`Sparepart: ${data.inventoryStats.spareQty}`}
                    />
                    <div 
                      className="bg-blue-500 h-full" 
                      style={{ width: `${(data.inventoryStats.aksesorisQty / data.inventoryStats.totalQty) * 100}%` }}
                      title={`Aksesoris: ${data.inventoryStats.aksesorisQty}`}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
                    <span>{Math.round((data.inventoryStats.laptopQty / data.inventoryStats.totalQty) * 100)}% Lptp</span>
                    <span>{Math.round((data.inventoryStats.spareQty / data.inventoryStats.totalQty) * 100)}% Sprpt</span>
                    <span>{Math.round((data.inventoryStats.aksesorisQty / data.inventoryStats.totalQty) * 100)}% Aksrs</span>
                  </div>
                </div>
              )}

              {/* Top Asset Items - Removed for pagination optimization (was fetching all inventory) */}
              {false && (
                <div className="pt-2 border-t border-border/50 mt-2">
                  <div className="flex justify-between text-xs font-medium mb-2">
                    <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Aset Terbesar</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Low Stock Alerts */}
        <Card className="border-destructive/20 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              Low Stock Alerts
            </CardTitle>
            <CardDescription>Items needing restock</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {lowStockCount === 0 ? (
              <div className="flex h-[80px] items-center justify-center text-muted-foreground text-sm text-center">
                Stok masih aman
              </div>
            ) : (
              <div className="flex flex-col gap-1 p-2 bg-card rounded-lg border shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-medium text-sm">{lowStockCount} item memerlukan restok</h4>
                    <p className="text-[10px] text-muted-foreground">Total item dengan stok di bawah minimum</p>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] rounded-full font-bold shrink-0 bg-destructive text-destructive-foreground">
                    {lowStockCount} left
                  </span>
                </div>
                <Button variant="outline" size="sm" className="w-full text-[10px] h-6 border-dashed hover:bg-primary hover:text-primary-foreground hover:border-solid transition-colors" asChild>
                  <Link to="/inventory">Lihat Inventory</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Markdown Liquidator */}
        {isOwner && (
          <Card className="border-amber-500/20 lg:col-span-2 bg-amber-50/30 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-amber-600 dark:text-amber-500">
                <Tag className="h-4 w-4" />
                Rekomendasi Diskon
              </CardTitle>
              <CardDescription>Stok lama (&gt;90 hari) perlu didiskon</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {!markdownRecommendations || markdownRecommendations.length === 0 ? (
                <div className="flex h-[80px] items-center justify-center text-muted-foreground text-sm text-center">
                  Tidak ada stok usang
                </div>
              ) : (
                markdownRecommendations.slice(0, 3).map((item: any) => (
                  <div key={item.id} className="flex flex-col gap-1 p-2 bg-white dark:bg-black/40 rounded-lg border shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-medium text-sm truncate">{item.itemName}</h4>
                        <p className="text-[10px] text-muted-foreground font-semibold text-rose-500">Usia: {item.daysInStock} Hari</p>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] rounded-full font-bold shrink-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                        Saran: -{item.suggestedDiscountPercent}%
                      </span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full text-[10px] h-6 border-dashed hover:bg-amber-500 hover:text-white hover:border-solid transition-colors" asChild>
                      <Link to="/inventory">Terapkan Diskon</Link>
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="order-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-0.5">
              <CardTitle className="text-base">Recent Transactions</CardTitle>
              <CardDescription>5 transaksi terakhir</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
              <Link to="/transactions?mode=Riwayat" className="flex items-center gap-1">View All <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Tanggal</TableHead>
                  <TableHead>Pelanggan / Ket.</TableHead>
                  <TableHead className="w-[130px]">Tipe</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead className="text-right w-[160px]">Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map((trx: any) => {
                  const isIncome = ["Penjualan", "Jasa Servis", "Modal Baru"].includes(trx.transactionType)
                  const isNeutral = ["Pembelian Stok"].includes(trx.transactionType)
                  const dp = Math.round(trx.dpAmount || 0);
                  const sisa = Math.round(trx.amount - dp);
                  const isBelumLunas = trx.paymentStatus === "Belum Lunas";
                  const roundedAmount = Math.round(trx.amount || 0);

                  return (
                    <TableRow key={trx.id}>
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{new Date(trx.transactionDate).toLocaleDateString('id-ID')}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">{trx.customerName || trx.description || '-'}</TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                          isIncome
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : isNeutral
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-destructive/10 text-destructive'
                        }`}>
                          {trx.transactionType}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span>{trx.paymentMethod || '-'}</span>
                          {isBelumLunas && (
                            <span className="inline-flex px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[9px] font-bold uppercase tracking-wider">
                              Belum Lunas
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className={`font-semibold tabular-nums ${
                          isIncome ? 'text-emerald-600 dark:text-emerald-400' :
                          isNeutral ? 'text-blue-600 dark:text-blue-400' :
                          'text-destructive'
                        }`}>
                          {isIncome ? '+' : isNeutral ? '' : '-'}{formatCurrency(roundedAmount)}
                        </div>
                        {isBelumLunas && (
                          <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-end gap-2 border-t border-border/40 pt-0.5">
                            <span>DP: {formatCurrency(dp)}</span>
                            <span className="text-destructive font-semibold">Sisa: {formatCurrency(sisa)}</span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
