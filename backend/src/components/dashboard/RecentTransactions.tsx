"use client";

import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTenant } from "@/components/TenantProvider";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

export function RecentTransactions() {
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
    return <div className="h-[200px] w-full bg-muted/20 rounded-xl animate-pulse"></div>;
  }

  const recentTransactions = data.recentTransactions || [];

  return (
    <Card className="animate-in fade-in">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-0.5">
          <CardTitle className="text-base">Recent Transactions</CardTitle>
          <CardDescription>5 transaksi terakhir</CardDescription>
        </div>
        <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
          <Link href="/transactions?mode=Riwayat" className="flex items-center gap-1">View All <ArrowRight className="h-4 w-4" /></Link>
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
  );
}
