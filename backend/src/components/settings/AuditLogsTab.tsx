"use client";

import { useEffect, useState } from "react"
import { formatAction, formatEntityType } from "@/lib/audit-labels"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Search, Filter, Trash2, Edit2, PlusCircle, Clock, ShieldAlert } from "lucide-react"
import useSWR from "swr"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"

const renderFormattedDetails = (details: string) => {
  if (!details || details === "{}" || details === "[]") return <span className="text-muted-foreground">-</span>;
  try {
    const obj = JSON.parse(details);
    if (typeof obj !== 'object' || obj === null) return <span className="text-muted-foreground">{details}</span>;
    
    const keyMap: Record<string, string> = {
      itemName: 'Barang',
      sellingPrice: 'Harga',
      quantity: 'Qty',
      sku: 'SKU',
      storeName: 'Cabang',
      storePhone: 'Telepon',
      storeAddress: 'Alamat',
      address: 'Alamat',
      phone: 'Telepon',
      enableCashierShift: 'Shift Harian',
      deviceName: 'Unit',
      issue: 'Keluhan',
      status: 'Status',
      technicianName: 'Teknisi',
      estimatedCost: 'Est. Biaya',
      finalCost: 'Biaya Final',
      supplierName: 'Supplier',
      supplierPhone: 'Telepon Supplier',
      employeeName: 'Karyawan',
      name: 'Nama',
      role: 'Jabatan',
      basicSalary: 'Gaji Pokok',
      allowance: 'Tunjangan',
      isActive: 'Aktif',
      amount: 'Nominal',
      paidAmount: 'Dibayar',
      loanAmount: 'Pinjaman',
      description: 'Keterangan',
      period: 'Periode',
      netSalary: 'Gaji Bersih',
      transactionType: 'Tipe',
      invoiceNumber: 'No. Nota',
      paidVia: 'Metode',
      initialBalance: 'Kas Awal',
      cashIn: 'Uang Masuk',
      cashOut: 'Uang Keluar',
      actualCash: 'Uang Fisik',
      totalRevenue: 'Pendapatan',
      difference: 'Selisih',
    };

    const formatValue = (key: string, value: any): string => {
      if (value === null || value === undefined) return '-';
      if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
      
      const keyLower = key.toLowerCase();
      if (
        typeof value === 'number' || 
        (!isNaN(Number(value)) && (
          keyLower.includes('price') || 
          keyLower.includes('cost') || 
          keyLower.includes('amount') || 
          keyLower.includes('salary') || 
          keyLower.includes('allowance') || 
          keyLower.includes('balance') || 
          keyLower.includes('cash') ||
          keyLower.includes('revenue') ||
          keyLower.includes('difference')
        ))
      ) {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(value));
      }
      return String(value);
    };

    return (
      <div className="flex flex-wrap gap-1.5 py-0.5">
        {Object.entries(obj).map(([key, val]) => {
          const label = keyMap[key] || key;
          const formattedVal = formatValue(key, val);
          return (
            <span key={key} className="inline-flex items-center px-2 py-0.5 rounded-lg bg-muted text-[10px] font-medium border border-border/80">
              <span className="text-muted-foreground mr-1">{label}:</span>
              <span className="text-foreground font-semibold">{formattedVal}</span>
            </span>
          );
        })}
      </div>
    );
  } catch (e) {
    return <span className="text-muted-foreground font-mono text-[11px] break-all">{details}</span>;
  }
};

export function AuditLogsTab() {
  const [searchInput, setSearchInput] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [page, setPage] = useState(1)

  const PAGE_SIZE = 50

  // Debounce typing so each keystroke doesn't become a request.
  useEffect(() => {
    const id = setTimeout(() => setSearchTerm(searchInput), 350)
    return () => clearTimeout(id)
  }, [searchInput])

  useEffect(() => { setPage(1) }, [searchTerm, actionFilter])

  // Search and filtering run in the query now. Previously the API returned only
  // the last 100 entries and this component filtered those in memory, so anything
  // older simply could not be found — the search looked like it worked and
  // silently answered "nothing".
  const logsQuery = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
  if (searchTerm) logsQuery.set('search', searchTerm)
  if (actionFilter !== 'all') logsQuery.set('action', actionFilter)

  const { data: logsData, isLoading: logsLoading } = useSWR(
    '/api/logs?' + logsQuery.toString(),
    { keepPreviousData: true }
  )

  const filteredLogs: any[] = Array.isArray(logsData?.items) ? logsData.items : []
  const logsPagination = logsData?.pagination ?? { page: 1, totalPages: 1, totalItems: 0 }

  return (
    <Card className="border border-border/80 shadow-sm overflow-hidden rounded-2xl">
      <CardHeader className="border-b border-border/40 pb-4 bg-muted/10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary rounded-xl">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="text-left">
            <CardTitle className="text-base font-bold">Log Aktivitas Sistem</CardTitle>
            <CardDescription className="text-xs">Pantau audit log sistem, perubahan data, dan riwayat aktivitas kasir untuk keamanan toko.</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      {/* Search & Filter Header */}
      <div className="p-4 border-b border-border/40 bg-muted/5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Cari berdasarkan nama pengguna, modul, atau aksi..." 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 rounded-xl h-9.5 text-xs bg-card"
          />
        </div>
        <div className="flex gap-2 shrink-0">
          <div className="relative flex items-center">
            <Filter className="absolute left-3 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="flex h-9.5 rounded-xl border border-input bg-card pl-9 pr-3 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="all">Semua Tindakan</option>
              <option value="create">Pembuatan (Create)</option>
              <option value="edit">Pengubahan (Edit/Update)</option>
              <option value="delete">Penghapusan (Delete)</option>
              <option value="shift">Shift Kasir</option>
            </select>
          </div>
        </div>
      </div>

      <CardContent className="p-0 text-left">
        {logsLoading ? (
          <div className="text-center py-12 text-xs text-muted-foreground font-semibold">Memuat log aktivitas...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Log Tidak Ditemukan</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Tidak ada aktivitas audit log yang cocok dengan filter pencarian.</p>
            </div>
          </div>
        ) : (
          <>
            {/* MOBILE VIEW - Beautiful Cards */}
            <div className="md:hidden flex flex-col divide-y divide-border/40">
              {filteredLogs.map((log: any) => {
                const isDelete = log.action.includes('DELETE') || log.action.includes('RESET') || log.action.includes('HAPUS');
                const isCreate = log.action.includes('CREATE') || log.action.includes('ADD') || log.action.includes('OPEN');
                return (
                  <div key={log.id} className="p-4 flex flex-col gap-2 bg-card hover:bg-muted/5 transition-all">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex flex-col">
                        <span className="font-bold text-xs text-foreground">{log.userName}</span>
                        <span className="text-[9px] font-medium text-muted-foreground mt-0.5">
                          {new Date(log.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-black tracking-wider border shrink-0 ${
                        isDelete ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                        isCreate ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                        'bg-blue-500/10 text-blue-500 border-blue-500/20'
                      }`}>
                        {formatAction(log.action)}
                      </span>
                    </div>
                    <div className="text-xs bg-muted/30 p-2.5 rounded-xl border border-border/80">
                      <span className="font-bold text-[9px] uppercase tracking-wider text-muted-foreground block mb-1">{formatEntityType(log.entityType)}</span>
                      {renderFormattedDetails(log.details)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP VIEW - Clean Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow>
                    <TableHead className="w-[140px] text-xs font-bold">Waktu</TableHead>
                    <TableHead className="w-[130px] text-xs font-bold">Pengguna</TableHead>
                    <TableHead className="w-[160px] text-xs font-bold">Aktivitas</TableHead>
                    <TableHead className="w-[110px] text-xs font-bold">Modul</TableHead>
                    <TableHead className="text-xs font-bold">Keterangan Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log: any) => {
                    const isDelete = log.action.includes('DELETE') || log.action.includes('RESET') || log.action.includes('HAPUS');
                    const isCreate = log.action.includes('CREATE') || log.action.includes('ADD') || log.action.includes('OPEN');
                    return (
                      <TableRow key={log.id} className="hover:bg-muted/10 transition-colors border-b border-border/40">
                        <TableCell className="text-[11px] font-semibold text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell className="font-bold text-xs text-foreground">
                          {log.userName}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] uppercase font-black tracking-wider border ${
                            isDelete ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                            isCreate ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                            'bg-blue-500/10 text-blue-500 border-blue-500/20'
                          }`}>
                            {formatAction(log.action)}
                          </span>
                        </TableCell>
                        <TableCell className="font-extrabold text-[9px] uppercase tracking-wider text-muted-foreground">
                          {formatEntityType(log.entityType)}
                        </TableCell>
                        <TableCell className="text-xs max-w-md leading-relaxed">
                          {renderFormattedDetails(log.details)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {logsPagination.totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 border-t border-border/40 px-4 py-2.5">
            <span className="text-[11px] text-muted-foreground">
              Halaman {logsPagination.page} dari {logsPagination.totalPages} · {logsPagination.totalItems} aktivitas
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="h-7 rounded-lg border border-input bg-card px-3 text-[11px] font-semibold disabled:opacity-50"
                disabled={page <= 1 || logsLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Sebelumnya
              </button>
              <button
                type="button"
                className="h-7 rounded-lg border border-input bg-card px-3 text-[11px] font-semibold disabled:opacity-50"
                disabled={page >= logsPagination.totalPages || logsLoading}
                onClick={() => setPage((p) => p + 1)}
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
export default AuditLogsTab
