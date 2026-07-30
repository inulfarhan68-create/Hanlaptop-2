"use client";

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, CheckCircle2, MessageCircle, AlertCircle, Clock, FileText } from "lucide-react"
import { toast } from "sonner"
import useSWR from "swr"
import { useUserRole } from "@/hooks/useUserRole"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { apiFetch, fetcher } from "@/lib/api"

const PAGE_SIZE = 25

// Payables aging buckets by days past due. The bucketing itself now happens in SQL
// (see services/ReceivablesService) — this is just the display order + styling.
const AGING_BUCKETS = [
  { key: 'current', label: 'Belum Tempo', cls: 'emerald' },
  { key: 'd1_30', label: '1–30 hari', cls: 'amber' },
  { key: 'd31_60', label: '31–60 hari', cls: 'orange' },
  { key: 'd60plus', label: '> 60 hari', cls: 'rose' },
] as const

const EMPTY_BUCKETS: Record<string, { total: number; count: number }> = {}

export default function HutangClient() {
  const { isOwner } = useUserRole()
  const { confirm } = useConfirmDialog()
  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [bucketFilter, setBucketFilter] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  // Debounce typing so each keystroke doesn't become a request.
  useEffect(() => {
    const id = setTimeout(() => setSearchQuery(searchInput), 350)
    return () => clearTimeout(id)
  }, [searchInput])

  // Narrowing the list must not leave us stranded on a page that no longer exists.
  useEffect(() => { setPage(1) }, [searchQuery, bucketFilter])

  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
  if (searchQuery) params.set('search', searchQuery)
  if (bucketFilter) params.set('bucket', bucketFilter)

  // The server filters, buckets and totals — this page used to pull every
  // transaction and reduce over it here, which blocked pagination.
  const { data, error: hutangError, mutate, isLoading } = useSWR(
    `/api/payables?${params.toString()}`,
    fetcher,
    { keepPreviousData: true }
  )

  const getSupplierName = (t: any) => {
    if (t.supplier && t.supplier.name) return t.supplier.name;
    return t.description ? t.description.replace('Supplier: ', '') : 'Supplier Umum';
  }

  const filteredList: any[] = Array.isArray(data?.items) ? data.items : []
  const agingSummary = data?.summary?.buckets ?? EMPTY_BUCKETS
  const totalHutang = data?.summary?.total ?? 0
  const totalCount = data?.summary?.count ?? 0
  const pagination = data?.pagination ?? { page: 1, totalPages: 1, totalItems: 0 }

  const handlePayOff = async (id: string) => {
    if (!isOwner) {
      toast.error("Hanya Owner yang dapat memproses pelunasan hutang.")
      return
    }

    const confirmed = await confirm({
      title: "Lunasi Hutang Supplier?",
      description: "Jurnal Kas/Bank akan dikreditkan untuk melunasi sisa hutang pembelian stok ini.",
      confirmLabel: "Lunasi",
    });

    if (!confirmed) return;

    try {
      const res = await apiFetch(`/api/transactions/${id}`, { method: 'PATCH' });
      if (res.ok) {
        toast.success("Hutang berhasil dilunasi!");
        mutate();
      } else {
        const error = await res.json();
        toast.error(`Gagal melunasi: ${error.error}`);
      }
    } catch (e) {
      toast.error("Terjadi kesalahan jaringan.");
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val)
  }

  const getDaysOverdue = (dueDate: string | null) => {
    if (!dueDate) return 0;
    const now = new Date();
    now.setHours(0,0,0,0);
    const due = new Date(dueDate);
    due.setHours(0,0,0,0);
    const diffTime = now.getTime() - due.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  const handleWhatsApp = (t: any) => {
    const sisa = (t.amount || 0) - (t.dpAmount || 0);
    const dateFormatted = t.dueDate ? new Date(t.dueDate).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '-';
    const storeName = localStorage.getItem("storeName") || "HanLaptop";
    const supplier = getSupplierName(t);
    const supplierPhone = t.supplier && t.supplier.phone ? t.supplier.phone : null;

    const text = `Halo *${supplier}*, kami dari *${storeName}*. Ingin mengonfirmasi sisa pembayaran untuk nota pembelian stok kami *${t.invoiceNumber || '-'}* senilai *${formatCurrency(sisa)}* yang jatuh tempo pada *${dateFormatted}* sedang kami proses. Terima kasih banyak.`;

    const encodedText = encodeURIComponent(text)

    if (supplierPhone) {
      let waNumber = supplierPhone.replace(/\D/g, '')
      if (waNumber.startsWith('0')) waNumber = '62' + waNumber.substring(1)
      window.open(`https://wa.me/${waNumber}?text=${encodedText}`, '_blank')
    } else {
      window.open(`https://wa.me/?text=${encodedText}`, '_blank')
    }
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="sticky top-0 z-40 shrink-0 flex flex-col gap-2 p-3 md:px-5 md:py-3 bg-white/80 light-blue:bg-white dark:bg-card backdrop-blur-xl rounded-xl md:rounded-[2rem] border border-border shadow-sm mt-0 mb-4">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight">Manajemen Hutang Usaha</h2>
        <p className="text-muted-foreground text-xs md:text-sm">Pantau tagihan pembelian tempo dari supplier dan rekam pelunasan kas toko.</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-20 md:pb-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-2 md:gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="p-3 md:p-4 md:pb-2">
              <CardTitle className="text-[10px] md:text-sm font-medium text-muted-foreground flex justify-between items-center uppercase tracking-wider">
                Total Hutang Supplier <FileText className="h-3 w-3 md:h-4 md:w-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-4 md:pt-0">
              <div className="text-base md:text-2xl font-bold text-primary">{formatCurrency(totalHutang)}</div>
            </CardContent>
          </Card>

          <Card className="bg-destructive/5 border-destructive/20">
            <CardHeader className="p-3 md:p-4 md:pb-2">
              <CardTitle className="text-[10px] md:text-sm font-medium text-muted-foreground flex justify-between items-center uppercase tracking-wider">
                Belum Dibayar <AlertCircle className="h-3 w-3 md:h-4 md:w-4 text-destructive" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-4 md:pt-0">
              <div className="text-base md:text-2xl font-bold text-destructive">{totalCount} Transaksi</div>
            </CardContent>
          </Card>
        </div>

        {/* Aging buckets — total sisa per umur tunggakan; klik untuk memfilter daftar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
          {AGING_BUCKETS.map((b) => {
            const s = agingSummary[b.key] || { total: 0, count: 0 }
            const active = bucketFilter === b.key
            const clsMap: Record<string, string> = {
              emerald: 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5',
              amber: 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/5',
              orange: 'text-orange-600 dark:text-orange-400 border-orange-500/30 bg-orange-500/5',
              rose: 'text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/5',
            }
            return (
              <button
                key={b.key}
                type="button"
                onClick={() => setBucketFilter(active ? null : b.key)}
                className={`text-left rounded-xl border p-3 transition-all ${clsMap[b.cls]} ${active ? 'ring-2 ring-current' : 'hover:brightness-110'}`}
                title={active ? 'Klik untuk hapus filter' : `Filter: ${b.label}`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">{b.label}</div>
                <div className="text-sm md:text-lg font-extrabold mt-0.5">{formatCurrency(s.total)}</div>
                <div className="text-[10px] opacity-70">{s.count} transaksi</div>
              </button>
            )
          })}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          {bucketFilter && (
            <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground" onClick={() => setBucketFilter(null)}>
              Hapus filter umur
            </Button>
          )}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari supplier atau no nota..."
              className="pl-8 bg-card"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>

        {/* List Hutang */}
        <Card>
          <CardContent className="p-0">
            <div className="rounded-md border bg-card">
              {hutangError ? (
                <div className="text-center py-10">
                  <p className="text-destructive font-semibold mb-2">Gagal memuat data hutang</p>
                  <p className="text-muted-foreground text-sm mb-4">{hutangError.message}</p>
                  <Button onClick={() => mutate()} variant="outline" size="sm">Coba Lagi</Button>
                </div>
              ) : isLoading ? (
                <div className="text-center py-10 text-muted-foreground">Memuat data hutang...</div>
              ) : filteredList.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">Tidak ada hutang supplier saat ini. Bagus!</div>
              ) : (
                <>
                  {/* Mobile View */}
                  <div className="md:hidden flex flex-col divide-y">
                    {filteredList.map((t: any) => {
                      const sisa = (t.amount || 0) - (t.dpAmount || 0);
                      const overdueDays = getDaysOverdue(t.dueDate);
                      const isOverdue = overdueDays > 0;
                      const supplier = getSupplierName(t);

                      return (
                        <div key={t.id} className="p-4 flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-bold text-sm block">{supplier}</span>
                              <span className="text-xs text-muted-foreground block">{t.invoiceNumber || '-'}</span>
                            </div>
                            {isOverdue ? (
                              <span className="bg-destructive/10 text-destructive text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> Telat {overdueDays} Hari
                              </span>
                            ) : (
                              <span className="bg-amber-500/10 text-amber-600 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Tempo
                              </span>
                            )}
                          </div>
                          <div className="flex justify-between items-end border-t border-border/50 pt-2">
                            <div>
                              <span className="text-[10px] uppercase text-muted-foreground font-bold">Sisa Tagihan</span>
                              <div className="font-bold text-destructive text-sm">{formatCurrency(sisa)}</div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" className="h-7 px-2 text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100" onClick={() => handleWhatsApp(t)}>
                                <MessageCircle className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" className="h-7 px-2 gap-1 text-[10px]" onClick={() => handlePayOff(t.id)} disabled={!isOwner}>
                                <CheckCircle2 className="h-3.5 w-3.5" /> Lunas
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Desktop View */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Supplier</TableHead>
                          <TableHead>No. Nota</TableHead>
                          <TableHead>Tgl Restock</TableHead>
                          <TableHead>Jatuh Tempo</TableHead>
                          <TableHead className="text-right">Sisa Hutang</TableHead>
                          <TableHead className="text-center">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredList.map((t: any) => {
                          const sisa = (t.amount || 0) - (t.dpAmount || 0);
                          const overdueDays = getDaysOverdue(t.dueDate);
                          const isOverdue = overdueDays > 0;
                          const supplier = getSupplierName(t);

                          return (
                            <TableRow key={t.id}>
                              <TableCell className="font-bold">{supplier}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{t.invoiceNumber || '-'}</TableCell>
                              <TableCell className="text-xs">
                                {new Date(t.transactionDate).toLocaleDateString('id-ID')}
                              </TableCell>
                              <TableCell>
                                {t.dueDate ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs">{new Date(t.dueDate).toLocaleDateString('id-ID')}</span>
                                    {isOverdue && (
                                      <span className="bg-destructive/10 text-destructive text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1" title={`Terlewat ${overdueDays} hari`}>
                                        <AlertCircle className="h-3 w-3" />
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-bold text-destructive">
                                {formatCurrency(sisa)}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Button variant="outline" size="sm" className="h-8 gap-1 text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700" onClick={() => handleWhatsApp(t)} title="Konfirmasi WA">
                                    <MessageCircle className="h-4 w-4" /> WA Supplier
                                  </Button>
                                  <Button size="sm" className="h-8 gap-1" onClick={() => handlePayOff(t.id)} disabled={!isOwner}>
                                    <CheckCircle2 className="h-4 w-4" /> Lunasi
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between gap-3 border-t px-3 py-2.5">
                <span className="text-xs text-muted-foreground">
                  Halaman {pagination.page} dari {pagination.totalPages} · {pagination.totalItems} tagihan
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={page <= 1 || isLoading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={page >= pagination.totalPages || isLoading}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
