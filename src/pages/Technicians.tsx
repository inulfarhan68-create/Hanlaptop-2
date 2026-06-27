import { useState } from "react"
import { createPortal } from "react-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, UserCog, Phone, MessageCircle, Clipboard, UserCheck, X, Edit2, Trash2, Star, Wallet, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import useSWR from "swr"
import { useUserRole } from "@/hooks/useUserRole"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { cn } from "@/lib/utils"

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value)
}

export function Technicians() {
  const { isOwner, isManager, isInvestor, isKasir } = useUserRole()
  const canWrite = isOwner || isManager
  const [searchQuery, setSearchQuery] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editingTechnician, setEditingTechnician] = useState<any>(null)
  const [formName, setFormName] = useState("")
  const [formPhone, setFormPhone] = useState("")
  const [formIsActive, setFormIsActive] = useState(true)
  const [formCommissionType, setFormCommissionType] = useState<string>("percentage")
  const [formCommissionValue, setFormCommissionValue] = useState<string>("0")
  const [submitting, setSubmitting] = useState(false)
  const { confirm, dialog } = useConfirmDialog()

  const [showCommissionsModal, setShowCommissionsModal] = useState(false)
  const [selectedTechForCommissions, setSelectedTechForCommissions] = useState<any>(null)
  
  const { data: techCommissions, isLoading: isLoadingCommissions } = useSWR(
    selectedTechForCommissions ? (import.meta.env.VITE_API_URL || '') + `/api/technicians/${selectedTechForCommissions.id}/commissions` : null
  )

  const { data: technicians, error: techniciansError, mutate, isLoading } = useSWR(
    (import.meta.env.VITE_API_URL || '') + `/api/technicians${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`
  )

  const handleWA = (tech: any) => {
    const storeName = localStorage.getItem("storeName") || "HanLaptop";
    const text = `Halo *${tech.name}*, ini dari *${storeName}*. Ingin berkoordinasi mengenai pekerjaan servis unit pelanggan. Terima kasih.`;
    const encodedText = encodeURIComponent(text)
    const phoneNum = tech.phone || ''
    let waNumber = phoneNum.replace(/\D/g, '')
    if (waNumber.startsWith('0')) waNumber = '62' + waNumber.substring(1)
    window.open(`https://wa.me/${waNumber}?text=${encodedText}`, '_blank')
  }

  const openAddModal = () => {
    setEditingTechnician(null)
    setFormName("")
    setFormPhone("")
    setFormIsActive(true)
    setFormCommissionType("percentage")
    setFormCommissionValue("0")
    setShowModal(true)
  }

  const openEditModal = (t: any) => {
    setEditingTechnician(t)
    setFormName(t.name || "")
    setFormPhone(t.phone || "")
    setFormIsActive(t.isActive !== false)
    setFormCommissionType(t.commissionType || "percentage")
    setFormCommissionValue((t.commissionValue || 0).toString())
    setShowModal(true)
  }

  const handleSubmit = async () => {
    if (!formName.trim()) {
      toast.error("Nama teknisi wajib diisi")
      return
    }
    setSubmitting(true)
    try {
      const apiBase = import.meta.env.VITE_API_URL || ''
      const bodyPayload = {
        name: formName,
        phone: formPhone || null,
        isActive: formIsActive,
        commissionType: formCommissionType,
        commissionValue: Number(formCommissionValue) || 0
      }

      if (editingTechnician) {
        // Update existing
        const res = await fetch(`${apiBase}/api/technicians/${editingTechnician.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload)
        })
        if (res.ok) {
          toast.success("Data teknisi berhasil diperbarui!")
          mutate()
          setShowModal(false)
        } else {
          const err = await res.json()
          toast.error(err.error || "Gagal memperbarui")
        }
      } else {
        // Create new
        const res = await fetch(`${apiBase}/api/technicians`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload)
        })
        if (res.ok) {
          toast.success("Teknisi baru berhasil ditambahkan!")
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

  const handleDelete = async (t: any) => {
    const ok = await confirm({
      title: "Hapus Teknisi",
      description: `Yakin ingin menghapus teknisi "${t.name}"? Data tidak bisa dikembalikan.`,
      confirmLabel: "Hapus",
      variant: "destructive"
    })
    if (!ok) return
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/technicians/${t.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success("Teknisi berhasil dihapus")
        mutate()
      } else {
        toast.error("Gagal menghapus teknisi")
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
              <UserCog className="h-6 w-6 text-primary" /> Database Teknisi
            </h2>
            <p className="text-muted-foreground text-xs md:text-sm">Kelola staff teknisi/mekanik dan pantau produktivitas servis mereka.</p>
          </div>
          {canWrite && localStorage.getItem('selectedStoreId') !== 'all' && (
            <Button size="sm" className="gap-1 rounded-xl" onClick={openAddModal}>
              <UserCheck className="h-4 w-4" /> <span className="hidden sm:inline">Tambah Teknisi</span>
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
              placeholder="Cari nama teknisi..." 
              className="pl-8 bg-card"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* List Technicians */}
        <Card>
          <CardContent className="p-0">
            <div className="rounded-md border bg-card">
              {techniciansError ? (
                <div className="text-center py-10">
                  <p className="text-destructive font-semibold mb-2">Gagal memuat data teknisi</p>
                  <p className="text-muted-foreground text-sm mb-4">{techniciansError.message}</p>
                  <Button onClick={() => mutate()} variant="outline" size="sm">Coba Lagi</Button>
                </div>
              ) : isLoading ? (
                <div className="text-center py-10 text-muted-foreground">Memuat data teknisi...</div>
              ) : !Array.isArray(technicians) || technicians.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-2">
                  <UserCog className="h-10 w-10 text-muted-foreground/30" />
                  <p>Belum ada data teknisi.</p>
                  {canWrite && localStorage.getItem('selectedStoreId') !== 'all' && (
                    <Button size="sm" variant="outline" className="mt-2 gap-1" onClick={openAddModal}>
                      <UserCheck className="h-4 w-4" /> Tambah Teknisi Pertama
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* Mobile View */}
                  <div className="md:hidden flex flex-col divide-y">
                    {technicians.map((t: any) => (
                      <div key={t.id} className="p-4 flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => openEditModal(t)}>
                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">
                              {t.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-sm flex items-center gap-1.5 leading-snug">
                                {t.name}
                                {t.isActive ? (
                                  <span className="h-2 w-2 rounded-full bg-emerald-500" title="Aktif" />
                                ) : (
                                  <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700" title="Tidak Aktif" />
                                )}
                              </span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Phone className="h-3 w-3 shrink-0" /> {t.phone || <span className="italic text-amber-500">Belum diisi</span>}
                                <span className="mx-1">•</span> Komisi: {t.commissionType === 'percentage' ? `${t.commissionValue || 0}%` : `Rp ${(t.commissionValue || 0).toLocaleString('id-ID')}`}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button variant="outline" size="icon" className="h-8 w-8 text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 rounded-full" title="Riwayat Komisi" onClick={() => { setSelectedTechForCommissions(t); setShowCommissionsModal(true); }}>
                              <Wallet className="h-3.5 w-3.5" />
                            </Button>
                            {canWrite && localStorage.getItem('selectedStoreId') !== 'all' && (
                              <Button variant="outline" size="icon" className="h-8 w-8 text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-full" onClick={() => openEditModal(t)}>
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button variant="outline" size="icon" className="h-8 w-8 text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-full" onClick={() => handleWA(t)} disabled={!t.phone}>
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2 mt-1 bg-muted/40 p-2.5 rounded-xl border border-border/50">
                          <div>
                            <p className="text-[10px] uppercase text-muted-foreground font-bold font-mono">Total Servis</p>
                            <p className="font-bold text-xs mt-0.5">{t.totalServices || 0}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase text-muted-foreground font-bold font-mono">Selesai</p>
                            <p className="font-bold text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">{t.completedServices || 0}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase text-muted-foreground font-bold font-mono">Skor CSAT</p>
                            <p className="font-bold text-xs mt-0.5 flex items-center gap-0.5">
                              {t.averageRating ? (
                                <>
                                  <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                                  <span>{Number(t.averageRating).toFixed(1)}</span>
                                  <span className="text-[9px] text-muted-foreground font-normal">({t.totalRatings})</span>
                                </>
                              ) : (
                                <span className="text-muted-foreground font-normal">-</span>
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase text-muted-foreground font-bold font-mono text-indigo-600">Komisi Pending</p>
                            <p className="font-bold text-xs mt-0.5 text-indigo-600">{t.unpaidCommissions > 0 ? formatCurrency(t.unpaidCommissions) : <span className="text-muted-foreground font-normal">-</span>}</p>
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
                          <TableHead>Nama Teknisi</TableHead>
                          <TableHead>Kontak</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-center">Skema Komisi</TableHead>
                          <TableHead className="text-center">Total Servis</TableHead>
                          <TableHead className="text-center">Selesai</TableHead>
                          <TableHead className="text-center">Skor CSAT</TableHead>
                          <TableHead className="text-center text-indigo-600">Komisi Pending</TableHead>
                          <TableHead className="text-center">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {technicians.map((t: any) => (
                          <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => {
                            if (canWrite && localStorage.getItem('selectedStoreId') !== 'all') openEditModal(t);
                          }}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                                  {t.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-sm">{t.name}</div>
                                  <div className="text-[10px] text-muted-foreground">
                                    Mulai: {t.createdAt ? new Date(t.createdAt).toLocaleDateString('id-ID') : '-'}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5 text-xs">
                                <Phone className="h-3 w-3 text-muted-foreground" /> {t.phone || <span className="italic text-amber-500">Belum diisi</span>}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {t.isActive ? (
                                <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">AKTIF</span>
                              ) : (
                                <span className="bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-900/50 dark:text-slate-600 dark:border-slate-800 px-2 py-0.5 rounded-full text-[10px] font-bold">NONAKTIF</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center text-xs">
                              {t.commissionType === 'percentage' ? `${t.commissionValue || 0}%` : `Rp ${(t.commissionValue || 0).toLocaleString('id-ID')}`}
                            </TableCell>
                            <TableCell className="text-center font-medium text-xs">
                              {t.totalServices || 0}
                            </TableCell>
                            <TableCell className="text-center font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
                              {t.completedServices || 0}
                            </TableCell>
                            <TableCell className="text-center font-bold text-xs">
                              {t.averageRating ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                  <span>{Number(t.averageRating).toFixed(1)}</span>
                                  <span className="text-[9px] text-muted-foreground font-normal">({t.totalRatings || 0})</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-[10px] font-normal">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center text-xs">
                              {t.unpaidCommissions > 0 ? (
                                <span className="font-bold text-indigo-600">{formatCurrency(t.unpaidCommissions)}</span>
                              ) : (
                                <span className="text-muted-foreground text-[10px]">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <Button variant="outline" size="icon" className="h-7 w-7 text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 rounded-full" title="Riwayat Komisi" onClick={() => { setSelectedTechForCommissions(t); setShowCommissionsModal(true); }}>
                                  <Wallet className="h-3 w-3" />
                                </Button>
                                <Button variant="outline" size="sm" className="h-7 gap-1 text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-full px-2.5" onClick={() => handleWA(t)} disabled={!t.phone}>
                                  <MessageCircle className="h-3 w-3" /> WA
                                </Button>
                                {isOwner && canWrite && localStorage.getItem('selectedStoreId') !== 'all' && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 rounded-full" onClick={() => handleDelete(t)}>
                                    <Trash2 className="h-3 w-3" />
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
              <h3 className="text-lg font-bold">{editingTechnician ? "Edit Teknisi" : "Tambah Teknisi"}</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Nama Teknisi <span className="text-destructive">*</span></label>
                <Input placeholder="e.g. Ahmad Suherman" value={formName} onChange={(e) => setFormName(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Nomor Telepon / WA</label>
                <Input placeholder="e.g. 08123456789" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="h-9 text-sm" type="tel" />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground/80">Tipe Komisi</label>
                  <select 
                    value={formCommissionType} 
                    onChange={(e) => setFormCommissionType(e.target.value)} 
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus:ring-primary focus:border-primary"
                  >
                    <option value="percentage">Persentase (%)</option>
                    <option value="fixed">Nominal Tetap (Rp)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground/80">
                    {formCommissionType === 'percentage' ? 'Persentase (%)' : 'Nominal Komisi (Rp)'}
                  </label>
                  <Input 
                    type="number" 
                    min="0"
                    placeholder={formCommissionType === 'percentage' ? 'e.g. 30' : 'e.g. 50000'}
                    value={formCommissionValue} 
                    onChange={(e) => setFormCommissionValue(e.target.value)} 
                    className="h-9 text-sm" 
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="tech-active-checkbox" 
                  checked={formIsActive} 
                  onChange={(e) => setFormIsActive(e.target.checked)} 
                  className="rounded border-input text-primary focus:ring-primary h-4.5 w-4.5"
                />
                <label htmlFor="tech-active-checkbox" className="text-xs font-semibold select-none cursor-pointer">Teknisi Aktif (Bisa ditugaskan pekerjaan servis)</label>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowModal(false)}>Batal</Button>
              <Button className="flex-1 rounded-xl font-bold" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Menyimpan..." : (editingTechnician ? "Simpan" : "Tambah")}
              </Button>
            </div>

            {editingTechnician && isOwner && (
              <Button variant="ghost" className="w-full text-destructive hover:bg-destructive/10 text-xs h-8 rounded-xl" onClick={() => { setShowModal(false); handleDelete(editingTechnician); }}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus Teknisi Ini
              </Button>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Riwayat Komisi Teknisi */}
      {showCommissionsModal && selectedTechForCommissions && createPortal(
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowCommissionsModal(false)}>
          <div className="bg-card w-full max-w-2xl rounded-t-2xl sm:rounded-2xl border shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-4 duration-300" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex justify-between items-start p-5 border-b shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
                    {selectedTechForCommissions.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold leading-tight">{selectedTechForCommissions.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      Skema: <span className="font-semibold text-indigo-600">{selectedTechForCommissions.commissionType === 'percentage' ? `${selectedTechForCommissions.commissionValue || 0}% dari servis bersih` : `Rp ${(selectedTechForCommissions.commissionValue || 0).toLocaleString('id-ID')} / pekerjaan`}</span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {selectedTechForCommissions.unpaidCommissions > 0 && (
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Komisi Pending</p>
                    <p className="text-sm font-extrabold text-indigo-600">{formatCurrency(selectedTechForCommissions.unpaidCommissions)}</p>
                  </div>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowCommissionsModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 p-1">
              {isLoadingCommissions ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
                </div>
              ) : !Array.isArray(techCommissions) || techCommissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Wallet className="h-10 w-10 text-muted-foreground/30 mb-2" />
                  <p className="text-sm">Belum ada riwayat komisi.</p>
                  <p className="text-xs mt-1">Komisi akan muncul setelah servis berstatus "Diambil".</p>
                </div>
              ) : (
                <div className="divide-y">
                  {(techCommissions as any[]).map((c) => (
                    <div key={c.id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold",
                              c.status === 'PAID' ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"
                            )}>
                              {c.status === 'PAID' ? <CheckCircle className="h-3 w-3" /> : <Wallet className="h-3 w-3" />}
                              {c.status === 'PAID' ? 'Dibayar' : 'Pending'}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {c.createdAt ? new Date(c.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                            </span>
                          </div>
                          <p className="font-bold text-sm mt-1.5 truncate">
                            {c.serviceDevice || 'Perangkat tidak diketahui'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            Pelanggan: {c.customerName || '-'} {c.serviceIssue ? `• ${c.serviceIssue}` : ''}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                            <span>Total Servis: <span className="font-semibold text-foreground">{formatCurrency(c.serviceAmount)}</span></span>
                            {c.partsAmount > 0 && (
                              <span>Sparepart: <span className="font-semibold text-rose-500">-{formatCurrency(c.partsAmount)}</span></span>
                            )}
                          </div>
                          {c.paidAt && (
                            <p className="text-[10px] text-emerald-600 mt-1">
                              Dibayarkan: {new Date(c.paidAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] uppercase text-muted-foreground font-bold">Komisi</p>
                          <p className={cn(
                            "text-base font-extrabold mt-0.5",
                            c.status === 'PAID' ? "text-emerald-600" : "text-indigo-600"
                          )}>
                            +{formatCurrency(c.commissionAmount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t shrink-0 flex justify-end">
              <Button variant="outline" className="rounded-xl" onClick={() => setShowCommissionsModal(false)}>Tutup</Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
export default Technicians
