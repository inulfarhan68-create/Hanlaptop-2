import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Users, MessageCircle, MapPin, Phone, Star, UserPlus, X, Edit2, Trash2, Database, Percent } from "lucide-react"
import { toast } from "sonner"
import useSWR from "swr"
import { useUserRole } from "@/hooks/useUserRole"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { CrmManagement } from "./CrmManagement"

export function Customers() {
  const { isOwner, isInvestor } = useUserRole()
  const [mainTab, setMainTab] = useState<"database" | "crm">("database")
  const [searchQuery, setSearchQuery] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<any>(null)
  const [formName, setFormName] = useState("")
  const [formPhone, setFormPhone] = useState("")
  const [formAddress, setFormAddress] = useState("")
  const [formNotes, setFormNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const { confirm, dialog } = useConfirmDialog()

  const { data: customers, error: customersError, mutate, isLoading } = useSWR((import.meta.env.VITE_API_URL || '') + `/api/customers${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`)

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val)
  }

  const handleWA = (customer: any) => {
    const defaultTemplate = "Halo Kak {nama}, ini dengan *{toko}*. ";
    let template = localStorage.getItem("waTemplateUmum");
    if (!template) template = defaultTemplate;

    const storeName = localStorage.getItem("storeName") || "HanLaptop";

    let text = template
      .replace(/{nama}/g, customer.name || 'Pelanggan')
      .replace(/{toko}/g, storeName);
      
    const encodedText = encodeURIComponent(text)
    const phoneNum = customer.phone || ''
    let waNumber = phoneNum.replace(/\D/g, '')
    if (waNumber.startsWith('0')) waNumber = '62' + waNumber.substring(1)
    window.open(`https://wa.me/${waNumber}?text=${encodedText}`, '_blank')
  }

  const openAddModal = () => {
    setEditingCustomer(null)
    setFormName("")
    setFormPhone("")
    setFormAddress("")
    setFormNotes("")
    setShowModal(true)
  }

  const openEditModal = (c: any) => {
    setEditingCustomer(c)
    setFormName(c.name || "")
    setFormPhone(c.phone || "")
    setFormAddress(c.address || "")
    setFormNotes(c.notes || "")
    setShowModal(true)
  }

  const handleSubmit = async () => {
    if (!formName.trim()) {
      toast.error("Nama pelanggan wajib diisi")
      return
    }
    setSubmitting(true)
    try {
      const apiBase = import.meta.env.VITE_API_URL || ''
      if (editingCustomer) {
        // Update existing
        const res = await fetch(`${apiBase}/api/customers/${editingCustomer.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formName, phone: formPhone, address: formAddress, notes: formNotes })
        })
        if (res.ok) {
          toast.success("Data pelanggan berhasil diperbarui!")
          mutate()
          setShowModal(false)
        } else {
          const err = await res.json()
          toast.error(err.error || "Gagal memperbarui")
        }
      } else {
        // Create new
        const res = await fetch(`${apiBase}/api/customers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formName, phone: formPhone, address: formAddress, notes: formNotes })
        })
        if (res.ok) {
          toast.success("Pelanggan baru berhasil ditambahkan!")
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

  const handleDelete = async (c: any) => {
    const ok = await confirm({
      title: "Hapus Pelanggan",
      description: `Yakin ingin menghapus pelanggan "${c.name}"? Data tidak bisa dikembalikan.`,
      confirmLabel: "Hapus",
      variant: "destructive"
    })
    if (!ok) return
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/customers/${c.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success("Pelanggan berhasil dihapus")
        mutate()
      } else {
        toast.error("Gagal menghapus pelanggan")
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan")
    }
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {dialog}
      <div className="sticky top-0 z-40 shrink-0 flex flex-col gap-3 p-3 md:px-5 md:py-3 bg-white/80 light-blue:bg-white dark:bg-card backdrop-blur-xl rounded-xl md:rounded-[2rem] border border-border shadow-sm mt-0 mb-4">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">Pelanggan & CRM</h2>
            <p className="text-muted-foreground text-xs md:text-sm">Kelola database, riwayat belanja, dan program loyalitas pelanggan.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex p-1 bg-muted/40 rounded-xl border">
              <Button 
                size="sm" 
                variant={mainTab === "database" ? "default" : "ghost"}
                onClick={() => setMainTab("database")}
                className="rounded-lg text-xs flex-1 sm:flex-none"
              >
                <Database className="w-3.5 h-3.5 mr-1.5" />
                Database
              </Button>
              <Button 
                size="sm" 
                variant={mainTab === "crm" ? "default" : "ghost"}
                onClick={() => setMainTab("crm")}
                className="rounded-lg text-xs flex-1 sm:flex-none"
              >
                <Percent className="w-3.5 h-3.5 mr-1.5" />
                CRM & Loyalitas
              </Button>
            </div>
            {mainTab === "database" && !isInvestor && localStorage.getItem('selectedStoreId') !== 'all' && (
              <Button size="sm" className="gap-1 rounded-xl" onClick={openAddModal}>
                <UserPlus className="h-4 w-4" /> <span className="hidden sm:inline">Tambah Manual</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {mainTab === "database" ? (
        <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-20 md:pb-4 animate-in fade-in">
        {/* Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Cari nama atau nomor WA..." 
              className="pl-8 bg-card"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* List Customers */}
        <Card>
          <CardContent className="p-0">
            <div className="rounded-md border bg-card">
              {customersError ? (
                <div className="text-center py-10">
                  <p className="text-destructive font-semibold mb-2">Gagal memuat data pelanggan</p>
                  <p className="text-muted-foreground text-sm mb-4">{customersError.message}</p>
                  <Button onClick={() => mutate()} variant="outline" size="sm">Coba Lagi</Button>
                </div>
              ) : isLoading ? (
                <div className="text-center py-10 text-muted-foreground">Memuat data pelanggan...</div>
              ) : !Array.isArray(customers) || customers.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-2">
                  <Users className="h-10 w-10 text-muted-foreground/30" />
                  <p>Belum ada data pelanggan.</p>
                  {localStorage.getItem('selectedStoreId') !== 'all' && (
                    <Button size="sm" variant="outline" className="mt-2 gap-1" onClick={openAddModal}>
                      <UserPlus className="h-4 w-4" /> Tambah Pelanggan Pertama
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* Mobile View */}
                  <div className="md:hidden flex flex-col divide-y">
                    {customers.map((c: any) => {
                      const isLoyal = c.totalSpent > 5000000 || c.totalTransactions >= 3;
                      return (
                        <div key={c.id} className="p-4 flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                            <div className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => openEditModal(c)}>
                              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center font-bold text-lg shrink-0">
                                {c.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-sm flex items-center gap-1.5">
                                  {c.name} 
                                  {isLoyal && <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />}
                                </span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Phone className="h-3 w-3 shrink-0" /> {c.phone || <span className="italic text-amber-500">Belum diisi — ketuk untuk edit</span>}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {!isInvestor && localStorage.getItem('selectedStoreId') !== 'all' && (
                                <Button variant="outline" size="icon" className="h-8 w-8 text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-full" onClick={() => openEditModal(c)}>
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button variant="outline" size="icon" className="h-8 w-8 text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-full" onClick={() => handleWA(c)} disabled={!c.phone}>
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 mt-2 bg-muted/40 p-2.5 rounded-xl border border-border/50">
                            <div>
                              <p className="text-[10px] uppercase text-muted-foreground font-bold">Total Belanja</p>
                              <p className="font-bold text-xs text-foreground mt-0.5">{formatCurrency(c.totalSpent || 0)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase text-muted-foreground font-bold">Total Transaksi</p>
                              <p className="font-bold text-xs text-foreground mt-0.5">{c.totalTransactions || 0} Kali</p>
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
                          <TableHead>Pelanggan</TableHead>
                          <TableHead>Kontak & Alamat</TableHead>
                          <TableHead className="text-center">Total Transaksi</TableHead>
                          <TableHead className="text-right">Total Belanja</TableHead>
                          <TableHead className="text-center">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customers.map((c: any) => {
                          const isLoyal = c.totalSpent > 5000000 || c.totalTransactions >= 3;
                          return (
                            <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => {
                              if (!isInvestor && localStorage.getItem('selectedStoreId') !== 'all') openEditModal(c);
                            }}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                                    {c.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-bold text-sm flex items-center gap-1.5">
                                      {c.name}
                                      {isLoyal && <span title="Pelanggan Loyal"><Star className="h-3 w-3 text-amber-500 fill-amber-500" /></span>}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground">
                                      Terakhir: {c.lastVisitDate ? new Date(c.lastVisitDate).toLocaleDateString('id-ID') : '-'}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 text-xs">
                                    <Phone className="h-3 w-3 text-muted-foreground" /> {c.phone || <span className="italic text-amber-500">Belum diisi</span>}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate max-w-[200px]">
                                    <MapPin className="h-3 w-3" /> {c.address || '-'}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-medium">
                                {c.totalTransactions || 0}x
                              </TableCell>
                              <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(c.totalSpent || 0)}
                              </TableCell>
                              <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1">
                                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-full px-3" onClick={() => handleWA(c)} disabled={!c.phone}>
                                    <MessageCircle className="h-3.5 w-3.5" /> WA
                                  </Button>
                                  {isOwner && localStorage.getItem('selectedStoreId') !== 'all' && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-full" onClick={() => handleDelete(c)}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
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
          </CardContent>
        </Card>
      </div>
      ) : (
        <div className="flex-1 overflow-hidden animate-in fade-in">
          <CrmManagement embedded={true} />
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowModal(false)}>
          <div className="bg-card w-full max-w-md rounded-t-2xl sm:rounded-2xl border shadow-2xl p-5 space-y-4 animate-in slide-in-from-bottom-4 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">{editingCustomer ? "Edit Pelanggan" : "Tambah Pelanggan"}</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Nama Pelanggan <span className="text-destructive">*</span></label>
                <Input placeholder="e.g. Budi Santoso" value={formName} onChange={(e) => setFormName(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Nomor WA / Telepon</label>
                <Input placeholder="e.g. 08123456789" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="h-9" type="tel" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Alamat</label>
                <Input placeholder="e.g. Jl. Merdeka No. 10" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Catatan</label>
                <Input placeholder="e.g. Sering beli laptop bekas" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className="h-9" />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Batal</Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Menyimpan..." : (editingCustomer ? "Simpan Perubahan" : "Tambah Pelanggan")}
              </Button>
            </div>

            {editingCustomer && isOwner && (
              <Button variant="ghost" className="w-full text-destructive hover:bg-destructive/10 text-xs h-8" onClick={() => { setShowModal(false); handleDelete(editingCustomer); }}>
                <Trash2 className="h-3 w-3 mr-1" /> Hapus Pelanggan Ini
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
