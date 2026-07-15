"use client";

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Trash2 } from "lucide-react"

interface SupplierDialogsProps {
  showModal: boolean;
  setShowModal: (val: boolean) => void;
  editingSupplier: any;
  formName: string;
  setFormName: (val: string) => void;
  formPhone: string;
  setFormPhone: (val: string) => void;
  formEmail: string;
  setFormEmail: (val: string) => void;
  formAddress: string;
  setFormAddress: (val: string) => void;
  formNotes: string;
  setFormNotes: (val: string) => void;
  submitting: boolean;
  handleSubmit: () => void;
  handleDelete: (s: any) => void;
  canWrite: boolean;
}

export function SupplierDialogs({
  showModal,
  setShowModal,
  editingSupplier,
  formName,
  setFormName,
  formPhone,
  setFormPhone,
  formEmail,
  setFormEmail,
  formAddress,
  setFormAddress,
  formNotes,
  setFormNotes,
  submitting,
  handleSubmit,
  handleDelete,
  canWrite
}: SupplierDialogsProps) {
  if (!showModal) return null;

  return (
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

        {editingSupplier && canWrite && (
          <Button variant="ghost" className="w-full text-destructive hover:bg-destructive/10 text-xs h-8 rounded-xl" onClick={() => { setShowModal(false); handleDelete(editingSupplier); }}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus Supplier Ini
          </Button>
        )}
      </div>
    </div>
  );
}
