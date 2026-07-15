"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, Calculator, Percent, BarChart3, Layers } from "lucide-react";
import { useTenant } from "@/components/TenantProvider";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import dynamic from "next/dynamic";

// Dynamic import for recharts components to avoid SSR hydration mismatch
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false });
const AreaChart = dynamic(() => import('recharts').then(mod => mod.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then(mod => mod.Area), { ssr: false });
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false });

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

export function AnalyticsTab() {
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

  if (isLoading || !data) {
    return <div className="h-[400px] w-full bg-muted/20 rounded-xl animate-pulse"></div>;
  }

  const monthlyData = data.monthlyData || [];
  const brandSalesData = data.brandSalesData || [];
  const topSellingProducts = data?.topSellingProducts || [];
  const averageTxValue = data.totalTransactions > 0 ? Math.round(data.revenue / data.totalTransactions) : 0;

  const brandColors = [
    "hsl(var(--primary))", "#8b5cf6", "#10b981", "#f59e0b",
    "#ef4444", "#0ea5e9", "#f43f5e", "#64748b"
  ];

  const brandSalesChartData = brandSalesData.map((b: any, i: number) => ({
    name: b.name,
    value: b.value,
    color: brandColors[i % brandColors.length]
  }));

  const profitLossData = [
    { label: "Pendapatan Total", value: Math.round(data.revenue || 0), type: "income" },
    { label: "HPP / COGS", value: -Math.round(data.cogs || 0), type: "expense" },
    { label: "Biaya Operasional", value: -Math.round(data.expenses || 0), type: "expense" },
    { label: "Laba Bersih", value: Math.round(data.netProfit || 0), type: "net" },
  ];

  const revenueData = [
    { name: "Laptop Bekas", value: Math.round(data.revenueDetails?.laptop || 0), color: "hsl(189 94% 43%)" },
    { name: "Sparepart", value: Math.round(data.revenueDetails?.sparepart || 0), color: "hsl(199 89% 48%)" },
    { name: "Aksesoris", value: Math.round(data.revenueDetails?.aksesoris || 0), color: "hsl(221 83% 53%)" },
    { name: "Jasa Servis", value: Math.round(data.revenueDetails?.servis || 0), color: "hsl(173 80% 40%)" },
  ];

  const opexColors = ["hsl(189 94% 43%)", "hsl(199 89% 48%)", "hsl(210 100% 60%)", "hsl(221 83% 53%)", "hsl(173 80% 40%)", "hsl(200 40% 50%)"];

  const opexData = Object.entries(data.opexDetails || {})
    .map(([name, value], index) => {
      return {
        name,
        value: Math.round(value as number),
        color: opexColors[index % opexColors.length]
      };
    })
    .filter(item => item.value > 0);

  return (
    <div className="space-y-2 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="h-4 w-4 md:h-5 md:w-5 text-cyan-500" />
        <h2 className="text-base md:text-xl font-bold tracking-tight">Business Insights & Analytics</h2>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-3 mb-3 md:mb-4">
        <Card className="hover:border-primary/30 transition-colors h-full">
          <CardContent className="p-3 md:p-4 flex items-center justify-between gap-2 md:gap-4 h-full">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-primary/10 rounded-md shrink-0">
                  <Calculator className="h-3.5 w-3.5 text-primary" />
                </div>
                <CardTitle className="text-[11px] md:text-xs font-medium text-muted-foreground truncate">Average Transaction</CardTitle>
              </div>
              <div className="text-lg md:text-2xl font-bold tracking-tight truncate">{formatCurrency(averageTxValue)}</div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 pl-3 border-l border-border/50 shrink-0">
              <div className="flex flex-col">
                <span className="text-[10px] md:text-[11px] text-muted-foreground uppercase font-medium">Laptop</span>
                <span className="text-xs md:text-sm font-bold">{formatCurrency(data.totalTransactions > 0 ? Math.round((data.revenueDetails?.laptop || 0) / data.totalTransactions) : 0)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] md:text-[11px] text-muted-foreground uppercase font-medium">Sprpart</span>
                <span className="text-xs md:text-sm font-bold">{formatCurrency(data.totalTransactions > 0 ? Math.round((data.revenueDetails?.sparepart || 0) / data.totalTransactions) : 0)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] md:text-[11px] text-muted-foreground uppercase font-medium">Aksrsis</span>
                <span className="text-xs md:text-sm font-bold">{formatCurrency(data.totalTransactions > 0 ? Math.round((data.revenueDetails?.aksesoris || 0) / data.totalTransactions) : 0)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] md:text-[11px] text-muted-foreground uppercase font-medium">Servis</span>
                <span className="text-xs md:text-sm font-bold">{formatCurrency(data.totalTransactions > 0 ? Math.round((data.revenueDetails?.servis || 0) / data.totalTransactions) : 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-3 gap-1.5 md:gap-2 h-full">
          <Card className="bg-gradient-to-br from-cyan-500/10 to-transparent border-cyan-500/20 h-full">
            <CardContent className="p-1.5 md:p-2 flex flex-col items-center justify-center text-center h-full">
              <p className="text-[7px] md:text-[8px] font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-0.5">Net Margin</p>
              <div className="flex flex-col items-center justify-center flex-1">
                <p className="text-base md:text-lg font-bold leading-tight">{data.revenue > 0 ? ((data.netProfit / data.revenue) * 100).toFixed(1) : "0.0"}%</p>
                <p className="text-[8px] md:text-[10px] font-semibold text-cyan-700 dark:text-cyan-400">{formatCurrency(Math.round(data.netProfit || 0))}</p>
              </div>
              <span className="text-[6px] md:text-[8px] text-muted-foreground font-medium mt-1">Ideal &gt;15%</span>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-rose-500/10 to-transparent border-rose-500/20 h-full">
            <CardContent className="p-1.5 md:p-2 flex flex-col items-center justify-center text-center h-full">
              <p className="text-[7px] md:text-[8px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-0.5">Piutang</p>
              <div className="flex flex-col items-center justify-center flex-1">
                <p className="text-base md:text-lg font-bold leading-tight">{data.revenue > 0 ? ((data.piutang / data.revenue) * 100).toFixed(1) : "0.0"}%</p>
                <p className="text-[8px] md:text-[10px] font-semibold text-rose-700 dark:text-rose-400">{formatCurrency(Math.round(data.piutang || 0))}</p>
              </div>
              <span className="text-[6px] md:text-[8px] text-muted-foreground font-medium mt-1">Ideal &lt;10%</span>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20 h-full">
            <CardContent className="p-1.5 md:p-2 flex flex-col items-center justify-center text-center h-full">
              <p className="text-[7px] md:text-[8px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-0.5">Opex</p>
              <div className="flex flex-col items-center justify-center flex-1">
                <p className="text-base md:text-lg font-bold leading-tight">{data.revenue > 0 ? ((data.expenses / data.revenue) * 100).toFixed(1) : "0.0"}%</p>
                <p className="text-[8px] md:text-[10px] font-semibold text-amber-700 dark:text-amber-400">{formatCurrency(Math.round(data.expenses || 0))}</p>
              </div>
              <span className="text-[6px] md:text-[8px] text-muted-foreground font-medium mt-1">Ideal &lt;30%</span>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        <Card className="flex flex-col h-full">
          <CardHeader className="pb-2 shrink-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-500" /> Komposisi Pendapatan
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {revenueData.length > 0 ? (
              <div className="flex flex-col flex-1 w-full min-h-[220px]">
                <div className="flex-1 w-full min-h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={revenueData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={2} dataKey="value">
                        {revenueData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatCurrency(Math.round(value))} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-2 px-2 pb-1 shrink-0">
                  {revenueData.map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                      <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Tidak ada data pendapatan</div>
            )}
          </CardContent>
        </Card>
        
        <Card className="flex flex-col h-full">
          <CardHeader className="pb-2 shrink-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-500" /> Distribusi Beban Operasional
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {opexData.length > 0 ? (
              <div className="flex flex-col flex-1 w-full min-h-[220px]">
                <div className="flex-1 w-full min-h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={opexData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={2} dataKey="value">
                        {opexData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatCurrency(Math.round(value))} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-2 px-2 pb-1 shrink-0">
                  {opexData.map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                      <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Tidak ada data beban operasional</div>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col h-full">
          <CardHeader className="pb-2 shrink-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-500" /> Gross Margin
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="flex-1 w-full min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyMarginData || []} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: 'hsl(var(--muted) / 0.5)'}} formatter={(value: any) => formatCurrency(Math.round(value))} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="laptop" name="Laptop" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sparepart" name="Sparepart" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="aksesoris" name="Aksesoris" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="servis" name="Servis" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">Revenue Overview</CardTitle>
            <CardDescription>Perbandingan bulanan Sales vs Service</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}k`} />
                  <Tooltip cursor={{fill: 'hsl(var(--muted) / 0.5)'}} contentStyle={{backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px', fontSize: '12px'}} formatter={(v: any) => formatCurrency(Math.round(v * 1000))} />
                  <Bar dataKey="sales" name="Sales" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="service" name="Service" fill="hsl(var(--primary) / 0.4)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Cash Flow Trend</CardTitle>
            <CardDescription>Perbandingan Income vs Expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}k`} />
                  <Tooltip contentStyle={{backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px', fontSize: '12px'}} formatter={(v: any) => formatCurrency(Math.round(v * 1000))} />
                  <Line type="monotone" dataKey="totalRevenue" name="Total Income" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--card))' }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="expense" name="Expense" stroke="#94a3b8" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--card))' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Top Selling Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topSellingProducts.map((product: any, i: number) => (
                <div key={product.name} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5 text-center shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.sold} unit terjual</p>
                  </div>
                  <span className="text-sm font-semibold shrink-0">{formatCurrency(Math.round(product.revenue || 0))}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Percent className="h-4 w-4 text-primary" /> Penjualan per Merek
            </CardTitle>
          </CardHeader>
          <CardContent>
            {brandSalesChartData.length > 0 ? (
              <>
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={brandSalesChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value" stroke="none">
                        {brandSalesChartData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px', fontSize: '12px'}} formatter={(v) => [`${v} Unit`, 'Terjual']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
                  {brandSalesChartData.map((brand: any) => (
                    <div key={brand.name} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: brand.color }} />
                      <span className="text-xs text-muted-foreground truncate">{brand.name}</span>
                      <span className="text-xs font-semibold ml-auto">{brand.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex h-[180px] items-center justify-center text-muted-foreground text-sm text-center">Belum ada data</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Profit & Loss
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {profitLossData.map((row) => (
                <div key={row.label} className={`flex items-center justify-between py-1.5 ${row.type === 'net' ? 'border-t pt-3 mt-1' : ''}`}>
                  <span className={`text-sm ${row.type === 'net' ? 'font-bold' : 'text-muted-foreground'}`}>{row.label}</span>
                  <span className={`text-sm font-semibold tabular-nums ${
                    row.type === 'income' ? 'text-primary' :
                    row.type === 'expense' ? 'text-destructive' :
                    'text-foreground'
                  }`}>
                    {formatCurrency(row.value)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
