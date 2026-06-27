import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { X, Lock, Coins, Calendar, FileText, Calculator } from "lucide-react"
import { mutate } from "swr"

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)
}

interface ShiftOpenModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ShiftOpenModal({ open, onClose, onSuccess }: ShiftOpenModalProps) {
  const [openingBalance, setOpeningBalance] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const balanceNum = parseFloat(openingBalance.replace(/\D/g, "")) || 0
    
    setLoading(true)
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || "") + "/api/shifts/open", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-store-id": localStorage.getItem("selectedStoreId") || "all"
        },
        body: JSON.stringify({
          openingBalance: balanceNum,
          notes
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Gagal membuka shift")
      }

      toast.success("Shift kasir berhasil dibuka!")
      mutate((import.meta.env.VITE_API_URL || "") + "/api/shifts/active")
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan")
    } finally {
      setLoading(false)
    }
  }

  // Helper to format input value as currency on typing
  const handleBalanceChange = (val: string) => {
    const clean = val.replace(/\D/g, "")
    if (!clean) {
      setOpeningBalance("")
      return
    }
    setOpeningBalance(Number(clean).toLocaleString("id-ID"))
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200 overflow-hidden text-foreground">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center gap-3 pb-2 border-b border-border/50">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-none">Buka Shift Kasir</h3>
              <p className="text-xs text-muted-foreground mt-1">Masukkan modal awal uang di laci kasir</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5" /> Nominal Modal Awal (Cash)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">Rp</span>
              <Input
                required
                type="text"
                placeholder="0"
                className="pl-9 text-sm font-bold h-10 border-border/80"
                value={openingBalance}
                onChange={(e) => handleBalanceChange(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Catatan Opsional
            </label>
            <Input
              type="text"
              placeholder="Contoh: Shift Pagi, Uang pecahan kecil lengkap..."
              className="text-xs h-10 border-border/80"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-10 text-xs font-bold rounded-xl"
              onClick={onClose}
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="flex-1 h-10 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl shadow-md"
              disabled={loading}
            >
              {loading ? "Membuka..." : "Mulai Shift"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

interface ShiftCloseModalProps {
  open: boolean
  activeShift: any
  onClose: () => void
  onSuccess: () => void
}

export function ShiftCloseModal({ open, activeShift, onClose, onSuccess }: ShiftCloseModalProps) {
  const [closingBalance, setClosingBalance] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)

  if (!open || !activeShift) return null

  const expected = activeShift.expectedBalance || 0

  const handleClosingBalanceChange = (val: string) => {
    const clean = val.replace(/\D/g, "")
    if (!clean) {
      setClosingBalance("")
      return
    }
    setClosingBalance(Number(clean).toLocaleString("id-ID"))
  }

  const parsedClosing = parseFloat(closingBalance.replace(/\D/g, "")) || 0
  const difference = parsedClosing - expected

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setLoading(true)
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || "") + "/api/shifts/close", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-store-id": localStorage.getItem("selectedStoreId") || "all"
        },
        body: JSON.stringify({
          closingBalance: parsedClosing,
          notes
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Gagal menutup shift")
      }

      toast.success("Shift kasir berhasil ditutup!")
      mutate((import.meta.env.VITE_API_URL || "") + "/api/shifts/active")
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan")
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200 overflow-hidden text-foreground">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center gap-3 pb-2 border-b border-border/50">
            <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-none">Tutup Shift Kasir</h3>
              <p className="text-xs text-muted-foreground mt-1">Hitung fisik uang tunai di laci kasir</p>
            </div>
          </div>

          {/* Shift Details Summary */}
          <div className="bg-muted/40 border border-border/40 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kasir:</span>
              <span className="font-bold">{activeShift.userName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Waktu Buka:</span>
              <span className="font-semibold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                {new Date(activeShift.openedAt).toLocaleString("id-ID", {
                  dateStyle: "medium",
                  timeStyle: "short"
                })}
              </span>
            </div>
            <hr className="border-border/40" />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Modal Awal:</span>
              <span className="font-bold">{formatCurrency(activeShift.openingBalance)}</span>
            </div>
            <div className="flex justify-between items-center bg-primary/5 p-1.5 rounded-lg border border-primary/10">
              <span className="text-primary font-semibold">Estimasi Kas Sistem:</span>
              <span className="font-black text-sm text-primary">{formatCurrency(expected)}</span>
            </div>
          </div>

          {/* Closing Cash Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5" /> Total Uang Fisik Aktual (Cash)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">Rp</span>
              <Input
                required
                type="text"
                placeholder="0"
                className="pl-9 text-sm font-black h-10 border-border/80 focus-visible:ring-rose-500/50"
                value={closingBalance}
                onChange={(e) => handleClosingBalanceChange(e.target.value)}
              />
            </div>
          </div>

          {/* Real-time Cash Difference */}
          {closingBalance && (
            <div className={`p-3 rounded-xl border text-xs font-bold flex justify-between items-center transition-all ${
              difference === 0 
                ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-500"
                : difference < 0
                ? "bg-rose-500/5 border-rose-500/20 text-rose-500"
                : "bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-500"
            }`}>
              <span>Selisih Laci:</span>
              <span className="text-sm font-black">
                {difference === 0 ? "Rp 0 (Cocok)" : `${difference > 0 ? "+" : ""}${formatCurrency(difference)} (${difference > 0 ? "Lebih" : "Kurang"})`}
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Catatan Penutupan
            </label>
            <Input
              type="text"
              placeholder="Contoh: Selisih Rp 2.000 karena uang kembalian permen..."
              className="text-xs h-10 border-border/80"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-10 text-xs font-bold rounded-xl"
              onClick={onClose}
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="flex-1 h-10 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-md border-none"
              disabled={loading}
            >
              {loading ? "Menutup..." : "Konfirmasi Tutup Shift"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
