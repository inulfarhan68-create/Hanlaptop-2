"use client";

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Coins, Upload, CheckCircle, HelpCircle, AlertCircle, RefreshCw, Landmark, ArrowUpRight, ArrowDownLeft } from "lucide-react"
import { toast } from "sonner"
import useSWR from "swr"
import { apiFetch } from "@/lib/api"

export default function ReconciliationClient() {
  const { data: mutations, mutate, isLoading } = useSWR<any[]>('/api/financials/reconciliation')

  const [searchQuery, setSearchQuery] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      toast.error("Silakan pilih file mutasi CSV terlebih dahulu")
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await apiFetch('/api/financials/reconciliation', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || "Mutasi bank berhasil diunggah!")
        mutate()
        setFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ""
      } else {
        toast.error(data.error || "Gagal mengunggah file mutasi")
      }
    } catch (e) {
      toast.error("Terjadi kesalahan jaringan");
    } finally {
      setUploading(false)
    }
  }

  const handleMatch = async (mutationId: string, txId: string) => {
    setActionLoading(mutationId)
    try {
      const res = await apiFetch(`/api/financials/reconciliation/${mutationId}/match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transactionId: txId })
      })

      if (res.ok) {
        toast.success("Transaksi berhasil direkonsiliasi & ditandai Lunas!");
        mutate();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Gagal mencocokkan transaksi");
      }
    } catch (e) {
      toast.error("Terjadi kesalahan jaringan");
    } finally {
      setActionLoading(null)
    }
  }

  const filtered = (mutations || []).filter((m: any) =>
    m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.amount.toString().includes(searchQuery)
  )

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
      <div className="sticky top-0 z-40 shrink-0 flex flex-col md:flex-row justify-between gap-2 md:items-center p-3 md:px-5 md:py-3 bg-white/80 dark:bg-card backdrop-blur-xl rounded-xl md:rounded-[2rem] border border-border shadow-sm mt-0 mb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Coins className="h-6 w-6 text-primary" /> Rekonsiliasi Bank
          </h2>
          <p className="text-muted-foreground text-xs md:text-sm">Cocokkan dana masuk rekening dengan invoice penjualan atau servis tempo secara otomatis.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 overflow-hidden">
        {/* Left Side: Upload & Instructions */}
        <div className="space-y-4">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" /> Unggah Mutasi Rekening
              </CardTitle>
              <CardDescription className="text-[10px]">Unggah berkas mutasi bank (.csv) Anda di sini.</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <form onSubmit={handleUpload} className="space-y-3.5 text-xs">
                <div className="border-2 border-dashed border-muted rounded-xl p-6 flex flex-col items-center justify-center text-center bg-muted/10 hover:bg-muted/20 transition-all duration-300">
                  <Landmark className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="font-bold block">Pilih Berkas CSV</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">Format kolom: Tanggal, Deskripsi, Nominal, Tipe (CR/DB)</span>
                  <input
                    type="file"
                    accept=".csv"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    id="csv-file-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3.5 h-8 text-xs font-semibold rounded-lg"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Cari File...
                  </Button>
                  {file && (
                    <span className="mt-2 text-indigo-600 font-bold block truncate max-w-[200px]">
                      {file.name}
                    </span>
                  )}
                </div>

                {localStorage.getItem('selectedStoreId') === 'all' ? (
                  <div className="bg-rose-500/10 border border-rose-500/25 p-3 rounded-lg text-rose-700 dark:text-rose-400 font-bold text-center flex items-center gap-1.5 justify-center">
                    <AlertCircle className="w-4 h-4" /> Silakan pilih cabang terlebih dahulu di sidebar.
                  </div>
                ) : (
                  <Button
                    type="submit"
                    disabled={uploading || !file}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 text-xs rounded-xl shadow-sm"
                  >
                    {uploading ? (
                      <span className="flex items-center gap-1.5 justify-center">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Memproses...
                      </span>
                    ) : "Unggah & Cari Kecocokan"}
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm text-xs">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-primary" /> Panduan Format CSV
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2 leading-relaxed text-muted-foreground text-left">
              <p>Pastikan berkas CSV Anda memiliki format kolom berikut:</p>
              <div className="bg-muted p-2 rounded font-mono text-[9px] text-foreground">
                Tanggal,Deskripsi,Nominal,Tipe<br/>
                25/06/2026,TRSF SALDO TOKO,1500000,CR<br/>
                26/06/2026,BELANJA SPAREPART,-450000,DB
              </div>
              <ul className="list-disc pl-4 space-y-1 mt-2 text-[10px]">
                <li>Kolom 1: Tanggal transaksi.</li>
                <li>Kolom 2: Deskripsi mutasi bank.</li>
                <li>Kolom 3: Jumlah nominal uang (positif untuk masuk, negatif/minus untuk keluar).</li>
                <li>Kolom 4: Tipe mutasi (CR = Credit/Masuk, DB = Debit/Keluar).</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Mutations Table */}
        <Card className="lg:col-span-2 overflow-hidden border-border/60 shadow-sm flex flex-col h-full">
          <CardHeader className="pb-3 pt-4 px-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">Mutasi Rekening Bank</CardTitle>
                <CardDescription className="text-[10px]">Daftar riwayat mutasi bank terdaftar di sistem.</CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Cari deskripsi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs w-[180px] bg-muted/20 rounded-lg"
                />
              </div>
            </div>
          </CardHeader>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">Memuat data mutasi bank...</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col h-full items-center justify-center p-8 text-center">
                <Landmark className="w-12 h-12 text-muted-foreground mb-3 opacity-50" />
                <h3 className="font-bold text-slate-800 dark:text-slate-200">Belum ada mutasi bank</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">Unggah berkas mutasi di kiri untuk mulai rekonsiliasi data.</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/40 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="font-bold text-xs">Tanggal</TableHead>
                    <TableHead className="font-bold text-xs">Deskripsi Mutasi</TableHead>
                    <TableHead className="font-bold text-xs text-right">Nominal</TableHead>
                    <TableHead className="font-bold text-xs text-center w-[120px]">Status</TableHead>
                    <TableHead className="font-bold text-xs text-right w-[200px]">Rekomendasi Pencocokan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item: any) => (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs py-3.5 font-bold font-mono whitespace-nowrap">
                        {item.date}
                      </TableCell>
                      <TableCell className="text-xs py-3.5 font-medium max-w-[200px] truncate" title={item.description}>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{item.description}</div>
                        <div className="text-[9px] text-muted-foreground font-mono flex items-center mt-0.5 gap-0.5">
                          {item.type === 'CR' ? (
                            <span className="text-emerald-600 flex items-center"><ArrowUpRight className="w-3 h-3" /> Uang Masuk</span>
                          ) : (
                            <span className="text-rose-600 flex items-center"><ArrowDownLeft className="w-3 h-3" /> Uang Keluar</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs py-3.5 text-right font-black font-mono">
                        <span className={item.type === 'CR' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                          {item.type === 'CR' ? '+' : '-'}{formatCurrency(item.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs py-3.5 text-center">
                        {item.reconciled === 1 ? (
                          <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2.5 py-0.5 border border-emerald-200 dark:border-emerald-900 rounded-full text-[10px] font-black inline-flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Ter-Match
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2.5 py-0.5 border border-amber-200 dark:border-amber-900 rounded-full text-[10px] font-black inline-flex items-center gap-1">
                            Belum Match
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs py-3.5 text-right whitespace-nowrap">
                        {item.reconciled === 1 ? (
                          <div className="text-[10px] text-left text-muted-foreground p-1 border rounded bg-muted/20">
                            <div className="font-bold text-slate-700 dark:text-slate-300">Cocok dengan Invoice:</div>
                            <div className="font-mono mt-0.5 text-indigo-600 dark:text-indigo-400">
                              {item.reconciledTransaction?.invoiceNumber || "INV-LUNAS"}
                            </div>
                          </div>
                        ) : item.type === 'DB' ? (
                          <span className="text-[10px] text-muted-foreground italic">Debet/Pengeluran, Abaikan</span>
                        ) : (
                          <div className="flex flex-col gap-1 items-end">
                            {/* Suggestions List */}
                            {(!item.suggestions || item.suggestions.length === 0) ? (
                              <span className="text-[10px] text-muted-foreground italic">Tidak ada saran invoice</span>
                            ) : (
                              item.suggestions.map((sug: any) => (
                                <div key={sug.id} className="flex items-center gap-2 border p-1 rounded bg-indigo-50/30 border-indigo-100 dark:border-indigo-950 dark:bg-indigo-950/20 text-left w-full justify-between">
                                  <div className="text-[10px]">
                                    <div className="font-bold">{sug.customerName || "Pelanggan"}</div>
                                    <div className="font-mono text-indigo-600 dark:text-indigo-400 text-[9px]">{sug.invoiceNumber}</div>
                                  </div>
                                  <Button
                                    size="sm"
                                    disabled={actionLoading !== null}
                                    onClick={() => handleMatch(item.id, sug.id)}
                                    className="h-6 px-2 text-[9px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md"
                                  >
                                    Cocokkan
                                  </Button>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
