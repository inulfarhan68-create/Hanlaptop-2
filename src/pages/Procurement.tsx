import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Plus, CheckCircle, XCircle, PackageCheck, AlertCircle, ShoppingBag, ArrowRight, ShieldCheck, User, Sparkles } from "lucide-react"
import { toast } from "sonner"
import useSWR from "swr"
import { useUserRole } from "@/hooks/useUserRole"

export function Procurement() {
  const { role, isOwner } = useUserRole()
  const { data: requisitions, mutate, isLoading } = useSWR<any[]>(
    (import.meta.env.VITE_API_URL || '') + '/api/procurement/requisitions'
  )

  const [searchQuery, setSearchQuery] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Form states
  const [itemName, setItemName] = useState("")
  const [quantity, setQuantity] = useState("")
  const [estimatedCost, setEstimatedCost] = useState("")
  const [supplierName, setSupplierName] = useState("")
  const [notes, setNotes] = useState("")

  const [aiLoading, setAiLoading] = useState(false)

  const handleAiSpecsCheck = async () => {
    if (!itemName.trim()) {
      toast.error("Masukkan nama barang / model laptop terlebih dahulu.")
      return
    }
    setAiLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/public/buyback/estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: itemName,
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal mendapatkan spesifikasi AI")

      const aiData = data.data
      if (!aiData) throw new Error("AI tidak mengembalikan hasil analisis wajar.")

      // Format specs for notes
      const specString = `Specs: Processor: ${aiData.processor || ''} | VGA: ${aiData.vga || 'Integrated'} | RAM: ${aiData.ram || '8GB'} | Storage: ${aiData.storage || '256GB SSD'} | Keyboard: ${aiData.keyboard || 'Non-Backlight'} | Konektivitas: ${aiData.connectivity || 'Wi-Fi 6 + Bluetooth 5.1'} | Port: ${aiData.ports || '2x USB-C, 1x USB-A, HDMI, Audio Jack'}`

      setItemName(`${aiData.brand} ${aiData.model}`)
      
      // Append specs to notes
      setNotes(prev => prev ? `${prev}\n${specString}` : specString)

      toast.success("Spesifikasi AI berhasil diterapkan ke form!")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setAiLoading(false)
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0)
  }

  const formatNumberInput = (val: string) => {
    if (!val) return "";
    const num = val.toString().replace(/\D/g, "");
    return num ? new Intl.NumberFormat("id-ID").format(parseInt(num, 10)) : "";
  }

  const handleCostChange = (val: string) => {
    setEstimatedCost(val.replace(/\D/g, ""));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemName || !quantity || !estimatedCost) {
      toast.error("Nama barang, jumlah, dan estimasi biaya wajib diisi")
      return
    }

    setActionLoading("submit")
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/procurement/requisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName,
          quantity: parseFloat(quantity),
          estimatedCost: parseFloat(estimatedCost),
          supplierName,
          notes
        })
      });

      if (res.ok) {
        toast.success("Permintaan pembelian berhasil diajukan!")
        mutate()
        setShowAddModal(false)
        setItemName("")
        setQuantity("")
        setEstimatedCost("")
        setSupplierName("")
        setNotes("")
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Gagal mengajukan pembelian");
      }
    } catch (e) {
      toast.error("Terjadi kesalahan jaringan");
    } finally {
      setActionLoading(null)
    }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (newStatus === 'RECEIVED') {
      const confirmReceive = confirm(
        "Apakah Anda yakin unit fisik barang telah diterima secara lengkap?\nStok inventori barang akan bertambah secara otomatis."
      );
      if (!confirmReceive) return;
    }

    setActionLoading(id)
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/procurement/requisitions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        toast.success(`Status berhasil diperbarui menjadi ${newStatus}`);
        mutate();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Gagal memperbarui status");
      }
    } catch (e) {
      toast.error("Terjadi kesalahan jaringan");
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 border px-2 py-0.5 rounded-full text-[10px] font-bold">Menunggu PO</span>
      case 'APPROVED':
        return <span className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 border px-2 py-0.5 rounded-full text-[10px] font-bold">PO Disetujui</span>
      case 'REJECTED':
        return <span className="bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 border px-2 py-0.5 rounded-full text-[10px] font-bold">Ditolak</span>
      case 'RECEIVED':
        return <span className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 border px-2 py-0.5 rounded-full text-[10px] font-bold">Barang Diterima</span>
      default:
        return <span className="bg-slate-100 text-slate-700 border px-2 py-0.5 rounded-full text-[10px] font-bold">{status}</span>
    }
  }

  const filtered = (requisitions || []).filter((r: any) =>
    r.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.supplierName && r.supplierName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (r.requester?.name && r.requester.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const isOwnerOrManager = role === 'owner' || role === 'manager'

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
      <div className="sticky top-0 z-40 shrink-0 flex flex-col md:flex-row justify-between gap-2 md:items-center p-3 md:px-5 md:py-3 bg-white/80 dark:bg-card backdrop-blur-xl rounded-xl md:rounded-[2rem] border border-border shadow-sm mt-0 mb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-primary" /> Procurement & PO
          </h2>
          <p className="text-muted-foreground text-xs md:text-sm">Kelola pengajuan belanja inventori cabang & persetujuan owner.</p>
        </div>
        {localStorage.getItem('selectedStoreId') !== 'all' && (
          <Button onClick={() => setShowAddModal(true)} className="rounded-full shadow-lg shadow-primary/20 whitespace-nowrap">
            <Plus className="mr-2 h-4 w-4" /> Ajukan Belanja
          </Button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-4 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Cari nama barang, supplier, pengaju..." 
            className="pl-9 bg-card rounded-xl h-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Card className="flex-1 overflow-hidden border-border/60 shadow-sm">
        <div className="h-full overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">Memuat data pengajuan belanja...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col h-full items-center justify-center p-8 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mb-3" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200">Tidak ada pengajuan belanja</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">Ajukan permintaan barang baru untuk restock cabang.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/40 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="font-bold text-xs">Tanggal</TableHead>
                  <TableHead className="font-bold text-xs">Cabang</TableHead>
                  <TableHead className="font-bold text-xs">Nama Barang</TableHead>
                  <TableHead className="font-bold text-xs">Jumlah</TableHead>
                  <TableHead className="font-bold text-xs">Estimasi Biaya</TableHead>
                  <TableHead className="font-bold text-xs">Supplier</TableHead>
                  <TableHead className="font-bold text-xs">Diajukan Oleh</TableHead>
                  <TableHead className="font-bold text-xs">Status</TableHead>
                  <TableHead className="font-bold text-xs text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item: any) => (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs py-3.5 font-medium whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-xs py-3.5 font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                      {item.store?.name || "HanLaptop"}
                    </TableCell>
                    <TableCell className="text-xs py-3.5 font-bold max-w-[150px] truncate" title={item.itemName}>
                      {item.itemName}
                    </TableCell>
                    <TableCell className="text-xs py-3.5 font-bold font-mono">
                      {item.quantity} unit
                    </TableCell>
                    <TableCell className="text-xs py-3.5 font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(item.estimatedCost)}
                    </TableCell>
                    <TableCell className="text-xs py-3.5 text-muted-foreground whitespace-nowrap">
                      {item.supplierName || "-"}
                    </TableCell>
                    <TableCell className="text-xs py-3.5 font-medium">
                      <span className="inline-flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        {item.requester?.name || "Kasir"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs py-3.5 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        {getStatusBadge(item.status)}
                        {item.approvedBy && (
                          <span className="text-[9px] text-muted-foreground">PO: {item.approvedBy}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs py-3.5 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1.5">
                        {isOwnerOrManager && item.status === 'PENDING' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              disabled={actionLoading !== null}
                              onClick={() => handleStatusChange(item.id, 'APPROVED')}
                              className="h-7 px-2.5 text-[10px] font-bold border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:border-indigo-900 dark:text-indigo-400 dark:bg-indigo-950/20"
                            >
                              <ShieldCheck className="w-3 h-3 mr-1" /> Setujui
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              disabled={actionLoading !== null}
                              onClick={() => handleStatusChange(item.id, 'REJECTED')}
                              className="h-7 px-2.5 text-[10px] font-bold border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 dark:border-rose-900 dark:text-rose-400 dark:bg-rose-950/20"
                            >
                              <XCircle className="w-3 h-3 mr-1" /> Tolak
                            </Button>
                          </>
                        )}
                        {item.status === 'APPROVED' && (
                          <Button 
                            size="sm" 
                            disabled={actionLoading !== null}
                            onClick={() => handleStatusChange(item.id, 'RECEIVED')}
                            className="h-7 px-2.5 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                          >
                            <PackageCheck className="w-3 h-3 mr-1" /> Terima Barang
                          </Button>
                        )}
                        {item.status === 'RECEIVED' && (
                          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" /> Stok Terupdate
                          </span>
                        )}
                        {item.status === 'REJECTED' && (
                          <span className="text-xs text-rose-500 font-semibold flex items-center gap-1">
                            <XCircle className="w-4 h-4" /> Ditolak
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-[450px] overflow-y-auto rounded-2xl shadow-xl border border-border flex flex-col">
            <div className="px-5 py-4 border-b border-border flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold">Ajukan Belanja Inventori</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)} className="h-8 w-8 rounded-full">
                <XCircle className="h-5 h-5 text-muted-foreground" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Nama Barang <span className="text-destructive">*</span></label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAiSpecsCheck}
                    disabled={aiLoading || !itemName.trim()}
                    className="h-7 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200 gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {aiLoading ? "Menganalisis..." : "Cek Spek AI ✨"}
                  </Button>
                </div>
                <Input 
                  value={itemName} 
                  onChange={(e) => setItemName(e.target.value)} 
                  placeholder="Contoh: Keyboard Asus K401, SSD Lexar 512GB, dll."
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Jumlah <span className="text-destructive">*</span></label>
                  <Input 
                    type="number"
                    min="1"
                    step="any"
                    value={quantity} 
                    onChange={(e) => setQuantity(e.target.value)} 
                    placeholder="10"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Estimasi Biaya <span className="text-destructive">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm text-muted-foreground font-medium">Rp</span>
                    <Input 
                      type="text" 
                      value={formatNumberInput(estimatedCost)} 
                      onChange={(e) => handleCostChange(e.target.value)} 
                      className="pl-9 font-mono"
                      placeholder="1.500.000"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Supplier / Toko (Opsional)</label>
                <Input 
                  value={supplierName} 
                  onChange={(e) => setSupplierName(e.target.value)} 
                  placeholder="Contoh: PT. Sparepart Indah / Tokopedia Seller"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Catatan / Alasan Belanja</label>
                <Input 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  placeholder="Contoh: Untuk restock sparepart keyboard yang habis."
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-border mt-4">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={actionLoading !== null}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  {actionLoading === 'submit' ? "Mengajukan..." : "Ajukan & Kirim"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
