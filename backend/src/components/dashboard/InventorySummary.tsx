"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, AlertCircle, Tag } from "lucide-react";
import Link from "next/link";
import { useTenant } from "@/components/TenantProvider";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

export function InventorySummary({ isOwner }: { isOwner: boolean }) {
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

  const { data: markdownRecommendations } = useSWR(
    isOwner ? '/api/inventory/markdown-recommendations' : null,
    async () => {
      const res = await apiFetch('/api/inventory/markdown-recommendations');
      return res.json();
    }
  );

  if (isLoading || !data) {
    return <div className="h-[200px] w-full bg-muted/20 rounded-xl animate-pulse"></div>;
  }

  const lowStockCount = inventoryKpi?.lowStockCount || 0;

  return (
    <div className="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 animate-in fade-in">
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
            <Button variant="outline" size="sm" asChild><Link href="/inventory">Lihat Semua</Link></Button>
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
                <Link href="/inventory">Lihat Inventory</Link>
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
                    <Link href="/inventory">Terapkan Diskon</Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
