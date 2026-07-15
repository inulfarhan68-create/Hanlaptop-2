import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ModernSelect } from "@/components/ui/modern-select"
import { Autocomplete } from "@/components/ui/autocomplete"
import { LaptopSpecForm } from "@/components/LaptopSpecForm"
import { Sparkles, ScanLine } from "lucide-react"

interface InventoryAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  addName: string; setAddName: (v: string) => void;
  addCategory: string; setAddCategory: (v: string) => void;
  addBarcode: string; setAddBarcode: (v: string) => void;
  addQty: string; setAddQty: (v: string) => void;
  addCost: string; setAddCost: (v: string) => void;
  addSell: string; setAddSell: (v: string) => void;
  addMinStock: string; setAddMinStock: (v: string) => void;
  addSpecs: string; setAddSpecs: (v: string) => void;
  isSubmitting: boolean;
  aiLoading: boolean;
  onAiCheck: (name: string) => void;
  onScanBarcode: () => void;
  onSubmit: () => void;
  mergedLaptopModels: any[];
  mergedInventoryItems: any[];
  parseItemSpecs: (specs: string) => any;
}

export function InventoryAddModal({
  isOpen, onClose, addName, setAddName, addCategory, setAddCategory,
  addBarcode, setAddBarcode, addQty, setAddQty, addCost, setAddCost,
  addSell, setAddSell, addMinStock, setAddMinStock, addSpecs, setAddSpecs,
  isSubmitting, aiLoading, onAiCheck, onScanBarcode, onSubmit,
  mergedLaptopModels, mergedInventoryItems, parseItemSpecs
}: InventoryAddModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-2xl rounded-xl shadow-lg border p-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">Tambah Barang Baru</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Nama Barang</label>
              {addCategory === "Laptop Bekas" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onAiCheck(addName)}
                  disabled={aiLoading || !addName.trim()}
                  className="h-7 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200 gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {aiLoading ? "Menganalisis..." : "Cek Spek AI ✨"}
                </Button>
              )}
            </div>
            <Autocomplete 
              value={addName} 
              onChange={setAddName} 
              options={addCategory === "Laptop Bekas" ? mergedLaptopModels : mergedInventoryItems} 
              placeholder={addCategory === "Laptop Bekas" ? "Ketik merek laptop..." : "Ketik nama barang..."} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Barcode / SKU (Opsional)</label>
            <div className="flex gap-2">
              <Input value={addBarcode} onChange={e => setAddBarcode(e.target.value)} placeholder="Scan barcode disini..." className="flex-1" />
              <Button variant="outline" type="button" size="icon" onClick={onScanBarcode} title="Scan Barcode pakai Kamera HP">
                <ScanLine className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Kategori</label>
            <ModernSelect
              value={addCategory}
              onChange={(val) => setAddCategory(val)}
              options={[
                { value: "Laptop Bekas", label: "Laptop Bekas" },
                { value: "Sparepart", label: "Sparepart" },
                { value: "Aksesoris", label: "Aksesoris" },
                { value: "Jasa Servis", label: "Jasa Servis" }
              ]}
              placeholder="-- Pilih Kategori --"
            />
          </div>
          {addCategory === "Laptop Bekas" && (
            <div className="space-y-2 border p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-slate-800 dark:text-slate-200">Spesifikasi Laptop (Wajib untuk Laptop)</label>
              </div>
              <LaptopSpecForm value={addSpecs} onChange={setAddSpecs} />
              <div className="mt-2 text-xs text-muted-foreground p-2 bg-white dark:bg-slate-800 rounded border">
                <p className="font-semibold mb-1">Preview Deteksi:</p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  <span>RAM: {parseItemSpecs(addSpecs).ram || "-"}</span>
                  <span>Storage: {parseItemSpecs(addSpecs).storage || "-"}</span>
                  <span>Processor: {parseItemSpecs(addSpecs).processor || "-"}</span>
                  <span>Kondisi: {parseItemSpecs(addSpecs).condition || "Bekas (Mulus)"}</span>
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Kuantitas</label>
              <Input type="number" value={addQty} onChange={e => setAddQty(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Minimal Stok</label>
              <Input type="number" value={addMinStock} onChange={e => setAddMinStock(e.target.value)} placeholder="2" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Harga Modal (HPP)</label>
              <Input type="number" value={addCost} onChange={e => setAddCost(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Harga Jual</label>
              <Input type="number" value={addSell} onChange={e => setAddSell(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button onClick={onSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan Barang"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
