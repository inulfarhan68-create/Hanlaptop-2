import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Trash2 } from "lucide-react"

interface CustomerDialogsProps {
  showModal: boolean
  setShowModal: (show: boolean) => void
  editingCustomer: any
  formName: string
  setFormName: (val: string) => void
  formPhone: string
  setFormPhone: (val: string) => void
  formAddress: string
  setFormAddress: (val: string) => void
  formNotes: string
  setFormNotes: (val: string) => void
  submitting: boolean
  handleSubmit: () => void
  handleDelete: (c: any) => void
  isOwner: boolean
}

export function CustomerDialogs({
  showModal,
  setShowModal,
  editingCustomer,
  formName,
  setFormName,
  formPhone,
  setFormPhone,
  formAddress,
  setFormAddress,
  formNotes,
  setFormNotes,
  submitting,
  handleSubmit,
  handleDelete,
  isOwner
}: CustomerDialogsProps) {
  if (!showModal) return null

  return (
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
  )
}
