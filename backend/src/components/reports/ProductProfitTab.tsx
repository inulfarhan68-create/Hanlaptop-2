"use client";

import { useState } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, TrendingUp, DollarSign, Percent, PackageOpen, AlertTriangle } from "lucide-react"

interface ProductProfitTabProps {
  period: { from?: string; to?: string; label: string }
  fmt: (v: number) => string
}

export function ProductProfitTab({ period, fmt }: ProductProfitTabProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [sortBy, setSortBy] = useState<"profit" | "qty" | "revenue" | "margin">("profit")

  const queryParams = new URLSearchParams()
  if (period.from) queryParams.append("from", period.from)
  if (period.to) queryParams.append("to", period.to)
  const q = queryParams.toString() ? `?${queryParams.toString()}` : ""

  const { data: res, error, isLoading } = useSWR<any>(
    `/api/reports/products${q}`,
    { keepPreviousData: true }
  )

  if (isLoading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || !res) {
    return (
      <div className="text-center p-8 bg-destructive/10 border border-destructive/20 rounded-xl">
        <p className="text-destructive font-bold">Gagal memuat analisis laba rugi produk</p>
        <p className="text-muted-foreground text-sm">{error?.message || "Terjadi kesalahan"}</p>
      </div>
    )
  }

  const { summary, products = [], categories = [], deadStock = [] } = res

  // Filter products by search query and category
  const filteredProducts = products.filter((p: any) => {
    const matchesSearch = p.itemName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !categoryFilter || p.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a: any, b: any) => {
    if (sortBy === "qty") return b.qtySold - a.qtySold
    if (sortBy === "revenue") return b.revenue - a.revenue
    if (sortBy === "margin") return b.margin - a.margin
    return b.profit - a.profit // default profit desc
  })

  // Extract unique categories for filter dropdown
  const uniqueCategories = Array.from(new Set(products.map((p: any) => p.category).filter(Boolean)))

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Overview Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border/50 bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-xl shadow-sm">
          <CardContent className="p-3 md:p-4 flex items-center justify-between">
            <div className="text-left">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-none">Total Omzet</p>
              <p className="text-sm md:text-lg font-black text-foreground mt-1.5">{fmt(summary.totalRevenue)}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">Penjualan kotor produk & jasa</p>
            </div>
            <div className="bg-primary/10 p-2 rounded-xl shrink-0 ml-2 hidden sm:block">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-xl shadow-sm">
          <CardContent className="p-3 md:p-4 flex items-center justify-between">
            <div className="text-left">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-none">Total HPP (Modal)</p>
              <p className="text-sm md:text-lg font-black text-destructive mt-1.5">{fmt(summary.totalCogs)}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">Total harga pokok barang terjual</p>
            </div>
            <div className="bg-destructive/10 p-2 rounded-xl shrink-0 ml-2 hidden sm:block">
              <TrendingUp className="h-5 w-5 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-xl shadow-sm">
          <CardContent className="p-3 md:p-4 flex items-center justify-between">
            <div className="text-left">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-none">Total Laba Kotor</p>
              <p className="text-sm md:text-lg font-black text-emerald-600 dark:text-emerald-500 mt-1.5">{fmt(summary.totalProfit)}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">Laba kotor sebelum opex</p>
            </div>
            <div className="bg-emerald-100 dark:bg-emerald-950/30 p-2 rounded-xl shrink-0 ml-2 hidden sm:block">
              <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-xl shadow-sm">
          <CardContent className="p-3 md:p-4 flex items-center justify-between">
            <div className="text-left">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-none">Margin Laba</p>
              <p className="text-sm md:text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1.5">{summary.overallMargin.toFixed(1)}%</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">Persentase margin laba kotor</p>
            </div>
            <div className="bg-indigo-100 dark:bg-indigo-950/30 p-2 rounded-xl shrink-0 ml-2 hidden sm:block">
              <Percent className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analysis Sections */}
      <div className="grid gap-6 lg:grid-cols-3 text-left">
        {/* Left: Products Rankings (takes 2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border border-border/50 bg-card rounded-xl shadow-sm overflow-hidden">
            <CardHeader className="pb-3 pt-4 px-4 border-b border-border/40">
              <CardTitle className="text-sm md:text-base font-bold flex items-center gap-2 justify-between flex-wrap">
                <span className="flex items-center gap-2">
                  <PackageOpen className="h-4.5 w-4.5 text-primary" />
                  Peringkat Profitabilitas Produk
                </span>
                <div className="flex gap-1">
                  <Button variant={sortBy === "profit" ? "default" : "outline"} onClick={() => setSortBy("profit")} className="text-[10px] h-6 rounded px-2">Laba</Button>
                  <Button variant={sortBy === "qty" ? "default" : "outline"} onClick={() => setSortBy("qty")} className="text-[10px] h-6 rounded px-2">Terjual</Button>
                  <Button variant={sortBy === "revenue" ? "default" : "outline"} onClick={() => setSortBy("revenue")} className="text-[10px] h-6 rounded px-2">Omzet</Button>
                  <Button variant={sortBy === "margin" ? "default" : "outline"} onClick={() => setSortBy("margin")} className="text-[10px] h-6 rounded px-2">Margin</Button>
                </div>
              </CardTitle>
              <CardDescription className="text-[11px] mt-0.5">Detail laba kotor per item, disortir berdasarkan opsi terpilih</CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex flex-col">
              {/* Search & Filter Toolbar */}
              <div className="p-3 border-b flex gap-2 flex-col sm:flex-row bg-muted/20">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama produk..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs bg-background"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="h-8 text-xs rounded-md border border-input bg-background px-2 w-full sm:w-[150px]"
                >
                  <option value="">Semua Kategori</option>
                  {uniqueCategories.map((c: any) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <Table className="min-w-[650px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4 text-[10px] uppercase font-bold text-muted-foreground w-[240px]">Produk / Model</TableHead>
                      <TableHead className="text-center text-[10px] uppercase font-bold text-muted-foreground w-[70px]">Terjual</TableHead>
                      <TableHead className="text-right text-[10px] uppercase font-bold text-muted-foreground">Omzet</TableHead>
                      <TableHead className="text-right text-[10px] uppercase font-bold text-muted-foreground">HPP (Modal)</TableHead>
                      <TableHead className="text-right text-[10px] uppercase font-bold text-muted-foreground">Laba</TableHead>
                      <TableHead className="text-right pr-4 text-[10px] uppercase font-bold text-muted-foreground w-[80px]">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs italic">Tidak ada transaksi produk sesuai filter</TableCell>
                      </TableRow>
                    ) : (
                      sortedProducts.map((p: any, idx) => (
                        <TableRow key={p.inventoryId || idx} className="hover:bg-muted/40">
                          <TableCell className="pl-4 py-2.5 text-xs font-semibold text-foreground flex items-center gap-1.5 max-w-[240px] truncate" title={p.itemName}>
                            <span className="text-[9px] text-muted-foreground/60 font-mono w-4 shrink-0">{idx + 1}.</span>
                            <div className="truncate shrink">
                              <p className="font-semibold truncate">{p.itemName}</p>
                              <span className="text-[9px] text-muted-foreground/80 font-normal">{p.category}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center py-2.5 text-xs font-mono">{p.qtySold} unit</TableCell>
                          <TableCell className="text-right py-2.5 text-xs font-medium">{fmt(p.revenue)}</TableCell>
                          <TableCell className="text-right py-2.5 text-xs text-destructive font-medium">{fmt(p.cogs)}</TableCell>
                          <TableCell className="text-right py-2.5 text-xs font-extrabold text-emerald-600 dark:text-emerald-500">{fmt(p.profit)}</TableCell>
                          <TableCell className="text-right pr-4 py-2.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono">{p.margin.toFixed(1)}%</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Categories & Dead Stock (takes 1 col) */}
        <div className="space-y-6">
          {/* Categories margins */}
          <Card className="border border-border/50 bg-card rounded-xl shadow-sm overflow-hidden">
            <CardHeader className="pb-2 pt-4 px-4 border-b border-border/40">
              <CardTitle className="text-sm md:text-base font-bold flex items-center gap-2">
                <Percent className="h-4.5 w-4.5 text-primary" />
                Laba Per Kategori
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4 text-[10px] uppercase font-bold text-muted-foreground">Kategori</TableHead>
                    <TableHead className="text-right text-[10px] uppercase font-bold text-muted-foreground">Omzet</TableHead>
                    <TableHead className="text-right pr-4 text-[10px] uppercase font-bold text-muted-foreground w-[80px]">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-xs italic">Tidak ada kategori</TableCell>
                    </TableRow>
                  ) : (
                    categories.map((c: any) => (
                      <TableRow key={c.category} className="hover:bg-muted/40">
                        <TableCell className="pl-4 py-2.5 text-xs font-bold">{c.category}</TableCell>
                        <TableCell className="text-right py-2.5 text-xs">{fmt(c.revenue)}</TableCell>
                        <TableCell className="text-right pr-4 py-2.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono">{c.margin.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Dead Stock Alert */}
          <Card className="border border-border/50 bg-card rounded-xl shadow-sm overflow-hidden">
            <CardHeader className="pb-2 pt-4 px-4 border-b border-border/40 bg-amber-500/5">
              <CardTitle className="text-sm md:text-base font-bold flex items-center gap-2 text-amber-600 dark:text-amber-500">
                <AlertTriangle className="h-4.5 w-4.5" />
                Stok Mati (Dead Stock)
              </CardTitle>
              <CardDescription className="text-[11px] mt-0.5">Stok ada di gudang, tetapi tidak terjual selama periode ini</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[350px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead className="pl-4 text-[10px] uppercase font-bold text-muted-foreground">Nama Barang</TableHead>
                      <TableHead className="text-center text-[10px] uppercase font-bold text-muted-foreground w-[55px]">Stok</TableHead>
                      <TableHead className="text-right pr-4 text-[10px] uppercase font-bold text-muted-foreground">Modal Tertanam</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deadStock.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground text-xs italic">Bagus! Tidak ada stok mati terdeteksi</TableCell>
                      </TableRow>
                    ) : (
                      deadStock.map((d: any) => (
                        <TableRow key={d.id} className="hover:bg-muted/40">
                          <TableCell className="pl-4 py-2.5 text-xs font-medium text-foreground max-w-[150px] truncate" title={d.itemName}>
                            <div>
                              <p className="truncate font-semibold">{d.itemName}</p>
                              <span className="text-[9px] text-muted-foreground/80">{d.category}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center py-2.5 text-xs font-mono font-bold text-amber-600">{d.quantity}</TableCell>
                          <TableCell className="text-right pr-4 py-2.5 text-xs font-bold text-destructive font-mono">{fmt(d.capitalLocked)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
