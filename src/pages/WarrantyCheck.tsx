import { useState } from "react"
import { Search, ShieldAlert, ShieldCheck, HelpCircle, Package, Clock, ArrowRight, NotebookText } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"
import useSWR from "swr"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function WarrantyCheck() {
  const [activeTab, setActiveTab] = useState<"check" | "claims">("check")
  const [snQuery, setSnQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  
  const navigate = useNavigate()

  const { data: claims, mutate: mutateClaims } = useSWR(activeTab === "claims" ? (import.meta.env.VITE_API_URL || '') + '/api/warranty-claims' : null)

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!snQuery.trim()) {
      toast.error("Masukkan Serial Number (SN) terlebih dahulu")
      return
    }

    setIsSearching(true)
    setHasSearched(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/warranty/check?sn=${encodeURIComponent(snQuery.trim())}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data)
        if (data.length === 0) {
          toast.error("SN tidak ditemukan dalam riwayat transaksi")
        } else {
          toast.success("Data garansi ditemukan!")
        }
      } else {
        toast.error("Gagal melakukan pencarian garansi")
      }
    } catch (err) {
      toast.error("Terjadi kesalahan jaringan")
    } finally {
      setIsSearching(false)
    }
  }

  const handleClaimWarranty = (result: any) => {
    // Pass data to Services page to pre-fill
    navigate("/services?mode=claim", {
      state: {
        customerName: result.tx?.customerName,
        customerPhone: result.tx?.customerPhone || "",
        customerAddress: result.tx?.customerAddress || "",
        deviceDesc: `${result.itemName} (SN: ${snQuery.trim()})`,
        originalTxId: result.transactionId
      }
    })
  }

  const handleResolveClaim = async (claimId: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/warranty-claims/${claimId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'COMPLETED',
          resolutionNotes: 'Diselesaikan via sistem',
          partsUsed: [] // Future extension: open modal to select parts
        })
      })
      if (res.ok) {
        toast.success("Klaim berhasil diselesaikan")
        mutateClaims()
      } else {
        toast.error("Gagal menyelesaikan klaim")
      }
    } catch (err) {
      toast.error("Terjadi kesalahan")
    }
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="sticky top-0 z-40 shrink-0 flex flex-col gap-2 p-4 md:px-5 md:py-4 bg-white/80 light-blue:bg-white dark:bg-card backdrop-blur-xl rounded-2xl md:rounded-[2rem] border border-border shadow-sm mt-0 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg md:text-xl font-bold tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-emerald-500" />
              Pusat Garansi
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs font-medium">Validasi garansi dan kelola klaim garansi pelanggan</p>
          </div>
          <div className="flex gap-2 bg-muted p-1 rounded-xl">
            <Button variant={activeTab === "check" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("check")} className="rounded-lg h-8">Cek SN</Button>
            <Button variant={activeTab === "claims" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("claims")} className="rounded-lg h-8">Daftar Klaim</Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-1 md:px-0">
        <div className="max-w-4xl mx-auto space-y-6">
          {activeTab === "check" ? (
            <>
              <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3 bg-muted/20">
              <CardTitle className="text-base font-semibold">Pencarian Serial Number</CardTitle>
              <CardDescription>Scan barcode SN atau ketik secara manual</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                  <Input 
                    placeholder="Contoh: SN-123456789" 
                    value={snQuery}
                    onChange={(e) => setSnQuery(e.target.value)}
                    className="pl-10 h-10 border-primary/20 focus-visible:ring-primary/30 text-base"
                    autoFocus
                  />
                </div>
                <Button type="submit" disabled={isSearching} className="h-10 px-6 font-bold shadow-sm">
                  {isSearching ? "Mencari..." : "Cek Status"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {hasSearched && !isSearching && results.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-xl border border-dashed border-border shadow-sm">
              <HelpCircle className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-bold text-foreground mb-1">SN Tidak Ditemukan</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Serial Number "{snQuery}" tidak ditemukan dalam riwayat penjualan toko ini. Pastikan pengetikan benar atau unit memang bukan dibeli dari sini.
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-1">Hasil Pencarian</h3>
              
              {results.map((res, i) => (
                <Card key={i} className="overflow-hidden border-border shadow-md">
                  <div className={`h-1.5 w-full ${res.warrantyStatus === 'Aktif' ? 'bg-emerald-500' : 'bg-destructive'}`}></div>
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* Left: Device Info */}
                      <div className="flex-1 p-5 border-b md:border-b-0 md:border-r border-border/50">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <p className="text-sm font-bold text-primary mb-1 flex items-center gap-1.5">
                              <Package className="h-4 w-4" /> {res.itemName}
                            </p>
                            <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs bg-muted/50 font-mono">SN: {snQuery}</span>
                          </div>
                          {res.warrantyStatus === 'Aktif' ? (
                            <span className="inline-flex items-center rounded-md border text-xs text-white bg-emerald-500 hover:bg-emerald-600 font-bold px-2 py-1 flex items-center gap-1">
                              <ShieldCheck className="h-3.5 w-3.5" /> Garansi Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md border text-xs text-white bg-destructive font-bold px-2 py-1 flex items-center gap-1">
                              <ShieldAlert className="h-3.5 w-3.5" /> Garansi Habis
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-6">
                          <div className="space-y-1">
                            <p className="text-[11px] text-muted-foreground font-semibold uppercase">Nama Pelanggan</p>
                            <p className="text-sm font-medium">{res.tx?.customerName || "Pelanggan Umum"}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[11px] text-muted-foreground font-semibold uppercase">No. Nota Penjualan</p>
                            <p className="text-sm font-mono font-medium text-blue-600">{res.tx?.invoiceNumber}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[11px] text-muted-foreground font-semibold uppercase">Tanggal Beli</p>
                            <p className="text-sm font-medium">{new Date(res.tx?.transactionDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[11px] text-muted-foreground font-semibold uppercase">Sisa Garansi</p>
                            {res.warrantyStatus === 'Aktif' ? (
                              <p className="text-sm font-bold text-emerald-600 flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" /> {res.warrantyDaysRemaining} Hari
                              </p>
                            ) : (
                              <p className="text-sm font-medium text-destructive">0 Hari (Habis)</p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Right: Actions */}
                      <div className="p-5 bg-muted/20 w-full md:w-64 flex flex-col justify-center gap-3">
                        <Button 
                          className="w-full justify-between" 
                          onClick={() => handleClaimWarranty(res)}
                        >
                          <span className="flex items-center gap-2"><NotebookText className="h-4 w-4"/> Buat Form Servis</span>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          className="w-full bg-white justify-between text-muted-foreground border-border hover:text-foreground"
                          onClick={() => window.open(`/nota/${res.tx?.id}`, '_blank')}
                        >
                          <span className="flex items-center gap-2"><Search className="h-4 w-4"/> Lihat Nota Asli</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
            )}
            </>
          ) : (
            <Card className="border shadow-sm">
              <div className="bg-slate-50 border-b p-3">
                <h3 className="font-semibold">Daftar Klaim Garansi</h3>
              </div>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal Klaim</TableHead>
                      <TableHead>No. Invoice</TableHead>
                      <TableHead>Keluhan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claims?.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada klaim garansi</TableCell></TableRow>
                    ) : (
                      claims?.map((claim: any) => (
                        <TableRow key={claim.id}>
                          <TableCell className="font-medium">{new Date(claim.createdAt).toLocaleDateString('id-ID')}</TableCell>
                          <TableCell className="text-blue-600">{claim.transaction?.invoiceNumber}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{claim.issueDescription}</TableCell>
                          <TableCell>
                            <Badge variant={['SUBMITTED', 'INSPECTING', 'REPAIRING'].includes(claim.status) ? 'destructive' : claim.status === 'REJECTED' ? 'secondary' : 'default'}>{claim.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {['SUBMITTED', 'INSPECTING', 'REPAIRING'].includes(claim.status) && (
                              <Button size="sm" onClick={() => handleResolveClaim(claim.id)}>Selesaikan</Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
