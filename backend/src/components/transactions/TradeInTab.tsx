import React, { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTenant } from "@/components/TenantProvider"
import { toast } from "sonner"
import { Search, PlusCircle, CheckCircle, Smartphone, Laptop, Trash, Package, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { calculateAdjustedPrice } from "@/lib/pricingUtils"

interface TradeInTabProps {
  active: boolean
  onPrint?: (data: any) => void
  editingTrx?: any
  onCancelEdit?: () => void
  onSuccess?: () => void
}

export function TradeInTab({ active, onSuccess }: TradeInTabProps) {
  const { activeStore } = useTenant()
  const selectedStoreId = activeStore?.id || 'all'
  const [type, setType] = useState<"Tukar Tambah" | "Buyback">("Buyback")
  const [loading, setLoading] = useState(false)

  const [oldUnit, setOldUnit] = useState({
    itemName: "",
    category: "Laptop Bekas",
    condition: "USED_B",
    specs: "",
    estimatedValue: 0
  })

  const [newUnit, setNewUnit] = useState<any>(null)
  
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    address: ""
  })
  const [paymentMethod, setPaymentMethod] = useState("Cash")
  const [notes, setNotes] = useState("")
  
  // States for AI estimation features
  const [purchaseYear, setPurchaseYear] = useState("")
  const [hasWarranty, setHasWarranty] = useState("no")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<any>(null)
  const [selectedGrade, setSelectedGrade] = useState<string>("USED_B")
  const [minusDetails, setMinusDetails] = useState("")

  // Helper to dynamically calculate recommended price by grade based on current purchaseYear and hasWarranty
  const getRecPrice = (grade: string) => {
    if (!aiResult) return 0;
    
    // Baseline specs from AI
    const baseline = {
      processorFamily: aiResult.processor || "Intel Core i5",
      ram: aiResult.ram || "8GB",
      storage: aiResult.storage || "256GB SSD",
      vgaType: aiResult.vga || "Integrated",
      purchaseYear: aiResult.aiBaselineYear || "2023",
      hasWarranty: aiResult.aiBaselineHasWarranty || false
    };

    const current = {
      processorFamily: aiResult.processor || "Intel Core i5",
      ram: aiResult.ram || "8GB",
      storage: aiResult.storage || "256GB SSD",
      vgaType: aiResult.vga || "Integrated",
      purchaseYear: purchaseYear || "2023",
      hasWarranty: hasWarranty === "yes",
      minusDetails: minusDetails
    };

    return calculateAdjustedPrice({
      baseMarketPrice: aiResult.lowestMarketPrice || 3000000,
      baseline,
      current,
      condition: grade
    });
  };

  const handleAiEstimate = async () => {
    if (!oldUnit.itemName.trim()) {
      toast.error("Masukkan nama unit / model laptop terlebih dahulu.")
      return
    }
    if (!purchaseYear.trim()) {
      toast.error("Masukkan Tahun Pembelian terlebih dahulu sebelum melakukan taksiran AI.")
      return
    }
    setAiLoading(true)
    setAiResult(null)
    try {
      const res = await apiFetch(`${''}/api/public/buyback/estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: oldUnit.itemName,
          purchaseYear: purchaseYear || undefined,
          hasWarranty: hasWarranty === "yes"
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal melakukan taksiran AI")

      setAiResult(data.data)
      
      const mappedGrade = oldUnit.condition === "USED_A" ? "USED_A" :
                           oldUnit.condition === "USED_C" ? "USED_C" :
                           oldUnit.condition === "BROKEN" ? "BROKEN" : "USED_B";
      setSelectedGrade(mappedGrade)
      toast.success("Taksiran AI berhasil didapatkan!")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setAiLoading(false)
    }
  }

  const applyAiSpecsAndPrice = () => {
    if (!aiResult) return

    const estimatedVal = getRecPrice(selectedGrade) || 0

    const specParts = [
      aiResult.processor,
      aiResult.vga && aiResult.vga !== "Integrated" ? `VGA: ${aiResult.vga}` : null,
      `RAM ${aiResult.ram}`,
      aiResult.storage,
      purchaseYear ? `Tahun ${purchaseYear}` : null,
      hasWarranty === "yes" ? "Garansi Resmi Aktif" : "Tanpa Garansi"
    ].filter(Boolean)

    setOldUnit({
      ...oldUnit,
      itemName: `${aiResult.brand} ${aiResult.model}`,
      condition: selectedGrade,
      specs: specParts.join(", "),
      estimatedValue: estimatedVal
    })

    toast.success("Spesifikasi dan harga AI berhasil diterapkan ke form!")
    setAiResult(null)
  }

  // For selecting new unit from inventory - use search API instead of fetching all
  const [searchQuery, setSearchQuery] = useState("")
  const [inventoryList, setInventoryList] = useState<any[]>([])
  const [isLoadingInventory, setIsLoadingInventory] = useState(false)

  // Fetch inventory when search query changes (for new unit selection)
  useEffect(() => {
    if (!active) return;
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setInventoryList([]);
      return;
    }
    fetchInventoryBySearch(searchQuery);
  }, [searchQuery, active])

  // 🔒 FIX: Use search API with pagination instead of fetching ALL inventory
  const fetchInventoryBySearch = async (query: string) => {
    try {
      setIsLoadingInventory(true);
      const storeId = localStorage.getItem('selectedStoreId') || 'all';
      if (storeId === 'all') return;

      const res = await apiFetch(`${''}/api/inventory?search=${encodeURIComponent(query)}&status=instock&limit=20`);
      if (!res.ok) throw new Error("Failed to fetch inventory");
      const data = await res.json();
      setInventoryList(data.data || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoadingInventory(false);
    }
  }

  const handleSelectNewUnit = (item: any) => {
    setNewUnit({
      inventoryId: item.id,
      itemName: item.itemName,
      quantity: 1,
      unitPrice: item.sellingPrice
    });
    setSearchQuery("");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!oldUnit.itemName || oldUnit.estimatedValue <= 0) {
      return toast.error("Data unit lama tidak valid")
    }
    if (type === "Tukar Tambah" && !newUnit) {
      return toast.error("Pilih unit baru untuk Tukar Tambah")
    }
    if (!customer.name) {
      return toast.error("Nama pelanggan wajib diisi")
    }
    if (!purchaseYear.trim()) {
      return toast.error("Tahun Pembelian wajib diisi")
    }

    setLoading(true)
    try {
      const res = await apiFetch(`${''}/api/transactions/trade-in-buyback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          oldUnit: {
            ...oldUnit,
            specs: (oldUnit.condition === "USED_C" || oldUnit.condition === "BROKEN") && minusDetails
              ? `${oldUnit.specs} | Minus: ${minusDetails}`
              : oldUnit.specs
          },
          newUnit: type === "Tukar Tambah" ? newUnit : undefined,
          customer,
          paymentMethod,
          notes
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan transaksi")

      toast.success(`Transaksi ${type} berhasil`)
      if (onSuccess) onSuccess()
      
      // Reset form
      setOldUnit({ itemName: "", category: "Laptop Bekas", condition: "USED_B", specs: "", estimatedValue: 0 })
      setMinusDetails("")
      setNewUnit(null)
      setCustomer({ name: "", phone: "", address: "" })
      
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!active) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="grid md:grid-cols-2 gap-4">
        
        {/* Left Column */}
        <div className="space-y-4">
          <Card className="border shadow-sm rounded-xl overflow-hidden">
            <div className="bg-slate-50 border-b p-3 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Laptop className="h-4 w-4" /> Jenis Transaksi
              </h3>
            </div>
            <CardContent className="p-4 space-y-4">
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant={type === "Buyback" ? "default" : "outline"} 
                  onClick={() => setType("Buyback")}
                  className="flex-1"
                >
                  Buyback (Beli Saja)
                </Button>
                <Button 
                  type="button" 
                  variant={type === "Tukar Tambah" ? "default" : "outline"} 
                  onClick={() => setType("Tukar Tambah")}
                  className="flex-1"
                >
                  Tukar Tambah
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm rounded-xl overflow-hidden">
            <div className="bg-slate-50 border-b p-3 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Smartphone className="h-4 w-4" /> Data Unit Bekas (Konsumen)
              </h3>
            </div>
            <CardContent className="p-4 space-y-3">
              <div className="space-y-1">
                <Label>Nama Unit / Model</Label>
                <div className="flex gap-2">
                  <Input 
                    value={oldUnit.itemName} 
                    onChange={e => setOldUnit({...oldUnit, itemName: e.target.value})} 
                    placeholder="Contoh: Asus ROG Strix G15" 
                    required 
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleAiEstimate}
                    disabled={aiLoading || !oldUnit.itemName}
                    variant="outline"
                    className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200 shrink-0 gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {aiLoading ? "Mencari..." : "Taksir AI ✨"}
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Kondisi Taksiran</Label>
                  <Select value={oldUnit.condition} onValueChange={(v: string) => setOldUnit({...oldUnit, condition: v})}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USED_A">Mulus (Grade A)</SelectItem>
                      <SelectItem value="USED_B">Normal (Grade B)</SelectItem>
                      <SelectItem value="USED_C">Minus (Grade C)</SelectItem>
                      <SelectItem value="BROKEN">Rusak (Rongsok)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Nilai Taksiran (Rp)</Label>
                  <Input type="number" min="0" value={oldUnit.estimatedValue || ''} onChange={e => setOldUnit({...oldUnit, estimatedValue: parseInt(e.target.value) || 0})} required />
                </div>
              </div>

              {(oldUnit.condition === "USED_C" || oldUnit.condition === "BROKEN") && (
                <div className="space-y-1">
                  <Label>Keterangan Minus / Rusak</Label>
                  <Input 
                    type="text"
                    required
                    placeholder="Contoh: keyboard double-click, layar bergaris, batre drop" 
                    value={minusDetails} 
                    onChange={e => setMinusDetails(e.target.value)} 
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Tahun Pembelian</Label>
                  <Input 
                    type="number" 
                    required
                    placeholder="Contoh: 2024" 
                    value={purchaseYear} 
                    onChange={e => setPurchaseYear(e.target.value)} 
                  />
                </div>
                <div className="space-y-1">
                  <Label>Garansi Resmi</Label>
                  <Select value={hasWarranty} onValueChange={setHasWarranty}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">Habis / Tidak Ada</SelectItem>
                      <SelectItem value="yes">Masih Aktif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Spesifikasi / Kelengkapan</Label>
                <Input value={oldUnit.specs} onChange={e => setOldUnit({...oldUnit, specs: e.target.value})} placeholder="Contoh: Core i5, RAM 8GB, Dus, Charger" />
              </div>

              {/* AI Loading State */}
              {aiLoading && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed flex flex-col items-center justify-center space-y-2 animate-pulse">
                  <Sparkles className="w-5 h-5 text-indigo-500 animate-spin" />
                  <span className="text-xs text-slate-500 font-medium">Menghubungi AI & Mencari Harga Pasar Tokopedia/Shopee/FB...</span>
                </div>
              )}

              {/* AI Estimate Results Panel */}
              {aiResult && (
                <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl space-y-3 text-left">
                  <div className="flex items-center gap-1.5 text-indigo-900 dark:text-indigo-300 font-bold text-xs">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    <span>Hasil Analisis AI Gemini Grounding</span>
                  </div>

                  {/* Detected Specs */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-indigo-50 dark:border-indigo-950">
                    <div>
                      <span className="text-slate-400 block">Brand & Model:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{aiResult.brand} {aiResult.model}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Prosesor:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{aiResult.processor}</span>
                    </div>
                    <div className="mt-1">
                      <span className="text-slate-400 block">RAM & Storage:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{aiResult.ram} / {aiResult.storage}</span>
                    </div>
                    <div className="mt-1">
                      <span className="text-slate-400 block">Grafis (VGA):</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{aiResult.vga}</span>
                    </div>
                  </div>

                  {/* Market Price Reference (Admin Only) */}
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-slate-500">Harga Pasar Terendah (Referensi Internal):</div>
                    <div className="flex items-baseline gap-2 bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded-lg border border-emerald-100/50 dark:border-emerald-900/50">
                      <span className="text-emerald-700 dark:text-emerald-400 font-extrabold text-base">
                        Rp {aiResult.lowestMarketPrice?.toLocaleString("id-ID") || '-'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        (Margin 30% sudah diterapkan pada harga tawaran)
                      </span>
                    </div>
                  </div>

                  {/* Recommended Buyback/Trade-in price by Grade */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-500">Rekomendasi Beli (Ada Margin Aman & Sehat):</div>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.keys(aiResult.recommendedOfferPrice).map((grade: string) => {
                        const price = getRecPrice(grade);
                        const gradeNames: any = {
                          USED_A: "Grade A (Mulus)",
                          USED_B: "Grade B (Normal)",
                          USED_C: "Grade C (Minus)",
                          BROKEN: "Broken (Rusak)"
                        };
                        return (
                          <button
                            key={grade}
                            type="button"
                            onClick={() => setSelectedGrade(grade)}
                            className={`p-2 rounded-lg border text-left transition-all ${
                              selectedGrade === grade
                                ? "border-indigo-600 bg-indigo-600 text-white font-semibold"
                                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                            }`}
                          >
                            <div className="text-[10px] opacity-90">{gradeNames[grade] || grade}</div>
                            <div className="text-xs font-bold">Rp {price.toLocaleString("id-ID")}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>



                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8"
                      onClick={applyAiSpecsAndPrice}
                    >
                      Terapkan Spesifikasi & Rekomendasi
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-slate-500 hover:bg-slate-100 text-xs h-8"
                      onClick={() => setAiResult(null)}
                    >
                      Batal
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          
          {type === "Tukar Tambah" && (
            <Card className="border border-blue-200 shadow-sm rounded-xl overflow-hidden bg-blue-50/30">
              <div className="bg-blue-100/50 border-b border-blue-200 p-3 flex justify-between items-center">
                <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                  <Package className="h-4 w-4" /> Unit Baru (Dari Toko)
                </h3>
              </div>
              <CardContent className="p-4 space-y-3">
                {!newUnit ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Ketik 2+ karakter untuk cari laptop..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    {/* Autocomplete dropdown - now using server-side search */}
                    {searchQuery.length >= 2 && (
                      <div className="bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto w-full z-10">
                        {isLoadingInventory ? (
                          <div className="p-3 text-center text-sm text-muted-foreground">Mencari...</div>
                        ) : inventoryList.length > 0 ? (
                          inventoryList.map((item) => (
                            <div key={item.id} className="p-2 border-b hover:bg-slate-50 cursor-pointer flex justify-between" onClick={() => handleSelectNewUnit(item)}>
                              <div>
                                <div className="font-medium text-sm">{item.itemName}</div>
                                <div className="text-xs text-slate-500">Stok: {item.quantity}</div>
                              </div>
                              <div className="font-bold text-sm text-green-600">Rp {item.sellingPrice.toLocaleString()}</div>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-center text-sm text-muted-foreground">Barang tidak ditemukan</div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-white p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{newUnit.itemName}</div>
                      <div className="text-sm font-bold text-green-600">Rp {newUnit.unitPrice.toLocaleString()}</div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setNewUnit(null)} className="text-red-500 h-8 w-8 p-0"><Trash className="h-4 w-4"/></Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="border shadow-sm rounded-xl overflow-hidden">
            <div className="bg-slate-50 border-b p-3">
              <h3 className="font-semibold text-slate-800">Pelanggan & Pembayaran</h3>
            </div>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Nama</Label>
                  <Input value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} required />
                </div>
                <div className="space-y-1">
                  <Label>No. HP</Label>
                  <Input value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Metode Pembayaran</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash / Tunai</SelectItem>
                    <SelectItem value="Transfer Bank">Transfer Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Rangkuman */}
              <div className="bg-slate-100 p-3 rounded-lg mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Nilai Tukar/Buyback:</span>
                  <span className="font-semibold text-red-600">- Rp {oldUnit.estimatedValue.toLocaleString()}</span>
                </div>
                {type === "Tukar Tambah" && newUnit && (
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">Harga Unit Baru:</span>
                    <span className="font-semibold text-green-600">+ Rp {newUnit.unitPrice.toLocaleString()}</span>
                  </div>
                )}
                <div className="border-t border-slate-300 my-2 pt-2 flex justify-between font-bold text-lg">
                  <span>{type === "Buyback" ? "Toko Bayar" : (newUnit && (newUnit.unitPrice - oldUnit.estimatedValue > 0) ? "Sisa Bayar Konsumen" : "Toko Kembalikan")}</span>
                  <span>
                    Rp {type === "Buyback" ? oldUnit.estimatedValue.toLocaleString() : (newUnit ? Math.abs(newUnit.unitPrice - oldUnit.estimatedValue).toLocaleString() : 0)}
                  </span>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
      
      <div className="flex justify-end pt-2">
        <Button type="submit" className="w-full md:w-auto h-12 px-8 font-bold" disabled={loading}>
          {loading ? "Menyimpan..." : "Simpan Transaksi"}
        </Button>
      </div>
    </form>
  )
}

