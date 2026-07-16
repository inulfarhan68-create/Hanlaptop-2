"use client";

import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { BarChart3, Users, Award, TrendingUp } from "lucide-react"

interface SalesAnalysisTabProps {
  fmt: (v: number) => string;
}

export function SalesAnalysisTab({ fmt }: SalesAnalysisTabProps) {
  const { data: analyticsData, error: analyticsError, isLoading: analyticsLoading } = useSWR<any>(
    `/api/reports/analytics`, 
    { keepPreviousData: true }
  )

  if (analyticsLoading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (analyticsError || !analyticsData) {
    return (
      <div className="text-center p-8 bg-destructive/10 border border-destructive/20 rounded-xl">
        <p className="text-destructive font-bold">Gagal memuat analisis penjualan</p>
        <p className="text-muted-foreground text-sm">{analyticsError?.message || "Terjadi kesalahan"}</p>
      </div>
    )
  }

  // Calculate total omzet with Math.round
  const totalOmzet = Math.round(
    analyticsData.monthlyComparison?.reduce((acc: number, curr: any) => acc + (curr.sales || 0), 0) || 0
  )

  return (
    <div className="space-y-6 print:hidden">
      {/* Summary KPIs */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 animate-in fade-in duration-300">
        <Card className="border border-border/50 bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-xl shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-none">Total Omzet Penjualan</p>
              <p className="text-lg md:text-xl font-black text-primary mt-1.5">
                {fmt(totalOmzet)}
              </p>
              <p className="text-[9px] text-muted-foreground mt-0.5">Penjualan kotor 6 bulan terakhir</p>
            </div>
            <div className="bg-primary/10 p-2.5 rounded-xl">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-border/50 bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-xl shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-none">Kasir Teraktif</p>
              <p className="text-sm md:text-base font-black text-foreground mt-2 truncate max-w-[150px]" title={analyticsData.cashierSales?.[0]?.userName}>
                {analyticsData.cashierSales?.[0]?.userName || "Belum Ada"}
              </p>
              <p className="text-[9px] text-muted-foreground mt-0.5">
                {analyticsData.cashierSales?.[0] 
                  ? `${analyticsData.cashierSales[0].transactionCount} transaksi (${fmt(Math.round(analyticsData.cashierSales[0].totalSales))})` 
                  : "0 transaksi"}
              </p>
            </div>
            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2.5 rounded-xl">
              <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-xl shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-none">Top Pelanggan</p>
              <p className="text-sm md:text-base font-black text-foreground mt-2 truncate max-w-[150px]" title={analyticsData.topCustomers?.[0]?.customerName}>
                {analyticsData.topCustomers?.[0]?.customerName || "Belum Ada"}
              </p>
              <p className="text-[9px] text-muted-foreground mt-0.5">
                {analyticsData.topCustomers?.[0] 
                  ? `Belanja: ${fmt(Math.round(analyticsData.topCustomers[0].totalSpent))} (${analyticsData.topCustomers[0].transactionCount}x)` 
                  : "Rp 0"}
              </p>
            </div>
            <div className="bg-amber-100 dark:bg-amber-900/30 p-2.5 rounded-xl">
              <Award className="h-5 w-5 text-amber-600 dark:text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly sales comparison chart */}
      <Card className="border border-border/50 bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-xl shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm md:text-base font-bold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Grafik Perbandingan Penjualan & Profit (6 Bulan Terakhir)
          </CardTitle>
          <CardDescription className="text-[11px] mt-0.5">Membandingkan total penjualan, HPP (beban pokok), dan laba bersih per bulan</CardDescription>
        </CardHeader>
        <CardContent className="p-2 md:p-4">
          <div className="h-72 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData.monthlyComparison} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="month" className="text-[9px] md:text-[10px] fill-muted-foreground font-semibold" />
                <YAxis className="text-[9px] md:text-[10px] fill-muted-foreground font-semibold" tickFormatter={(v) => `Rp ${v/1000000}jt`} />
                <Tooltip 
                  formatter={(value: any, name: any) => [
                    fmt(Math.round(value)), 
                    name === 'sales' ? 'Omzet Penjualan' : name === 'cost' ? 'HPP (Beban Pokok)' : name === 'opex' ? 'Beban Operasional' : 'Laba Bersih'
                  ]} 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px' }}
                  labelStyle={{ fontWeight: 'bold', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }} />
                <Bar dataKey="sales" name="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost" name="cost" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="profit" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tables: Cashier & Top Customers side by side */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Cashier Rankings */}
        <Card className="border border-border/50 bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4 border-b border-border/40">
            <CardTitle className="text-sm md:text-base font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Produktivitas & Penjualan Kasir
            </CardTitle>
            <CardDescription className="text-[11px] mt-0.5">Akumulasi penjualan kasir teraktif</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4 text-[10px] uppercase font-bold text-muted-foreground">Kasir</TableHead>
                  <TableHead className="text-center text-[10px] uppercase font-bold text-muted-foreground">Transaksi</TableHead>
                  <TableHead className="text-right pr-4 text-[10px] uppercase font-bold text-muted-foreground">Total Penjualan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!analyticsData.cashierSales || analyticsData.cashierSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground text-xs italic">Tidak ada transaksi kasir</TableCell>
                  </TableRow>
                ) : (
                  analyticsData.cashierSales.map((cashier: any, idx: number) => (
                    <TableRow key={cashier.userId || idx} className="hover:bg-muted/40">
                      <TableCell className="pl-4 py-2.5 text-xs font-semibold flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground/80 font-bold w-4">{idx + 1}.</span>
                        {cashier.userName}
                      </TableCell>
                      <TableCell className="text-center py-2.5 text-xs">{cashier.transactionCount}x</TableCell>
                      <TableCell className="text-right pr-4 py-2.5 text-xs font-bold text-primary">{fmt(Math.round(cashier.totalSales))}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card className="border border-border/50 bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4 border-b border-border/40">
            <CardTitle className="text-sm md:text-base font-bold flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              Pelanggan Loyalitas Teratas
            </CardTitle>
            <CardDescription className="text-[11px] mt-0.5">Kontribusi nominal transaksi terbesar</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4 text-[10px] uppercase font-bold text-muted-foreground">Pelanggan</TableHead>
                  <TableHead className="text-center text-[10px] uppercase font-bold text-muted-foreground">Kunjungan</TableHead>
                  <TableHead className="text-right pr-4 text-[10px] uppercase font-bold text-muted-foreground">Total Belanja</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!analyticsData.topCustomers || analyticsData.topCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground text-xs italic">Tidak ada transaksi pelanggan</TableCell>
                  </TableRow>
                ) : (
                  analyticsData.topCustomers.map((cust: any, idx: number) => (
                    <TableRow key={idx} className="hover:bg-muted/40">
                      <TableCell className="pl-4 py-2.5 text-xs font-semibold flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground/80 font-bold w-4">{idx + 1}.</span>
                        {cust.customerName}
                      </TableCell>
                      <TableCell className="text-center py-2.5 text-xs">{cust.transactionCount}x</TableCell>
                      <TableCell className="text-right pr-4 py-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-500">{fmt(Math.round(cust.totalSpent))}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
