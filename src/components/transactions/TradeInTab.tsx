import React, { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Search, PlusCircle, CheckCircle, Smartphone, Laptop, Trash, Package } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface TradeInTabProps {
  active: boolean
  onPrint?: (data: any) => void
  editingTrx?: any
  onCancelEdit?: () => void
  onSuccess?: () => void
}

export function TradeInTab({ active, onSuccess }: TradeInTabProps) {
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
  
  // For selecting new unit from inventory
  const [searchQuery, setSearchQuery] = useState("")
  const [inventoryList, setInventoryList] = useState<any[]>([])

  useEffect(() => {
    if (!active) return;
    fetchInventory();
  }, [active])

  const fetchInventory = async () => {
    try {
      const storeId = localStorage.getItem('selectedStoreId') || 'all';
      if (storeId === 'all') return;
      
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/inventory?storeId=${storeId}`);
      if (!res.ok) throw new Error("Failed to fetch inventory");
      const data = await res.json();
      setInventoryList(data.filter((item: any) => item.quantity > 0));
    } catch (err: any) {
      toast.error(err.message);
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

    setLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/transactions/trade-in-buyback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          oldUnit,
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
                <Input value={oldUnit.itemName} onChange={e => setOldUnit({...oldUnit, itemName: e.target.value})} placeholder="Contoh: Asus ROG Strix" required />
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
              <div className="space-y-1">
                <Label>Spesifikasi / Kelengkapan</Label>
                <Input value={oldUnit.specs} onChange={e => setOldUnit({...oldUnit, specs: e.target.value})} placeholder="Contoh: Core i5, RAM 8GB, Dus, Charger" />
              </div>
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
                        placeholder="Cari laptop baru..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    {searchQuery.length > 2 && (
                      <div className="bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto absolute z-10 w-full md:w-auto">
                        {inventoryList
                          .filter(i => i.itemName.toLowerCase().includes(searchQuery.toLowerCase()) || i.barcode?.includes(searchQuery))
                          .map((item) => (
                            <div key={item.id} className="p-2 border-b hover:bg-slate-50 cursor-pointer flex justify-between" onClick={() => handleSelectNewUnit(item)}>
                              <div>
                                <div className="font-medium text-sm">{item.itemName}</div>
                                <div className="text-xs text-slate-500">Stok: {item.quantity}</div>
                              </div>
                              <div className="font-bold text-sm text-green-600">Rp {item.sellingPrice.toLocaleString()}</div>
                            </div>
                          ))}
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
