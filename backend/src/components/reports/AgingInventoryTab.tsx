"use client";

import { useState } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ModernSelect } from "@/components/ui/modern-select"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { FileSpreadsheet } from "lucide-react"
import * as XLSX from "xlsx"
import { toast } from "sonner"

interface AgingInventoryTabProps {
  fmt: (v: number) => string;
}

export function AgingInventoryTab({ fmt }: AgingInventoryTabProps) {
  const { data: inventoryData = [], isLoading: inventoryLoading } = useSWR<any[]>(
    '/api/inventory?fetchAll=true',
    { keepPreviousData: true }
  )

  const [agingSearchTerm, setAgingSearchTerm] = useState("")
  const [agingFilterCategory, setAgingFilterCategory] = useState("all")

  if (inventoryLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const now = new Date().getTime();
  const processedItems = inventoryData.map((item: any) => {
    const createdTime = new Date(item.createdAt).getTime();
    const ageDays = Math.max(0, Math.floor((now - createdTime) / (1000 * 60 * 60 * 24)));
    const itemVal = Math.round(item.costPrice * item.quantity);
    
    let ageGroup: "new" | "medium" | "old" = "new";
    let groupLabel = "Stok Baru (<30 hari)";
    let color = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    
    if (ageDays > 90) {
      ageGroup = "old";
      groupLabel = "Dead Stock (>90 hari)";
      color = "text-rose-500 bg-rose-500/10 border-rose-500/20";
    } else if (ageDays >= 30) {
      ageGroup = "medium";
      groupLabel = "Stok Sedang (30-90 hari)";
      color = "text-amber-500 bg-amber-500/10 border-amber-500/20";
    }

    return {
      ...item,
      ageDays,
      ageGroup,
      groupLabel,
      itemVal,
      color
    };
  });

  const metrics: Record<"new" | "medium" | "old", { val: number; qty: number }> = {
    new: { val: 0, qty: 0 },
    medium: { val: 0, qty: 0 },
    old: { val: 0, qty: 0 }
  };

  processedItems.forEach((item: any) => {
    metrics[item.ageGroup as "new" | "medium" | "old"].val = Math.round(
      metrics[item.ageGroup as "new" | "medium" | "old"].val + item.itemVal
    );
    metrics[item.ageGroup as "new" | "medium" | "old"].qty += item.quantity;
  });

  const totalVal = Math.round(metrics.new.val + metrics.medium.val + metrics.old.val);

  const chartData = [
    { name: "Stok Baru (<30 hari)", value: metrics.new.val, color: "#10b981" },
    { name: "Stok Sedang (30-90 hari)", value: metrics.medium.val, color: "#f59e0b" },
    { name: "Dead Stock (>90 hari)", value: metrics.old.val, color: "#f43f5e" }
  ].filter(d => d.value > 0);

  const filteredAging = processedItems.filter((item: any) => {
    const matchesSearch = agingSearchTerm === "" || 
      item.itemName.toLowerCase().includes(agingSearchTerm.toLowerCase()) ||
      (item.barcode && item.barcode.toLowerCase().includes(agingSearchTerm.toLowerCase()));
    
    const matchesCategory = agingFilterCategory === "all" || 
      (agingFilterCategory === "laptop" && item.category === "Laptop Bekas") ||
      (agingFilterCategory === "sparepart" && item.category === "Sparepart") ||
      (agingFilterCategory === "aksesoris" && item.category === "Aksesoris");
    
    return matchesSearch && matchesCategory;
  });

  const handleExportExcelAging = () => {
    const exportData = processedItems.map((item: any, idx: number) => ({
      "No": idx + 1,
      "Barcode": item.barcode || "-",
      "Nama Barang": item.itemName,
      "Kategori": item.category,
      "Sisa Stok": item.quantity,
      "HPP (Harga Modal)": item.costPrice,
      "Nilai Persediaan (HPP * Stok)": item.itemVal,
      "Tanggal Masuk": new Date(item.createdAt).toLocaleDateString('id-ID'),
      "Umur (Hari)": item.ageDays,
      "Klasifikasi Umur": item.ageGroup === "new" ? "Baru (<30 hari)" : item.ageGroup === "medium" ? "Sedang (30-90 hari)" : "Mati (>90 hari)"
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Umur Persediaan");
    XLSX.writeFile(wb, `Laporan_Aging_Stok_${new Date().toISOString().substring(0, 10)}.xlsx`);
    toast.success("Excel umur persediaan berhasil diekspor!");
  };

  return (
    <div className="print:hidden space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border border-border/50 bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-xl shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Stok Baru (&lt;30 hari)</p>
              <p className="text-lg md:text-xl font-black text-foreground mt-1.5">{fmt(metrics.new.val)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{metrics.new.qty} unit barang fisik</p>
            </div>
            <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-xl shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Stok Sedang (30-90 hari)</p>
              <p className="text-lg md:text-xl font-black text-foreground mt-1.5">{fmt(metrics.medium.val)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{metrics.medium.qty} unit barang fisik</p>
            </div>
            <div className="bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
              <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-xl shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Dead Stock (&gt;90 hari)</p>
              <p className="text-lg md:text-xl font-black text-foreground mt-1.5">{fmt(metrics.old.val)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{metrics.old.qty} unit barang fisik</p>
            </div>
            <div className="bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
              <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1 border border-border/50 bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-xl shadow-sm">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-sm font-bold">Distribusi Nilai Aset</CardTitle>
            <CardDescription className="text-[10px]">Persentase nilai HPP berdasarkan umur</CardDescription>
          </CardHeader>
          <CardContent className="p-2 flex flex-col items-center justify-center">
            {chartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">Tidak ada data persediaan</div>
            ) : (
              <>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => fmt(Math.round(Number(val)))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="w-full space-y-1.5 text-[10px] mt-2 border-t pt-2">
                  {chartData.map((d, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5 font-medium">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></span>
                        <span>{d.name}</span>
                      </div>
                      <span className="font-bold">{totalVal === 0 ? "0.0" : ((d.value / totalVal) * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border border-border/50 bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-xl shadow-sm flex flex-col overflow-hidden">
          <CardHeader className="pb-3 pt-4 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/30">
            <div>
              <CardTitle className="text-sm font-bold">Rincian Umur Aset Persediaan</CardTitle>
              <CardDescription className="text-[10px]">Detail umur barang berdasarkan tanggal masuk sistem</CardDescription>
            </div>
            <Button onClick={handleExportExcelAging} variant="outline" size="sm" className="h-8 rounded-full text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 shrink-0 gap-1.5 cursor-pointer">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Ekspor Aging
            </Button>
          </CardHeader>
          
          <div className="p-3 bg-muted/20 border-b border-border/30 flex gap-2">
            <Input
              placeholder="Cari SKU/Nama..."
              value={agingSearchTerm}
              onChange={(e: any) => setAgingSearchTerm(e.target.value)}
              className="text-xs h-8 bg-background flex-1"
            />
            <div className="w-36 shrink-0">
              <ModernSelect
                value={agingFilterCategory}
                onChange={(val: any) => setAgingFilterCategory(val)}
                options={[
                  { value: "all", label: "Semua Kategori" },
                  { value: "laptop", label: "Laptop Bekas" },
                  { value: "sparepart", label: "Sparepart" },
                  { value: "aksesoris", label: "Aksesoris" }
                ]}
              />
            </div>
          </div>

          <CardContent className="p-0 overflow-x-auto flex-1 max-h-[300px]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-8 text-center pl-3">No</TableHead>
                  <TableHead>Nama Barang</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                  <TableHead className="text-right font-medium">HPP</TableHead>
                  <TableHead className="text-right font-bold">Nilai Aset</TableHead>
                  <TableHead className="text-center">Umur (Hari)</TableHead>
                  <TableHead className="text-center pr-3">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAging.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center p-8 text-xs text-muted-foreground">Tidak ada persediaan yang sesuai filter.</TableCell>
                  </TableRow>
                ) : (
                  filteredAging.map((item: any, idx: number) => (
                    <TableRow key={item.id} className="hover:bg-muted/40 text-xs">
                      <TableCell className="text-center font-medium pl-3 text-muted-foreground/80">{idx + 1}</TableCell>
                      <TableCell className="font-bold min-w-[150px]">
                        {item.itemName}
                        {item.barcode && <span className="block text-[9px] text-muted-foreground font-mono mt-0.5">Barcode: {item.barcode}</span>}
                      </TableCell>
                      <TableCell className="text-right font-bold">{item.quantity}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{fmt(item.costPrice)}</TableCell>
                      <TableCell className="text-right font-bold text-foreground">{fmt(item.itemVal)}</TableCell>
                      <TableCell className="text-center tabular-nums font-semibold">{item.ageDays} hari</TableCell>
                      <TableCell className="text-center pr-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full border text-[9px] font-black uppercase shrink-0 ${item.color}`}>
                          {item.ageGroup === "new" ? "Baru" : item.ageGroup === "medium" ? "Sedang" : "Mati"}
                        </span>
                      </TableCell>
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
