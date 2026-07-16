import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CreditCard, ArrowUpCircle } from "lucide-react"
import { toast } from "sonner"
import { ModernSelect } from "@/components/ui/modern-select"

const handleCurrencyInput = (val: string, setter: (v: string) => void) => {
  const digits = val.replace(/\D/g, "")
  if (!digits) {
    setter("")
    return
  }
  setter(parseInt(digits, 10).toLocaleString('id-ID'))
}

const parseCurrencyString = (val: string) => {
  if (!val) return 0
  return parseFloat(val.replace(/\D/g, "")) || 0
}

const expenseCategories = [
  "Beban Gaji Karyawan",
  "Beban Listrik & Internet",
  "Beban Sewa Tempat",
  "Beban ATK & Perlengkapan",
  "Beban Pemasaran / Iklan",
  "Beban Transportasi",
  "Beban Perbaikan & Perawatan",
  "Beban Lain-lain",
]

const capitalInCategories = [
  "Tambah Modal Pemilik",
  "Pinjaman Bank / Kreditur",
  "Penjualan Aset Tetap",
]

const capitalOutCategories = [
  "Prive (Pengambilan Dana Pemilik)",
  "Pelunasan Hutang",
  "Pembelian Aset Tetap",
]

interface ExpenseTabProps {
  active: boolean
  mode: "Pengeluaran" | "Modal"
  editingTrx: any
  onCancelEdit: () => void
  onSuccess: () => void
}

export function ExpenseTab({ active, mode, editingTrx, onCancelEdit, onSuccess }: ExpenseTabProps) {
  // Form states
  const [expenseCategory, setExpenseCategory] = useState("")
  const [expenseAmount, setExpenseAmount] = useState("")
  const [expenseDesc, setExpenseDesc] = useState("")
  const [capitalType, setCapitalType] = useState<"in" | "out">("in")
  const [submitting, setSubmitting] = useState(false)
  const { data: settings } = useSWR<any>(
    '/api/settings'
  )

  // Determine current categories
  const categories = mode === "Pengeluaran" 
    ? (settings?.expenseCategories || expenseCategories) 
    : (capitalType === "in" ? capitalInCategories : capitalOutCategories)

  // Populate from editingTrx
  useEffect(() => {
    if (editingTrx && active) {
      const isExpense = editingTrx.transactionType === "Operasional"
      const isCapital = ["Modal Baru", "Prive", "Pinjaman Bank", "Pelunasan Hutang", "Pembelian Aset Tetap", "Penjualan Aset Tetap"].includes(editingTrx.transactionType)
      
      if ((mode === "Pengeluaran" && isExpense) || (mode === "Modal" && isCapital)) {
        const parts = (editingTrx.description || "").split(" - ")
        setExpenseCategory(parts[0] || "")
        setExpenseDesc(parts[1] || "")
        setExpenseAmount(editingTrx.amount ? editingTrx.amount.toLocaleString('id-ID') : "")
        
        if (isCapital) {
          setCapitalType(
            editingTrx.transactionType === "Modal Baru" || 
            editingTrx.transactionType === "Pinjaman Bank" || 
            editingTrx.transactionType === "Penjualan Aset Tetap" 
              ? "in" 
              : "out"
          )
        }
      }
    }
  }, [editingTrx, active, mode])

  const handleExpenseCapitalSubmit = async () => {
    if (!expenseAmount || !expenseCategory || submitting) return
    setSubmitting(true)
    try {
      let type = "Operasional"
      if (mode === "Modal") {
        if (expenseCategory === "Pinjaman Bank / Kreditur") type = "Pinjaman Bank"
        else if (expenseCategory === "Pelunasan Hutang") type = "Pelunasan Hutang"
        else if (expenseCategory === "Pembelian Aset Tetap") type = "Pembelian Aset Tetap"
        else if (expenseCategory === "Penjualan Aset Tetap") type = "Penjualan Aset Tetap"
        else if (capitalType === "in") type = "Modal Baru"
        else type = "Prive"
      }
      
      const url = editingTrx ? `/api/transactions/${editingTrx.id}` : '/api/transactions';
      const method = editingTrx ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionType: type,
          amount: parseCurrencyString(expenseAmount),
          description: `${expenseCategory} - ${expenseDesc}`,
          paymentMethod: "Cash"
        })
      })
      if (res.ok) {
        setExpenseAmount(""); setExpenseDesc(""); setExpenseCategory("");
        
        onSuccess();

        toast.success(editingTrx ? "Pencatatan berhasil diubah!" : "Pencatatan berhasil!");
        if (editingTrx) onCancelEdit();
      } else {
        toast.error("Gagal mencatat data")
      }
    } catch (e) {
      toast.error("Error submitting data")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto w-full text-left animate-in fade-in duration-300">
      <Card>
        <CardHeader className="p-3 md:p-4 pb-2 border-b border-border/50">
          <CardTitle className="text-sm md:text-base flex items-center gap-2 text-primary">
            {mode === "Pengeluaran" ? (
              <>
                <CreditCard className="h-4 w-4 md:h-5 md:w-5" />
                Catat Pengeluaran Operasional
              </>
            ) : (
              <>
                <ArrowUpCircle className="h-4 w-4 md:h-5 md:w-5" />
                Mutasi Modal / Prive Toko
              </>
            )}
          </CardTitle>
          <CardDescription className="text-xs">
            {mode === "Pengeluaran" 
              ? "Catat pengeluaran operasional toko seperti sewa, gaji, atau listrik." 
              : "Catat penambahan modal pemilik, pinjaman bank, atau pengambilan prive."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 md:p-4 pt-3 space-y-4">
          {mode === "Modal" && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg text-xs font-semibold">
              <button 
                type="button"
                onClick={() => {
                  setCapitalType("in")
                  setExpenseCategory("")
                }} 
                className={`py-1.5 rounded-md transition-all ${capitalType === "in" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                Uang Masuk (Modal)
              </button>
              <button 
                type="button"
                onClick={() => {
                  setCapitalType("out")
                  setExpenseCategory("")
                }} 
                className={`py-1.5 rounded-md transition-all ${capitalType === "out" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                Uang Keluar (Prive/Aset)
              </button>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium">Kategori Kebutuhan</label>
            <ModernSelect 
              value={expenseCategory}
              onChange={setExpenseCategory}
              options={categories.map((cat: string) => ({ value: cat, label: cat }))}
              placeholder="Pilih Kategori..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Jumlah Pengeluaran / Nominal (Rp)</label>
            <Input 
              type="text" 
              placeholder="e.g. 500.000" 
              value={expenseAmount} 
              onChange={(e) => handleCurrencyInput(e.target.value, setExpenseAmount)} 
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Catatan / Detail Tambahan</label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
              placeholder="Tuliskan keterangan detail di sini..."
              value={expenseDesc}
              onChange={(e) => setExpenseDesc(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4 flex justify-end">
          <Button 
            className="w-full sm:w-auto font-semibold" 
            onClick={handleExpenseCapitalSubmit} 
            disabled={!expenseAmount || !expenseCategory || submitting}
          >
            {submitting ? "Memproses..." : "Simpan Data"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
export default ExpenseTab

