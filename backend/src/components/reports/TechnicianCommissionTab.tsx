"use client";

import { apiFetch } from "@/lib/api";

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Wallet, CircleDollarSign, CheckCircle2, AlertCircle, FileSpreadsheet, Send, Calendar, Check, ExternalLink, RefreshCw, Landmark } from "lucide-react"
import * as XLSX from "xlsx"

interface TechnicianCommissionTabProps {
  period: { from: string; to: string; label: string };
  fmt: (v: number) => string;
}

export function TechnicianCommissionTab({ period, fmt }: TechnicianCommissionTabProps) {
  const selectedStoreId = localStorage.getItem('selectedStoreId') || 'all';
  const apiBase = '';

  // Filter States
  const [selectedTechId, setSelectedTechId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Selection States
  const [selectedCommissionIds, setSelectedCommissionIds] = useState<string[]>([]);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
  const [submittingPayout, setSubmittingPayout] = useState(false);

  // Fetch Technicians List
  const { data: technicians = [] } = useSWR<any[]>(`${apiBase}/api/technicians`);

  // Build query string for commissions API
  const queryParams = new URLSearchParams();
  if (selectedTechId !== "all") queryParams.append('technicianId', selectedTechId);
  if (statusFilter !== "all") queryParams.append('status', statusFilter);
  if (period?.from) queryParams.append('startDate', period.from);
  if (period?.to) queryParams.append('endDate', period.to);
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

  // Fetch Commissions
  const { 
    data: commissions = [], 
    isLoading: loadingCommissions, 
    mutate: mutateCommissions 
  } = useSWR<any[]>(`${apiBase}/api/technicians/commissions${queryString}`, { keepPreviousData: true });

  // Reset check boxes whenever filter changes
  useEffect(() => {
    setSelectedCommissionIds([]);
  }, [selectedTechId, statusFilter, period]);

  // Compute stats
  const totalCommission = commissions.reduce((sum, c) => sum + (c.commissionAmount || 0), 0);
  const totalPaid = commissions.reduce((sum, c) => sum + (c.status === 'PAID' ? (c.commissionAmount || 0) : 0), 0);
  const totalUnpaid = commissions.reduce((sum, c) => sum + (c.status === 'UNPAID' ? (c.commissionAmount || 0) : 0), 0);

  // Filter out unpaid commissions for payout selection
  const unpaidCommissions = commissions.filter(c => c.status === 'UNPAID');

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCommissionIds(unpaidCommissions.map(c => c.id));
    } else {
      setSelectedCommissionIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedCommissionIds(prev => [...prev, id]);
    } else {
      setSelectedCommissionIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleExportExcel = () => {
    if (commissions.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }

    const exportData = commissions.map((c: any, idx: number) => ({
      "No": idx + 1,
      "Teknisi": c.technician?.name || "-",
      "Tanggal": new Date(c.createdAt).toLocaleDateString('id-ID'),
      "Nota Servis": c.serviceOrder?.deviceName || "-",
      "Invoice Pembayaran": c.transaction?.invoiceNumber || "-",
      "Biaya Servis (Rp)": Math.round(c.serviceAmount || 0),
      "Biaya Sparepart (Rp)": Math.round(c.partsAmount || 0),
      "Jasa Bersih (Rp)": Math.round((c.serviceAmount || 0) - (c.partsAmount || 0)),
      "Komisi Teknisi (Rp)": Math.round(c.commissionAmount || 0),
      "Status": c.status === 'PAID' ? "LUNAS" : "BELUM DIBAYAR",
      "Tanggal Pencairan": c.paidAt ? new Date(c.paidAt).toLocaleDateString('id-ID') : "-",
      "Nota Pengeluaran": c.payoutTransaction?.invoiceNumber || "-"
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Komisi Teknisi");
    XLSX.writeFile(wb, `Laporan_Komisi_Teknisi_${period?.label.replace(/ /g, "_") || 'All'}.xlsx`);
    toast.success("Excel laporan komisi berhasil diekspor!");
  };

  const handleProcessPayout = async () => {
    if (selectedCommissionIds.length === 0) {
      toast.error("Pilih komisi yang ingin dicairkan terlebih dahulu");
      return;
    }

    // Since a payout is linked to a technician, we must make sure all selected commissions belong to the same technician
    const firstComm = commissions.find(c => c.id === selectedCommissionIds[0]);
    if (!firstComm) return;

    const technicianId = firstComm.technicianId;
    const isSameTech = selectedCommissionIds.every(id => {
      const comm = commissions.find(c => c.id === id);
      return comm?.technicianId === technicianId;
    });

    if (!isSameTech) {
      toast.error("Semua komisi yang dicairkan dalam satu transaksi harus milik teknisi yang sama.");
      return;
    }

    setSubmittingPayout(true);
    try {
      const res = await apiFetch(`${apiBase}/api/technicians/payout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          technicianId,
          commissionIds: selectedCommissionIds,
          paymentMethod
        })
      });

      if (res.ok) {
        toast.success("Pencairan komisi teknisi berhasil diproses dan dicatat!");
        setSelectedCommissionIds([]);
        setShowPayoutModal(false);
        mutateCommissions();
      } else {
        const err = await res.json();
        toast.error(err.error || "Gagal memproses pencairan komisi");
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan");
    } finally {
      setSubmittingPayout(false);
    }
  };

  // Get current technician name for the checkout
  const currentTechName = (() => {
    if (selectedCommissionIds.length === 0) return "";
    const firstComm = commissions.find(c => c.id === selectedCommissionIds[0]);
    return firstComm?.technician?.name || "";
  })();

  const totalPayoutAmount = selectedCommissionIds.reduce((sum, id) => {
    const comm = commissions.find(c => c.id === id);
    return sum + (comm?.commissionAmount || 0);
  }, 0);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <Card className="border border-border/50 bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-xl shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-full -mr-8 -mt-8"></div>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase font-mono tracking-wider">
              <CircleDollarSign className="w-3.5 h-3.5 text-primary" /> Total Komisi
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <span className="text-xl md:text-2xl font-black tabular-nums">{fmt(totalCommission)}</span>
            <p className="text-[10px] text-muted-foreground mt-1">Akumulasi komisi periode ini</p>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-xl shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-8 -mt-8"></div>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 uppercase font-mono tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Sudah Dibayar
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <span className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{fmt(totalPaid)}</span>
            <p className="text-[10px] text-muted-foreground mt-1">Telah dicairkan ke teknisi</p>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-xl shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-8 -mt-8"></div>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 uppercase font-mono tracking-wider">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Belum Dibayar
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <span className="text-xl md:text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">{fmt(totalUnpaid)}</span>
            <p className="text-[10px] text-muted-foreground mt-1">Siap untuk dicairkan</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table & Filters */}
      <Card className="border border-border/50 bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-xl shadow-sm overflow-hidden flex flex-col">
        <CardHeader className="pb-3 pt-4 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/30">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-primary" /> Rincian Komisi Teknisi
            </CardTitle>
            <CardDescription className="text-[10px]">Detail bagi hasil per pengerjaan servis laptop dan status pembayarannya.</CardDescription>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button onClick={handleExportExcel} variant="outline" size="sm" className="h-8 rounded-full text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 shrink-0 gap-1.5 cursor-pointer">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Ekspor Excel
            </Button>
            {selectedCommissionIds.length > 0 && selectedStoreId !== 'all' && (
              <Button onClick={() => setShowPayoutModal(true)} size="sm" className="h-8 rounded-full text-xs font-bold bg-primary hover:bg-primary/95 text-white gap-1.5 shrink-0 animate-bounce">
                <Send className="w-3.5 h-3.5" />
                Bayar Komisi ({selectedCommissionIds.length})
              </Button>
            )}
          </div>
        </CardHeader>

        {/* Filters */}
        <div className="p-3 bg-muted/20 border-b border-border/30 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground font-mono">Pilih Teknisi</label>
            <select
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
              className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">Semua Teknisi</option>
              {technicians.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground font-mono">Status Pembayaran</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">Semua Status</option>
              <option value="UNPAID">Belum Dibayar</option>
              <option value="PAID">Sudah Dibayar (Lunas)</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {statusFilter !== 'PAID' && selectedStoreId !== 'all' && (
                  <TableHead className="w-[40px] text-center">
                    <input
                      type="checkbox"
                      className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                      checked={unpaidCommissions.length > 0 && selectedCommissionIds.length === unpaidCommissions.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      disabled={unpaidCommissions.length === 0}
                    />
                  </TableHead>
                )}
                <TableHead>Teknisi</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Nota Servis</TableHead>
                <TableHead className="text-right">Biaya Servis</TableHead>
                <TableHead className="text-right">Biaya Sparepart</TableHead>
                <TableHead className="text-right font-semibold">Jasa Bersih</TableHead>
                <TableHead className="text-right font-bold text-primary">Komisi</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Pencairan / Nota</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingCommissions ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center p-8">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-6 w-6 text-primary animate-spin" />
                      <span className="text-xs text-muted-foreground">Memuat data komisi...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : commissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center p-8 text-xs text-muted-foreground">
                    Tidak ada catatan komisi untuk periode dan filter terpilih.
                  </TableCell>
                </TableRow>
              ) : (
                commissions.map((c: any) => {
                  const isChecked = selectedCommissionIds.includes(c.id);
                  const cleanNotes = c.serviceOrder?.notes ? c.serviceOrder.notes.replace(/\n?\[QC:\s*\{[\s\S]*?\}\]/g, "").replace(/\n?\[Kelengkapan:\s*\{[\s\S]*?\}\]/g, "").replace(/\n?\[Spareparts:\s*\[[\s\S]*?\]\]/g, "").replace(/\n?\[Spareparts:\s*[\s\S]*?\]\]/g, "").trim() : "";
                  
                  return (
                    <TableRow key={c.id} className="hover:bg-muted/40 transition-colors text-xs">
                      {statusFilter !== 'PAID' && selectedStoreId !== 'all' && (
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          {c.status === 'UNPAID' ? (
                            <input
                              type="checkbox"
                              className="rounded border-input text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                              checked={isChecked}
                              onChange={(e) => handleSelectRow(c.id, e.target.checked)}
                            />
                          ) : (
                            <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                          )}
                        </TableCell>
                      )}
                      <TableCell className="font-bold">{c.technician?.name || "-"}</TableCell>
                      <TableCell className="tabular-nums">{new Date(c.createdAt).toLocaleDateString('id-ID')}</TableCell>
                      <TableCell>
                        <div className="font-semibold text-primary max-w-[150px] truncate" title={c.serviceOrder?.deviceName}>
                          {c.serviceOrder?.deviceName}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate max-w-[150px]" title={cleanNotes}>
                          {cleanNotes || c.serviceOrder?.issue || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(c.serviceAmount || 0)}</TableCell>
                      <TableCell className="text-right tabular-nums text-rose-500">{fmt(c.partsAmount || 0)}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                        {fmt(Math.max(0, (c.serviceAmount || 0) - (c.partsAmount || 0)))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-black text-primary">
                        {fmt(c.commissionAmount || 0)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          c.status === "PAID" 
                            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600" 
                            : "bg-amber-500/10 border border-amber-500/20 text-amber-600"
                        }`}>
                          {c.status === "PAID" ? "Lunas" : "Belum Dibayar"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {c.status === "PAID" ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {c.paidAt ? new Date(c.paidAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'}) : "-"}
                            </span>
                            {c.payoutTransaction && (
                              <a 
                                href={`/nota/${c.payoutTransactionId}`} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 font-semibold"
                              >
                                {c.payoutTransaction.invoiceNumber} <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-[10px]">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Payout Confirmation Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowPayoutModal(false)}>
          <div className="bg-card w-full max-w-md rounded-t-2xl sm:rounded-2xl border shadow-2xl p-5 space-y-4 animate-in slide-in-from-bottom-4 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold flex items-center gap-1.5">
                <Landmark className="w-5 h-5 text-primary" /> Konfirmasi Pencairan Komisi
              </h3>
            </div>

            <div className="space-y-3 text-xs bg-muted/40 p-3 rounded-xl border border-border/50">
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Teknisi:</span>
                <span className="font-bold text-foreground">{currentTechName}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Jumlah Servis:</span>
                <span className="font-bold text-foreground">{selectedCommissionIds.length} Pekerjaan</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-sm font-bold text-foreground">Total Pembayaran:</span>
                <span className="text-sm font-extrabold text-primary tabular-nums">{fmt(totalPayoutAmount)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80">Pilih Metode Pembayaran</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus:ring-primary focus:border-primary"
              >
                <option value="Cash">Cash (Kas Toko)</option>
                <option value="Transfer Bank">Transfer Bank</option>
              </select>
              <p className="text-[10px] text-muted-foreground">Transaksi ini akan otomatis dicatat sebagai pengeluaran Operasional di pembukuan toko.</p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowPayoutModal(false)}>Batal</Button>
              <Button className="flex-1 rounded-xl font-bold bg-primary hover:bg-primary/95 text-white" onClick={handleProcessPayout} disabled={submittingPayout}>
                {submittingPayout ? "Memproses..." : "Konfirmasi & Bayar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default TechnicianCommissionTab
