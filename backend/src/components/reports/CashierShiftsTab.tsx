"use client";

import { useState } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Clock, FileSpreadsheet } from "lucide-react"
import * as XLSX from "xlsx"
import { toast } from "sonner"

interface CashierShiftsTabProps {
  fmt: (v: number) => string;
}

export function CashierShiftsTab({ fmt }: CashierShiftsTabProps) {
  const { data: shiftsData = [], isLoading: shiftsLoading } = useSWR<any[]>(
    '/api/shifts/history',
    { keepPreviousData: true }
  )

  const [shiftSearchTerm, setShiftSearchTerm] = useState("")

  if (shiftsLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const shiftsArray = Array.isArray(shiftsData) ? shiftsData : [];

  const filteredShifts = shiftsArray.filter((s: any) => 
    s.userName.toLowerCase().includes(shiftSearchTerm.toLowerCase()) ||
    (s.notes && s.notes.toLowerCase().includes(shiftSearchTerm.toLowerCase()))
  )

  const handleExportExcelShifts = () => {
    const exportData = filteredShifts.map((s: any, idx: number) => ({
      "No": idx + 1,
      "Kasir": s.userName,
      "Waktu Buka": new Date(s.openedAt).toLocaleString('id-ID'),
      "Waktu Tutup": s.closedAt ? new Date(s.closedAt).toLocaleString('id-ID') : "Aktif",
      "Modal Awal (Rp)": Math.round(s.openingBalance || 0),
      "Estimasi Kas Sistem (Rp)": s.status === "OPEN" ? "-" : Math.round(s.expectedBalance || 0),
      "Fisik Laci (Rp)": s.status === "OPEN" ? "-" : Math.round(s.closingBalance || 0),
      "Selisih (Rp)": s.status === "OPEN" ? "-" : Math.round(s.difference || 0),
      "Status": s.status,
      "Catatan": s.notes || "-"
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Riwayat Shift Kasir");
    XLSX.writeFile(wb, `Laporan_Shift_Kasir_${new Date().toISOString().substring(0, 10)}.xlsx`);
    toast.success("Excel riwayat shift berhasil diekspor!");
  };

  return (
    <Card className="border border-border/50 bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-xl shadow-sm overflow-hidden flex flex-col print:hidden">
      <CardHeader className="pb-3 pt-4 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/30">
        <div>
          <CardTitle className="text-sm font-bold flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-primary" /> Riwayat Shift Kasir
          </CardTitle>
          <CardDescription className="text-[10px]">Daftar sesi buka/tutup kasir dan penyesuaian saldo laci kasir</CardDescription>
        </div>
        <Button onClick={handleExportExcelShifts} variant="outline" size="sm" className="h-8 rounded-full text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 shrink-0 gap-1.5 cursor-pointer">
          <FileSpreadsheet className="w-3.5 h-3.5" />
          Ekspor Shift
        </Button>
      </CardHeader>

      <div className="p-3 bg-muted/20 border-b border-border/30 flex gap-2">
        <Input
          placeholder="Cari berdasarkan nama kasir atau catatan..."
          value={shiftSearchTerm}
          onChange={(e: any) => setShiftSearchTerm(e.target.value)}
          className="text-xs h-8 bg-background flex-1"
        />
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Kasir</TableHead>
              <TableHead>Waktu Buka</TableHead>
              <TableHead>Waktu Tutup</TableHead>
              <TableHead className="text-right">Modal Awal</TableHead>
              <TableHead className="text-right">Ekspektasi Sistem</TableHead>
              <TableHead className="text-right font-bold">Fisik Aktual</TableHead>
              <TableHead className="text-right">Selisih</TableHead>
              <TableHead>Catatan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredShifts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center p-8 text-xs text-muted-foreground">Tidak ada riwayat shift kasir.</TableCell>
              </TableRow>
            ) : (
              filteredShifts.map((shift: any) => (
                <ShiftDetailRow key={shift.id} shift={shift} formatCurrency={fmt} />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}

function ShiftDetailRow({ shift, formatCurrency }: { shift: any; formatCurrency: any }) {
  const [expanded, setExpanded] = useState(false)
  const { data, isLoading } = useSWR<any>(
    expanded ? `/api/shifts/${shift.id}` : null,
    { keepPreviousData: true }
  )

  const fmtDate = (date: any) => {
    if (!date) return "-"
    return new Date(date).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short"
    })
  }

  const openingBalance = Math.round(shift.openingBalance || 0);
  const expectedBalance = Math.round(shift.expectedBalance || 0);
  const closingBalance = Math.round(shift.closingBalance || 0);
  const difference = Math.round(shift.difference || 0);

  return (
    <>
      <TableRow className="hover:bg-muted/40 transition-colors cursor-pointer text-xs" onClick={() => setExpanded(!expanded)}>
        <TableCell className="font-bold">{shift.userName}</TableCell>
        <TableCell className="tabular-nums">{fmtDate(shift.openedAt)}</TableCell>
        <TableCell className="tabular-nums">
          {shift.status === "OPEN" ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-500">
              Aktif
            </span>
          ) : (
            fmtDate(shift.closedAt)
          )}
        </TableCell>
        <TableCell className="text-right font-semibold">{formatCurrency(openingBalance)}</TableCell>
        <TableCell className="text-right font-semibold text-primary">{shift.status === "OPEN" ? "-" : formatCurrency(expectedBalance)}</TableCell>
        <TableCell className="text-right font-black">{shift.status === "OPEN" ? "-" : formatCurrency(closingBalance)}</TableCell>
        <TableCell className="text-right">
          {shift.status === "OPEN" ? (
            "-"
          ) : (
            <span className={`font-black ${
              difference === 0 
                ? "text-emerald-600 dark:text-emerald-500" 
                : difference < 0 
                ? "text-rose-500" 
                : "text-amber-500"
            }`}>
              {difference === 0 ? "Rp 0" : `${difference > 0 ? "+" : ""}${formatCurrency(difference)}`}
            </span>
          )}
        </TableCell>
        <TableCell className="max-w-[150px] truncate" title={shift.notes || ""}>{shift.notes || "-"}</TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="bg-muted/5 hover:bg-transparent">
          <TableCell colSpan={8} className="p-4 border-t border-b">
            {isLoading ? (
              <div className="flex justify-center p-6"><div className="animate-spin h-5 w-5 border-b-2 border-primary rounded-full" /></div>
            ) : (
              <div className="space-y-3 animate-in fade-in duration-300">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-[11px] text-foreground uppercase tracking-wider">Daftar Transaksi Selama Shift</h4>
                  <span className="text-[10px] text-muted-foreground font-semibold">Total: {data?.transactions?.length || 0} Transaksi</span>
                </div>
                {!data?.transactions || data.transactions.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6 border border-dashed rounded-xl bg-card">Tidak ada transaksi yang tercatat selama shift ini.</p>
                ) : (
                  <div className="border border-border/50 rounded-xl overflow-hidden shadow-sm bg-card">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow className="hover:bg-transparent text-[10px]">
                          <TableHead className="py-2">Nota / Invoice</TableHead>
                          <TableHead className="py-2">Waktu</TableHead>
                          <TableHead className="py-2">Tipe</TableHead>
                          <TableHead className="py-2">Pelanggan / Keterangan</TableHead>
                          <TableHead className="py-2">Metode</TableHead>
                          <TableHead className="py-2">Status</TableHead>
                          <TableHead className="py-2 text-right">Total (Rp)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-[10px]">
                        {data.transactions.map((tx: any) => {
                          const roundedAmount = Math.round(tx.amount || 0);
                          return (
                            <TableRow key={tx.id} className="hover:bg-muted/30">
                              <TableCell className="font-bold">{tx.invoiceNumber || "-"}</TableCell>
                              <TableCell className="tabular-nums">{new Date(tx.createdAt).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}</TableCell>
                              <TableCell className="font-semibold">{tx.transactionType}</TableCell>
                              <TableCell className="max-w-[200px] truncate" title={tx.customerName || tx.description || ""}>
                                {tx.customerName || tx.description || "-"}
                              </TableCell>
                              <TableCell>{tx.paymentMethod || "-"}</TableCell>
                              <TableCell>
                                <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  tx.paymentStatus === "Lunas" 
                                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600" 
                                    : "bg-amber-500/10 border border-amber-500/20 text-amber-600"
                                }`}>
                                  {tx.paymentStatus}
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-black tabular-nums">
                                {["Penjualan", "Jasa Servis", "Modal Baru"].includes(tx.transactionType) ? "+" : "-"}{formatCurrency(roundedAmount)}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
