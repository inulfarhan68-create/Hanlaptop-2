"use client";

import { useState } from "react"
import { ClipboardCheck, FilePlus, ChevronLeft, Save, CheckCircle, Package, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import useSWR from "swr"
import { useUserRole } from "@/hooks/useUserRole"
import { apiFetch } from "@/lib/api"

export default function StockOpnameClient() {
  const { isOwner } = useUserRole()
  const { data: opnames, isLoading: opnamesLoading, mutate: mutateOpnames } = useSWR('/api/inventory/opname')

  const [activeOpnameId, setActiveOpnameId] = useState<string | null>(null)
  const { data: activeOpname, isLoading: activeLoading, mutate: mutateActive } = useSWR(activeOpnameId ? `/api/inventory/opname/${activeOpnameId}` : null)

  const [items, setItems] = useState<any[]>([])
  const [notes, setNotes] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Sync state when activeOpname loads
  if (activeOpname && items.length === 0 && !activeLoading) {
    setItems(activeOpname.items || [])
    setNotes(activeOpname.notes || "")
  }

  const handleCreateNew = async () => {
    setIsCreating(true)
    try {
      const res = await apiFetch(`/api/inventory/opname`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "Sesi Opname Baru" })
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      toast.success("Sesi Opname baru berhasil dibuat!")
      mutateOpnames()
      setActiveOpnameId(data.id)
      setItems([])
    } catch (e: any) {
      toast.error("Gagal membuat sesi: " + e.message)
    } finally {
      setIsCreating(false)
    }
  }

  const handleQtyChange = (id: string, val: string) => {
    const qty = parseInt(val) || 0;
    setItems(prev => prev.map(item =>
      item.id === id
        ? { ...item, physicalQty: qty, difference: qty - item.systemQty }
        : item
    ))
  }

  const handleSaveDraft = async () => {
    setIsSaving(true)
    try {
      const res = await apiFetch(`/api/inventory/opname/${activeOpnameId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, notes })
      })
      if (!res.ok) throw new Error("Gagal menyimpan draf")
      toast.success("Draf berhasil disimpan!")
      mutateActive()
      mutateOpnames()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleComplete = async () => {
    if (!confirm("Selesaikan Stok Opname? Stok sistem akan diperbarui dan jurnal akan dicatat secara otomatis. Tindakan ini tidak dapat dibatalkan!")) return

    setIsCompleting(true)
    try {
      // Auto-save draft first to ensure latest data
      await apiFetch(`/api/inventory/opname/${activeOpnameId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, notes })
      })

      const res = await apiFetch(`/api/inventory/opname/${activeOpnameId}/complete`, {
        method: "POST"
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Gagal menyelesaikan opname")
      }
      toast.success("Stok Opname Selesai! Stok barang dan Jurnal telah diperbarui.")
      setActiveOpnameId(null)
      setItems([])
      mutateOpnames()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setIsCompleting(false)
    }
  }

  const filteredItems = items.filter(item =>
    item.inventoryItem?.itemName?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (activeOpnameId) {
    if (activeLoading) return <div className="flex justify-center p-10"><div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full"></div></div>

    return (
      <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="sticky top-0 z-40 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 md:px-5 md:py-4 bg-white/80 light-blue:bg-white dark:bg-card backdrop-blur-xl rounded-2xl md:rounded-[2rem] border border-border shadow-sm mt-0 mb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { setActiveOpnameId(null); setItems([]) }} className="h-8 w-8 rounded-full">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-lg md:text-xl font-bold tracking-tight">Sesi Stok Opname</h2>
              <p className="text-muted-foreground mt-0.5 text-xs font-medium">
                {new Date(activeOpname?.createdAt).toLocaleString('id-ID')} - Oleh: {activeOpname?.userName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${activeOpname?.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {activeOpname?.status === 'COMPLETED' ? 'SELESAI' : 'DRAF'}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-auto space-y-4 px-1 md:px-0">
          <Card className="border-border shadow-sm">
            <CardHeader className="py-4">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari barang..."
                    className="pl-9 h-9"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                {activeOpname?.status === 'DRAFT' && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-9 font-medium shadow-sm" onClick={handleSaveDraft} disabled={isSaving || isCompleting}>
                      <Save className="h-4 w-4 mr-2" /> Simpan Draf
                    </Button>
                    {isOwner ? (
                      <Button className="h-9 font-bold bg-emerald-600 hover:bg-emerald-700 shadow-sm" onClick={handleComplete} disabled={isSaving || isCompleting}>
                        <CheckCircle className="h-4 w-4 mr-2" /> Selesaikan
                      </Button>
                    ) : (
                      <Button className="h-9 font-bold" disabled title="Hanya Owner yang bisa Selesaikan Opname">
                        Selesaikan (Akses Owner)
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Nama Barang</TableHead>
                    <TableHead className="text-center w-24">Stok Sistem</TableHead>
                    <TableHead className="text-center w-32">Stok Fisik</TableHead>
                    <TableHead className="text-center w-24">Selisih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map(item => (
                    <TableRow key={item.id} className={item.difference !== 0 ? 'bg-amber-50/30' : ''}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span>{item.inventoryItem?.itemName || "Barang Dihapus"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-mono">{item.systemQty}</TableCell>
                      <TableCell className="text-center">
                        {activeOpname?.status === 'DRAFT' ? (
                          <Input
                            type="number"
                            className="h-8 w-20 text-center mx-auto font-mono"
                            value={item.physicalQty}
                            onChange={(e) => handleQtyChange(item.id, e.target.value)}
                          />
                        ) : (
                          <span className="font-mono">{item.physicalQty}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                          item.difference < 0 ? 'text-red-600 bg-red-50' :
                          item.difference > 0 ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400'
                        }`}>
                          {item.difference > 0 ? `+${item.difference}` : item.difference}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Tidak ada barang ditemukan</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="sticky top-0 z-40 shrink-0 flex flex-col gap-2 p-4 md:px-5 md:py-4 bg-white/80 light-blue:bg-white dark:bg-card backdrop-blur-xl rounded-2xl md:rounded-[2rem] border border-border shadow-sm mt-0 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg md:text-xl font-bold tracking-tight flex items-center gap-2">
              <ClipboardCheck className="h-6 w-6 text-primary" />
              Stok Opname
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs font-medium">Validasi stok fisik dengan sistem</p>
          </div>
          <Button onClick={handleCreateNew} disabled={isCreating} className="shadow-sm font-semibold rounded-full h-9 md:h-10 px-4 md:px-6">
            <FilePlus className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Mulai Opname Baru</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-1 md:px-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {opnamesLoading ? (
            <div className="col-span-full flex justify-center py-8"><div className="animate-spin h-6 w-6 border-b-2 border-primary rounded-full"></div></div>
          ) : opnames?.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Belum ada riwayat Stok Opname</p>
            </div>
          ) : (
            opnames?.map((op: any) => (
              <Card key={op.id} className="cursor-pointer hover:border-primary/50 transition-colors shadow-sm" onClick={() => setActiveOpnameId(op.id)}>
                <CardHeader className="pb-3 pt-5">
                  <div className="flex justify-between items-start mb-1">
                    <CardTitle className="text-base">Sesi #{op.id.substring(0,6).toUpperCase()}</CardTitle>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${op.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {op.status === 'COMPLETED' ? 'SELESAI' : 'DRAF'}
                    </span>
                  </div>
                  <CardDescription className="text-xs">
                    {new Date(op.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium mb-1 line-clamp-1">Pelaksana: {op.userName}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 italic">"{op.notes}"</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
