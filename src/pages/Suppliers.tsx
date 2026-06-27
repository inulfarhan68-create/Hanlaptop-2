import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Truck, MessageCircle, MapPin, Phone, Mail, FileText, PlusCircle, X, Edit2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import useSWR from "swr"
import { useUserRole } from "@/hooks/useUserRole"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"

export function Suppliers() {
  const { isOwner, isManager, isInvestor, isKasir } = useUserRole()
  const canWrite = isOwner || isManager
  const [searchQuery, setSearchQuery] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<any>(null)
  const [formName, setFormName] = useState("")
  const [formPhone, setFormPhone] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formAddress, setFormAddress] = useState("")
  const [formNotes, setFormNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const { confirm, dialog } = useConfirmDialog()

  const { data: suppliers, error: suppliersError, mutate, isLoading } = useSWR(
    (import.meta.env.VITE_API_URL || '') + `/api/suppliers${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`
  )

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val)
  }

  const handleWA = (supplier: any) => {
    const storeName = localStorage.getItem("storeName") || "HanLaptop";
    const text = `Halo Kak ${supplier.name}, kami dari *${storeName}*. Ingin berkoordinasi mengenai pasokan barang. Terima kasih.`;
    const encodedText = encodeURIComponent(text)
    const phoneNum = supplier.phone || ''
    let waNumber = phoneNum.replace(/\D/g, '')
    if (waNumber.startsWith('0')) waNumber = '62' + waNumber.substring(1)
    window.open(`https://wa.me/${waNumber}?text=${encodedText}`, '_blank')
  }

  const openAddModal = () => {
    setEditingSupplier(null)
    setFormName("")
    setFormPhone("")
    setFormEmail("")
    setFormAddress("")
    setFormNotes("")
    setShowModal(true)
  }

  const openEditModal = (s: any) => {
    setEditingSupplier(s)
    setFormName(s.name || "")
    setFormPhone(s.phone || "")
    setFormEmail(s.email || "")
    setFormAddress(s.address || "")
    setFormNotes(s.notes || "")
    setShowModal(true)
  }

  const handleSubmit = async () => {
    if (!formName.trim()) {
      toast.error("Nama supplier wajib diisi")
      return
    }
    setSubmitting(true)
    try {
      const apiBase = import.meta.env.VITE_API_URL || ''
      const bodyPayload = {
        name: formName,
        phone: formPhone || null,
        email: formEmail || null,
        address: formAddress || null,
        notes: formNotes || null
      }

      if (editingSupplier) {
        // Update existing
        const res = await fetch(`${apiBase}/api/suppliers/${editingSupplier.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload)
        })
        if (res.ok) {
          toast.success("Data supplier berhasil diperbarui!")
          mutate()
          setShowModal(false)
        } else {
          const err = await res.json()
          toast.error(err.error || "Gagal memperbarui")
        }
      } else {
        // Create new
        const res = await fetch(`${apiBase}/api/suppliers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload)
        })
        if (res.ok) {
          toast.success("Supplier baru berhasil ditambahkan!")
          mutate()
          setShowModal(false)
        } else {
          const err = await res.json()
          toast.error(err.error || "Gagal menambahkan")
        }
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (s: any) => {
    const ok = await confirm({
      title: "Hapus Supplier",
      description: `Yakin ingin menghapus supplier "${s.name}"? Data tidak bisa dikembalikan.`,
      confirmLabel: "Hapus",
      variant: "destructive"
    })
    if (!ok) return
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/suppliers/${s.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success("Supplier berhasil dihapus")
        mutate()
      } else {
        toast.error("Gagal menghapus supplier")
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan")
    }
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {dialog}
      <div className="sticky top-0 z-40 shrink-0 flex flex-col gap-2 p-3 md:px-5 md:py-3 bg-white/80 light-blue:bg-white dark:bg-card backdrop-blur-xl rounded-xl md:rounded-[2rem] border border-border shadow-sm mt-0 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
              <Truck className="h-6 w-6 text-primary" /> Database Supplier / Vendor
            </h2>
            <p className="text-muted-foreground text-xs md:text-sm">Kelola data mitra penyuplai stok laptop dan sparepart Anda.</p>
          </div>
          {canWrite && localStorage.getItem('selectedStoreId') !== 'all' && (
            <Button size="sm" className="gap-1 rounded-xl" onClick={openAddModal}>
              <PlusCircle className="h-4 w-4" /> <span className="hidden sm:inline">Tambah Supplier</span>
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-20 md:pb-4">
        {/* Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Cari nama atau telepon supplier..." 
              className="pl-8 bg-card"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* List Suppliers */}
        <Card>
          <CardContent className="p-0">
            <div className="rounded-md border bg-card">
              {suppliersError ? (
                <div className="text-center py-10">
                  <p className="text-destructive font-semibold mb-2">Gagal memuat data supplier</p>
                  <p className="text-muted-foreground text-sm mb-4">{suppliersError.message}</p>
                  <Button onClick={() => mutate()} variant="outline" size="sm">Coba Lagi</Button>
                </div>
              ) : isLoading ? (
                <div className="text-center py-10 text-muted-foreground">Memuat data supplier...</div>
              ) : !Array.isArray(suppliers) || suppliers.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-2">
                  <Truck className="h-10 w-10 text-muted-foreground/30" />
                  <p>Belum ada data supplier.</p>
                  {canWrite && localStorage.getItem('selectedStoreId') !== 'all' && (
                    <Button size="sm" variant="outline" className="mt-2 gap-1" onClick={openAddModal}>
                      <PlusCircle className="h-4 w-4" /> Tambah Supplier Pertama
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* Mobile View */}
                  <div className="md:hidden flex flex-col divide-y">
                    {suppliers.map((s: any) => (
                      <div key={s.id} className="p-4 flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => openEditModal(s)}>
                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">
                              {s.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-sm block truncate">{s.name}</span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Phone className="h-3 w-3 shrink-0" /> {s.phone || <span className="italic text-amber-500">Belum diisi</span>}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {canWrite && localStorage.getItem('selectedStoreId') !== 'all' && (
                              <Button variant="outline" size="icon" className="h-8 w-8 text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-full" onClick={() => openEditModal(s)}>
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button variant="outline" size="icon" className="h-8 w-8 text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-full" onClick={() => handleWA(s)} disabled={!s.phone}>
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {s.notes && (
                          <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded border border-border/40 truncate">
                            <span className="font-bold">Catatan:</span> {s.notes}
                          </p>
                        )}
                        
                        <div className="grid grid-cols-2 gap-2 mt-1 bg-muted/40 p-2.5 rounded-xl border border-border/50">
                          <div>
                            <p className="text-[10px] uppercase text-muted-foreground font-bold font-mono">Total Transaksi</p>
                            <p className="font-bold text-xs mt-0.5">{s.totalTransactions || 0} Kali</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase text-muted-foreground font-bold font-mono">Total Pengadaan</p>
                            <p className="font-bold text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCurrency(s.totalSpent || 0)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop View */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Supplier</TableHead>
                          <TableHead>Kontak & Alamat</TableHead>
                          <TableHead>Catatan</TableHead>
                          <TableHead className="text-center">Total Transaksi</TableHead>
                          <TableHead className="text-right">Total Belanja</TableHead>
                          <TableHead className="text-center">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {suppliers.map((s: any) => (
                          <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => {
                            if (canWrite && localStorage.getItem('selectedStoreId') !== 'all') openEditModal(s);
                          }}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                                  {s.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-sm">{s.name}</div>
                                  <div className="text-[10px] text-muted-foreground">
                                    Ditambahkan: {s.createdAt ? new Date(s.createdAt).toLocaleDateString('id-ID') : '-'}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-xs">
                                  <Phone className="h-3 w-3 text-muted-foreground" /> {s.phone || <span className="italic text-amber-500">Belum diisi</span>}
                                </div>
                                {s.email && (
                                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                    <Mail className="h-3 w-3" /> {s.email}
                                  </div>
                                )}
                                {s.address && (
                                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate max-w-[200px]" title={s.address}>
                                    <MapPin className="h-3 w-3" /> {s.address}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                              {s.notes || '-'}
                            </TableCell>
                            <TableCell className="text-center font-medium text-xs">
                              {s.totalTransactions || 0}x
                            </TableCell>
                            <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                              {formatCurrency(s.totalSpent || 0)}
                            </TableCell>
                            <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <Button variant="outline" size="sm" className="h-8 gap-1 text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-full px-3" onClick={() => handleWA(s)} disabled={!s.phone}>
                                  <MessageCircle className="h-3.5 w-3.5" /> WA
                                </Button>
                                {isOwner && localStorage.getItem('selectedStoreId') !== 'all' && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-full" onClick={() => handleDelete(s)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowModal(false)}>
          <div className="bg-card w-full max-w-md rounded-t-2xl sm:rounded-2xl border shadow-2xl p-5 space-y-4 animate-in slide-in-from-bottom-4 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">{editingSupplier ? "Edit Supplier" : "Tambah Supplier"}</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Nama Supplier <span className="text-destructive">*</span></label>
                <Input placeholder="e.g. PT Distributor Laptop Utama" value={formName} onChange={(e) => setFormName(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Nomor Telepon / WA</label>
                <Input placeholder="e.g. 08123456789" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="h-9 text-sm" type="tel" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Email</label>
                <Input placeholder="e.g. sales@distributor.com" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="h-9 text-sm" type="email" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Alamat Kantor/Gudang</label>
                <Input placeholder="e.g. Ruko Sentra Blok C No. 5" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Catatan Khusus</label>
                <Input placeholder="e.g. Pembelian laptop Acer & ASUS, melayani tempo 30 hari" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className="h-9 text-sm" />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowModal(false)}>Batal</Button>
              <Button className="flex-1 rounded-xl font-bold" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Menyimpan..." : (editingSupplier ? "Simpan" : "Tambah")}
              </Button>
            </div>

            {editingSupplier && isOwner && (
              <Button variant="ghost" className="w-full text-destructive hover:bg-destructive/10 text-xs h-8 rounded-xl" onClick={() => { setShowModal(false); handleDelete(editingSupplier); }}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus Supplier Ini
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
export default Suppliers
