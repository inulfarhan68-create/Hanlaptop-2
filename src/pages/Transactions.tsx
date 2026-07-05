import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useLocation } from "react-router-dom"
import { History, Package, Briefcase, ArrowUpCircle, CreditCard, PlusCircle, Lock, Unlock, Edit2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUserRole } from "@/hooks/useUserRole"
import useSWR from "swr"
import { ShiftOpenModal } from "@/components/ShiftModal"

// Import modular tab components
import { SalesTab } from "@/components/transactions/SalesTab"
import { RestockTab } from "@/components/transactions/RestockTab"
import { ExpenseTab } from "@/components/transactions/ExpenseTab"
import { HistoryTab } from "@/components/transactions/HistoryTab"
import { PrintInvoicePortal } from "@/components/transactions/PrintInvoicePortal"
import { TradeInTab } from "@/components/transactions/TradeInTab"

type TransactionMode = "Penjualan" | "Servis" | "Pembelian" | "Pengeluaran" | "Modal" | "Tukar Tambah" | "Riwayat"

const tabConfig: { key: TransactionMode; label: string; desc: string; icon: any }[] = [
  { key: "Penjualan", label: "Penjualan", desc: "Penjualan barang fisik", icon: Package },
  { key: "Tukar Tambah", label: "Tukar Tambah", desc: "Tukar Tambah & Buyback", icon: Package },
  { key: "Pembelian", label: "Beli Stok", desc: "Restock barang", icon: PlusCircle },
  { key: "Pengeluaran", label: "Pengeluaran", desc: "Biaya operasional", icon: CreditCard },
  { key: "Modal", label: "Modal/Prive", desc: "Dana pemilik", icon: ArrowUpCircle },
]

export function Transactions() {
  const location = useLocation()
  const { isOwner, isKasir, isInvestor, isManager } = useUserRole()
  const selectedStoreId = localStorage.getItem('selectedStoreId') || 'all';

  // SWR calls
  const { data: activeShiftData, mutate: mutateShift } = useSWR(
    selectedStoreId !== 'all' ? (import.meta.env.VITE_API_URL || '') + '/api/shifts/active' : null
  )
  const activeShift = activeShiftData?.activeShift || null
  const { data: storeSettings } = useSWR<any>((import.meta.env.VITE_API_URL || '') + '/api/settings')

  const cachedEnableShift = localStorage.getItem("enableCashierShift")
  const enableCashierShift = storeSettings 
    ? storeSettings.enableCashierShift !== false 
    : cachedEnableShift !== "false"

  useEffect(() => {
    if (storeSettings) {
      localStorage.setItem("enableCashierShift", storeSettings.enableCashierShift !== false ? "true" : "false")
    }
  }, [storeSettings])

  const filteredTabs = useMemo(() => {
    if (isInvestor) return [] as typeof tabConfig
    if (isKasir) {
      return tabConfig.filter(t => t.key === "Penjualan" || t.key === "Tukar Tambah")
    }
    return tabConfig
  }, [isKasir, isInvestor])

  // UI Modes
  const [showOpenModal, setShowOpenModal] = useState(false)
  const [mode, setMode] = useState<TransactionMode>(() => {
    if (selectedStoreId === "all" || isInvestor) return "Riwayat";
    const searchParams = new URLSearchParams(location.search)
    const modeParam = searchParams.get("mode") as TransactionMode
    const allowedKeys = isKasir ? ["Penjualan", "Tukar Tambah"] : ["Penjualan", "Tukar Tambah", "Pembelian", "Pengeluaran", "Modal"]
    return (allowedKeys.includes(modeParam) || modeParam === "Riwayat") ? modeParam : "Penjualan"
  })

  // Edit and Print states
  const [editingTrx, setEditingTrx] = useState<any>(null)
  const [printData, setPrintData] = useState<any>(null)

  useEffect(() => {
    if (selectedStoreId === "all" || isInvestor) {
      if (mode !== "Riwayat") {
        setMode("Riwayat");
      }
      return;
    }
    const searchParams = new URLSearchParams(location.search)
    const modeParam = searchParams.get("mode") as TransactionMode
    const allowedKeys = isKasir ? ["Penjualan", "Tukar Tambah"] : ["Penjualan", "Tukar Tambah", "Pembelian", "Pengeluaran", "Modal"]

    if (modeParam && (allowedKeys.includes(modeParam) || modeParam === "Riwayat")) {
      if (mode !== modeParam) {
        setMode(modeParam)
      }
    } else {
      if (mode !== "Riwayat" && !allowedKeys.includes(mode)) {
        setMode("Penjualan")
      }
    }
  }, [location.search, selectedStoreId, isKasir, isInvestor, mode])

  const handleStartEdit = (trx: any) => {
    if (!isOwner && !isManager) {
      toast.error("Anda tidak memiliki akses untuk mengubah transaksi");
      return;
    }
    setEditingTrx(trx)
    // Map backend type names to client tab modes
    let targetMode: TransactionMode = "Penjualan"
    if (trx.transactionType === "Jasa Servis") targetMode = "Servis"
    else if (trx.transactionType === "Pembelian Stok") targetMode = "Pembelian"
    else if (trx.transactionType === "Tukar Tambah" || trx.transactionType === "Buyback") targetMode = "Tukar Tambah"
    else if (trx.transactionType === "Operasional") targetMode = "Pengeluaran"
    else if (["Modal Baru", "Prive", "Pinjaman Bank", "Pelunasan Hutang", "Pembelian Aset Tetap", "Penjualan Aset Tetap"].includes(trx.transactionType)) {
      targetMode = "Modal"
    }
    setMode(targetMode)
    toast.success(`Mode Edit: ${trx.transactionType}`);
  }

  return (
    <>
      <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 print:hidden">
        {/* Sticky Page Header */}
        <div className="sticky top-0 z-40 shrink-0 flex flex-col gap-2 p-2 sm:p-3 md:px-5 md:py-3 bg-white/80 light-blue:bg-white dark:bg-card backdrop-blur-xl rounded-2xl md:rounded-[2rem] border border-border shadow-sm mt-0 mb-2">
          <div className="flex flex-row items-center justify-between">
            <div>
              <h2 className="text-lg md:text-xl font-bold tracking-tight">Transactions</h2>
              <p className="text-muted-foreground mt-0.5 text-[10px] md:text-xs font-medium">Catat semua aktivitas keuangan toko Anda</p>
            </div>
            <Button 
              variant={mode === "Riwayat" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("Riwayat")}
              className="flex items-center gap-1.5 h-8 md:h-9 px-2 md:px-3 border-border hover:bg-muted"
            >
              <History className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="text-xs md:text-sm font-medium">Riwayat</span>
            </Button>
          </div>
          
          {/* Mode Tabs */}
          {selectedStoreId !== "all" && filteredTabs.length > 0 && (
            <div className="-mx-1 md:mx-0">
              <div className={cn(
                "flex md:grid gap-1.5 md:gap-2 p-1.5 bg-muted/30 dark:bg-muted rounded-2xl border border-border shadow-inner overflow-x-auto scrollbar-hide",
                filteredTabs.length === 2 ? "md:grid-cols-2" : "md:grid-cols-5"
              )}>
                {filteredTabs.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setMode(key)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 whitespace-nowrap shrink-0 min-w-[72px] md:min-w-0",
                      mode === key
                        ? "bg-primary dark:bg-accent shadow-sm text-primary-foreground dark:text-accent-foreground border border-transparent"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-accent"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {selectedStoreId === "all" && mode === "Riwayat" && (
            <div className="mt-2 p-3 bg-amber-50 text-amber-800 rounded-xl text-sm flex items-center gap-2 border border-amber-200 shadow-sm mx-1 md:mx-0 text-left">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Anda sedang melihat <strong>Semua Cabang</strong>. Fitur tambah atau edit transaksi dinonaktifkan. Silakan pilih cabang spesifik untuk melakukan transaksi.
            </div>
          )}
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-x-hidden space-y-2">
          {editingTrx && mode !== "Riwayat" && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 mx-1 md:mx-0">
              <div className="flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Mode Edit Transaksi Aktif ({editingTrx.transactionType})</span>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs bg-white text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => {
                setEditingTrx(null);
                setMode("Riwayat");
              }}>Batal Edit</Button>
            </div>
          )}

          {!isOwner && !activeShift && selectedStoreId !== 'all' && mode !== "Riwayat" && enableCashierShift ? (
            /* ── SHIFT CLOSED BLOCKER ── */
            <div className="max-w-md mx-auto w-full py-12 px-4 animate-in fade-in duration-300">
              <Card className="border border-rose-500/20 shadow-xl bg-card/60 backdrop-blur-md rounded-2xl">
                <CardHeader className="text-center pb-2 flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20 mb-3">
                    <Lock className="w-7 h-7" />
                  </div>
                  <CardTitle className="text-lg font-extrabold text-foreground">Shift Kasir Belum Dibuka</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    Masa shift kasir Anda di cabang ini sedang tutup. Anda harus membuka shift terlebih dahulu dengan memasukkan modal awal untuk memulai transaksi.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2 text-center pb-6">
                  <Button
                    onClick={() => setShowOpenModal(true)}
                    className="w-full h-10 font-bold bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl shadow-md gap-2 cursor-pointer"
                  >
                    <Unlock className="w-4 h-4" /> Buka Shift Kasir Sekarang
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              <div className={cn(mode !== "Penjualan" && "hidden")}>
                <SalesTab 
                  active={mode === "Penjualan"}
                  onPrint={setPrintData}
                  editingTrx={editingTrx}
                  onCancelEdit={() => setEditingTrx(null)}
                  onSuccess={() => mutateShift()}
                />
              </div>

              <div className={cn(mode !== "Pembelian" && "hidden")}>
                <RestockTab 
                  active={mode === "Pembelian"}
                  editingTrx={editingTrx}
                  onCancelEdit={() => setEditingTrx(null)}
                  onSuccess={() => mutateShift()}
                />
              </div>

              <div className={cn(mode !== "Tukar Tambah" && "hidden")}>
                <TradeInTab 
                  active={mode === "Tukar Tambah"}
                  onPrint={setPrintData}
                  editingTrx={editingTrx}
                  onCancelEdit={() => setEditingTrx(null)}
                  onSuccess={() => mutateShift()}
                />
              </div>

              <div className={cn(mode !== "Pengeluaran" && "hidden")}>
                <ExpenseTab 
                  active={mode === "Pengeluaran"}
                  mode="Pengeluaran"
                  editingTrx={editingTrx}
                  onCancelEdit={() => setEditingTrx(null)}
                  onSuccess={() => mutateShift()}
                />
              </div>

              <div className={cn(mode !== "Modal" && "hidden")}>
                <ExpenseTab 
                  active={mode === "Modal"}
                  mode="Modal"
                  editingTrx={editingTrx}
                  onCancelEdit={() => setEditingTrx(null)}
                  onSuccess={() => mutateShift()}
                />
              </div>

              {/* Conditional rendering for Riwayat to optimize heavy logs rendering */}
              {mode === "Riwayat" && (
                <HistoryTab 
                  isOwner={isOwner}
                  onPrint={setPrintData}
                  onStartEdit={handleStartEdit}
                  storeSettings={storeSettings}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* A4 Print Invoice Portal Component */}
      {printData && (
        <PrintInvoicePortal 
          printData={printData}
          storeSettings={storeSettings}
          onClose={() => setPrintData(null)}
        />
      )}

      {/* Buka Shift Modal */}
      <ShiftOpenModal 
        open={showOpenModal} 
        onClose={() => setShowOpenModal(false)} 
        onSuccess={() => mutateShift()} 
      />
    </>
  )
}
