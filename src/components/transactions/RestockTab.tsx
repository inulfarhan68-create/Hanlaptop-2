import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PlusCircle, Trash2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import useSWR from "swr"
import { ModernSelect } from "@/components/ui/modern-select"
import { LaptopSpecForm } from "@/components/LaptopSpecForm"
import { Autocomplete } from "@/components/ui/autocomplete"
import { LAPTOP_MODELS } from "@/data/laptop-models"
import { INVENTORY_ITEMS } from "@/data/inventory-items"

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value)
}

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

const inventoryCategories = [
  "Laptop Bekas",
  "Sparepart",
  "Aksesoris",
  "Jasa Servis",
]

interface RestockTabProps {
  active: boolean
  editingTrx: any
  onCancelEdit: () => void
  onSuccess: () => void
}

export function RestockTab({ active, editingTrx, onCancelEdit, onSuccess }: RestockTabProps) {
  // SWR fetches
  const { data: inventoryData, mutate: mutateInventory } = useSWR((import.meta.env.VITE_API_URL || '') + '/api/inventory')
  const { data: suggestionsData, mutate: mutateSuggestions } = useSWR<any>((import.meta.env.VITE_API_URL || '') + '/api/suggestions')
  
  const mergedLaptopModels = Array.from(new Set([
    ...LAPTOP_MODELS,
    ...(Array.isArray(suggestionsData?.laptopModels) ? suggestionsData.laptopModels : [])
  ]))
  
  const mergedInventoryItems = Array.from(new Set([
    ...INVENTORY_ITEMS,
    ...(Array.isArray(suggestionsData?.inventoryItems) ? suggestionsData.inventoryItems : [])
  ]))
  
  const inventoryItems = Array.isArray(inventoryData) 
    ? inventoryData.map((item: any) => ({
        id: item.id,
        name: item.itemName,
        price: item.sellingPrice,
        stock: item.quantity,
        category: item.category,
        barcode: item.barcode
      }))
    : []

  const { data: suppliersData } = useSWR((import.meta.env.VITE_API_URL || '') + '/api/suppliers')
  const supplierOptions = Array.isArray(suppliersData) ? suppliersData.map((s: any) => s.name) : []

  // Local state
  const [restockMode, setRestockMode] = useState<"existing" | "new">("new")
  const [restockItemId, setRestockItemId] = useState("")
  const [restockQty, setRestockQty] = useState("")
  const [restockBuyPrice, setRestockBuyPrice] = useState("")
  const [restockSupplier, setRestockSupplier] = useState("")
  const [newItemName, setNewItemName] = useState("")
  const [newItemCategory, setNewItemCategory] = useState("")
  const [newItemSellPrice, setNewItemSellPrice] = useState("")
  const [newItemSpecs, setNewItemSpecs] = useState("")
  const [restockList, setRestockList] = useState<{ id?: string; name: string; category?: string; qty: number; buyPrice: number; sellPrice?: number; isNew: boolean; specs?: string }[]>([])
  
  const [paymentMethod, setPaymentMethod] = useState("Cash")
  const [dpAmount, setDpAmount] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const [aiLoading, setAiLoading] = useState(false)

  const handleAiSpecsCheck = async () => {
    if (!newItemName.trim()) {
      toast.error("Masukkan nama / model laptop terlebih dahulu.")
      return
    }
    setAiLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/public/buyback/estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: newItemName,
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal mendapatkan spesifikasi AI")

      const aiData = data.data
      if (!aiData) throw new Error("AI tidak mengembalikan hasil analisis wajar.")

      // Formatted specifications string
      const specString = `Processor: ${aiData.processor || ''} | VGA: ${aiData.vga || 'Integrated'} | RAM: ${aiData.ram || '8GB'} | Storage: ${aiData.storage || '256GB SSD'} | Layar: 14" FHD (1920x1080) | Keyboard: ${aiData.keyboard || 'Non-Backlight'} | OS: Windows 11 | Konektivitas: ${aiData.connectivity || 'Wi-Fi 6 + Bluetooth 5.1'} | Kondisi: Sangat Baik`

      setNewItemName(`${aiData.brand} ${aiData.model}`)
      setNewItemSpecs(specString)

      toast.success("Spesifikasi AI berhasil diterapkan ke form!")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setAiLoading(false)
    }
  }

  // Load draft from localStorage on mount
  useEffect(() => {
    if (editingTrx) return;
    
    const storeId = localStorage.getItem('selectedStoreId') || 'all';
    const draftStr = localStorage.getItem(`restock_draft_${storeId}`);
    if (draftStr) {
      try {
        const draft = JSON.parse(draftStr);
        if (draft.restockMode !== undefined) setRestockMode(draft.restockMode);
        if (draft.restockItemId !== undefined) setRestockItemId(draft.restockItemId);
        if (draft.restockQty !== undefined) setRestockQty(draft.restockQty);
        if (draft.restockBuyPrice !== undefined) setRestockBuyPrice(draft.restockBuyPrice);
        if (draft.restockSupplier !== undefined) setRestockSupplier(draft.restockSupplier);
        if (draft.newItemName !== undefined) setNewItemName(draft.newItemName);
        if (draft.newItemCategory !== undefined) setNewItemCategory(draft.newItemCategory);
        if (draft.newItemSellPrice !== undefined) setNewItemSellPrice(draft.newItemSellPrice);
        if (draft.newItemSpecs !== undefined) setNewItemSpecs(draft.newItemSpecs);
        if (draft.restockList !== undefined) setRestockList(draft.restockList);
        if (draft.paymentMethod !== undefined) setPaymentMethod(draft.paymentMethod);
        if (draft.dpAmount !== undefined) setDpAmount(draft.dpAmount);
        if (draft.dueDate !== undefined) setDueDate(draft.dueDate);
      } catch (e) {
        console.error("Failed to parse restock draft", e);
      }
    }
  }, [editingTrx]);

  // Save draft to localStorage when states change
  useEffect(() => {
    if (editingTrx) return;
    
    const storeId = localStorage.getItem('selectedStoreId') || 'all';
    const draft = {
      restockMode,
      restockItemId,
      restockQty,
      restockBuyPrice,
      restockSupplier,
      newItemName,
      newItemCategory,
      newItemSellPrice,
      newItemSpecs,
      restockList,
      paymentMethod,
      dpAmount,
      dueDate
    };
    
    const hasContent = restockList.length > 0 || restockItemId || restockQty || restockBuyPrice || restockSupplier || newItemName || newItemCategory || newItemSellPrice || newItemSpecs || dpAmount || dueDate;
    if (hasContent) {
      localStorage.setItem(`restock_draft_${storeId}`, JSON.stringify(draft));
    } else {
      localStorage.removeItem(`restock_draft_${storeId}`);
    }
  }, [restockMode, restockItemId, restockQty, restockBuyPrice, restockSupplier, newItemName, newItemCategory, newItemSellPrice, newItemSpecs, restockList, paymentMethod, dpAmount, dueDate, editingTrx]);

  // Re-fetch inventory when active
  useEffect(() => {
    if (active) {
      mutateInventory()
    }
  }, [active, mutateInventory])

  // Populate from editingTrx
  useEffect(() => {
    if (editingTrx && editingTrx.transactionType === "Pembelian Stok" && active) {
      setRestockSupplier(editingTrx.description ? editingTrx.description.replace('Supplier: ', '') : "")
      setPaymentMethod(editingTrx.paymentMethod || "Cash")
      setDpAmount(editingTrx.dpAmount ? editingTrx.dpAmount.toLocaleString('id-ID') : "")
      setDueDate(editingTrx.dueDate ? new Date(editingTrx.dueDate).toISOString().split('T')[0] : "")

      if (editingTrx.items && editingTrx.items.length > 0) {
        setRestockList(editingTrx.items.map((it: any) => ({
          id: it.inventoryId,
          name: it.inventoryItem ? it.inventoryItem.itemName : it.itemName,
          qty: it.quantity,
          buyPrice: it.unitPrice,
          isNew: false
        })))
      }
    }
  }, [editingTrx, active])

  const addToRestockList = () => {
    if (restockMode === "existing") {
      const item = inventoryItems.find(p => p.id === restockItemId)
      if (!item || !restockQty || !restockBuyPrice) return
      setRestockList([...restockList, { id: item.id, name: item.name, qty: parseInt(restockQty), buyPrice: parseCurrencyString(restockBuyPrice), isNew: false, sellPrice: item.price }])
    } else {
      if (!newItemName || !newItemCategory || !restockQty || !restockBuyPrice) return
      setRestockList([...restockList, { 
        name: newItemName, 
        category: newItemCategory,
        qty: parseInt(restockQty), 
        buyPrice: parseCurrencyString(restockBuyPrice), 
        isNew: true, 
        sellPrice: parseCurrencyString(newItemSellPrice),
        specs: newItemCategory === "Laptop Bekas" ? newItemSpecs : undefined
      }])
    }
    setRestockItemId("");
    setNewItemName("")
    setNewItemCategory("")
    setNewItemSellPrice("")
    setNewItemSpecs("")
    setRestockQty("")
    setRestockBuyPrice("")
  }

  const removeFromRestockList = (index: number) => setRestockList(restockList.filter((_, i) => i !== index))

  const restockTotal = restockList.reduce((sum, item) => sum + item.buyPrice * item.qty, 0)

  const handleRestockSubmit = async () => {
    if (restockList.length === 0 || submitting) return
    setSubmitting(true)
    try {
      const transactionType = "Pembelian Stok";
      const url = editingTrx ? `/api/transactions/${editingTrx.id}` : '/api/transactions';
      const method = editingTrx ? 'PUT' : 'POST';

      const restockPaymentStatus = paymentMethod === "Tempo" ? "Belum Lunas" : "Lunas";

      const matchedSupplier = Array.isArray(suppliersData) 
        ? suppliersData.find((s: any) => s.name.trim().toLowerCase() === restockSupplier.trim().toLowerCase())
        : null;
      const supplierId = matchedSupplier ? matchedSupplier.id : null;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionType,
          amount: restockTotal,
          description: `Supplier: ${restockSupplier}`,
          supplierId,
          paymentMethod,
          paymentStatus: restockPaymentStatus,
          dpAmount: restockPaymentStatus === "Belum Lunas" ? parseCurrencyString(dpAmount) : 0,
          dueDate: (paymentMethod === "Tempo" || restockPaymentStatus === "Belum Lunas") && dueDate ? dueDate : undefined,
          items: restockList.map((c: any) => ({
            inventoryId: c.id, 
            itemName: c.name, 
            category: c.category,
            quantity: c.qty, 
            unitPrice: c.buyPrice,
            sellingPrice: c.sellPrice,
            specs: c.specs
          }))
        })
      })
      if (res.ok) {
        setRestockList([]); setRestockSupplier(""); setDpAmount(""); setDueDate("");
        setPaymentMethod("Cash"); setRestockItemId("");
        setRestockQty(""); setRestockBuyPrice("");
        setNewItemName(""); setNewItemCategory(""); setNewItemSellPrice(""); setNewItemSpecs("");
        
        mutateInventory();
        mutateSuggestions();
        onSuccess();
        
        toast.success(editingTrx ? "Restock berhasil diubah!" : "Restock berhasil dicatat!");
        if (editingTrx) onCancelEdit();
      } else {
        const err = await res.json();
        toast.error(`Gagal mencatat restock: ${err.error || err.message || "Unknown error"}`)
      }
    } catch (e: any) {
      toast.error(`Error submitting restock: ${e.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid gap-3 md:grid-cols-3 text-left">
      <div className="md:col-span-2 space-y-3">
        <Card>
          <CardHeader className="pb-2 pt-3 px-3 border-b border-border/50">
            <CardTitle className="text-sm">Input Barang Restock</CardTitle>
            <CardDescription className="text-[10px]">Pilih barang terdaftar atau daftarkan baru</CardDescription>
          </CardHeader>
          <CardContent className="pt-3 px-3 pb-3 space-y-3">
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg text-xs font-semibold">
              <button onClick={() => setRestockMode("new")} className={`py-1.5 rounded-md transition-all ${restockMode === "new" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>Barang Baru</button>
              <button onClick={() => setRestockMode("existing")} className={`py-1.5 rounded-md transition-all ${restockMode === "existing" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>Stok Lama</button>
            </div>

            {restockMode === "existing" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Pilih Barang</label>
                  <ModernSelect 
                    value={restockItemId}
                    onChange={setRestockItemId}
                    options={inventoryItems.map(item => ({ value: item.id, label: `${item.name} (Stok: ${item.stock})` }))}
                    placeholder="Pilih Barang..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Harga Beli / Unit (Rp)</label>
                  <Input value={restockBuyPrice} onChange={e => handleCurrencyInput(e.target.value, setRestockBuyPrice)} placeholder="0" className="h-8 text-xs" />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Kategori</label>
                    <ModernSelect
                      value={newItemCategory}
                      onChange={setNewItemCategory}
                      options={inventoryCategories.map(cat => ({ value: cat, label: cat }))}
                      placeholder="Pilih Kategori..."
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-muted-foreground">Nama Barang Baru</label>
                      {newItemCategory === "Laptop Bekas" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAiSpecsCheck}
                          disabled={aiLoading || !newItemName.trim()}
                          className="h-6 text-[10px] px-1.5 py-0 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200 gap-0.5 animate-pulse"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          {aiLoading ? "Analisis..." : "Cek Spek AI ✨"}
                        </Button>
                      )}
                    </div>
                    <Autocomplete
                      placeholder="e.g. Acer Aspire 3"
                      value={newItemName}
                      onChange={setNewItemName}
                      options={newItemCategory === "Laptop Bekas" ? mergedLaptopModels : mergedInventoryItems}
                      inputClassName="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Harga Beli / Unit (Rp)</label>
                    <Input value={restockBuyPrice} onChange={e => handleCurrencyInput(e.target.value, setRestockBuyPrice)} placeholder="0" className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Harga Jual Rencana (Rp)</label>
                    <Input className="h-8 text-xs" value={newItemSellPrice} onChange={e => handleCurrencyInput(e.target.value, setNewItemSellPrice)} placeholder="e.g. 4.500.000" />
                  </div>
                </div>

                {newItemCategory === "Laptop Bekas" && (
                  <div className="pt-2 border-t">
                    <LaptopSpecForm value={newItemSpecs} onChange={setNewItemSpecs} />
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-t pt-2 mt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Jumlah (Qty)</label>
                <Input type="number" min="1" value={restockQty} onChange={e => setRestockQty(e.target.value)} placeholder="0" className="h-8 text-xs" />
              </div>
              <div className="flex items-end">
                <Button size="sm" onClick={addToRestockList} className="w-full h-8 text-xs font-semibold gap-1.5" variant="secondary">
                  <PlusCircle className="h-3.5 w-3.5" /> Tambah ke Daftar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-sm">Daftar Item Restock</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Barang</TableHead>
                  <TableHead className="w-[90px]">Status</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Harga Beli</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {restockList.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-xs">Belum ada item ditambahkan</TableCell></TableRow>
                ) : (
                  restockList.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-xs font-medium">
                        {item.name}
                      </TableCell>
                      <TableCell className="text-xs">
                        {item.isNew ? (
                          <span className="text-[10px] bg-cyan-500/10 text-cyan-600 border border-cyan-500/20 px-1.5 py-0.5 rounded font-bold uppercase">Baru</span>
                        ) : (
                          <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded font-bold uppercase">Terdaftar</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-right">{item.qty}</TableCell>
                      <TableCell className="text-xs text-right">{formatCurrency(item.buyPrice)}</TableCell>
                      <TableCell className="text-xs text-right font-semibold">{formatCurrency(item.buyPrice * item.qty)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeFromRestockList(idx)} className="h-6 w-6 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-base">Ringkasan Pembelian</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nama Supplier / Deskripsi</label>
              <Autocomplete
                placeholder="Cari atau masukkan nama supplier..."
                value={restockSupplier}
                onChange={setRestockSupplier}
                options={supplierOptions}
                inputClassName="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Metode Pembayaran</label>
              <ModernSelect 
                value={paymentMethod} 
                onChange={val => setPaymentMethod(val)}
                options={[
                  { value: "Cash", label: "Cash" },
                  { value: "Transfer Bank", label: "Transfer Bank" },
                  { value: "Tempo", label: "Tempo / Hutang" }
                ]}
              />
            </div>

            {paymentMethod === "Tempo" && (
              <div className="space-y-2 border-t pt-3 animate-in fade-in duration-200">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-amber-600">DP / Bayar Awal (Rp)</label>
                  <Input value={dpAmount} onChange={e => handleCurrencyInput(e.target.value, setDpAmount)} placeholder="e.g. 500.000" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-amber-600">Jatuh Tempo Hutang</label>
                  <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-9 text-sm text-foreground/80" />
                </div>
                <div className="flex justify-between text-xs pt-1 border-t">
                  <span className="text-muted-foreground">Sisa Hutang:</span>
                  <span className="font-semibold text-destructive">{formatCurrency(restockTotal - parseCurrencyString(dpAmount))}</span>
                </div>
              </div>
            )}

            <div className="border-t pt-3 space-y-1.5">
              <div className="flex justify-between font-bold text-lg">
                <span>Total Restock</span>
                <span className="text-primary">{formatCurrency(restockTotal)}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-2 pb-4">
            <Button className="w-full h-9 font-semibold" size="sm" disabled={restockList.length === 0 || submitting} onClick={handleRestockSubmit}>
              {submitting ? "Memproses..." : "Selesaikan Restock"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
export default RestockTab
