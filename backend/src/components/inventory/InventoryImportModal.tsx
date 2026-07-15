import { useState, useRef } from "react"
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ModernSelect } from "@/components/ui/modern-select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Upload, FileSpreadsheet, FileText, Trash2, Check, AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import * as XLSX from "xlsx"

interface ImportItem {
  id: string;
  itemName: string;
  category: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  specs: string;
  sku?: string;
  serialNumber?: string;
}

const parseIndonesianMoney = (val: any): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === "number") return val;
  
  let str = val.toString().trim();
  // Remove "Rp" and any whitespace
  str = str.replace(/rp/gi, "").replace(/\s+/g, "");
  
  const hasDot = str.includes(".");
  const hasComma = str.includes(",");
  
  if (hasDot && !hasComma) {
    const parts = str.split(".");
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      str = str.replace(/\./g, ""); // Remove all dots (thousands separator)
    }
  } else if (hasComma && !hasDot) {
    const parts = str.split(",");
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      str = str.replace(/,/g, ""); // Remove all commas (thousands separator)
    } else {
      str = str.replace(/,/g, "."); // Convert decimal comma to dot
    }
  } else if (hasDot && hasComma) {
    const dotIndex = str.indexOf(".");
    const commaIndex = str.indexOf(",");
    if (dotIndex < commaIndex) {
      str = str.replace(/\./g, "").replace(/,/g, ".");
    } else {
      str = str.replace(/,/g, "");
    }
  }
  
  return parseFloat(str) || 0;
};

interface InventoryImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export function InventoryImportModal({ isOpen, onClose, onImportSuccess }: InventoryImportModalProps) {
  const [items, setItems] = useState<ImportItem[]>([])
  const [supplierName, setSupplierName] = useState("")
  const [invoiceSummary, setInvoiceSummary] = useState({ discount: 0, tax: 0, shipping: 0, grandTotal: 0 })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [fileName, setFileName] = useState("")
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null;

  const handleExcelParse = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const parsedData: any[] = XLSX.utils.sheet_to_json(sheet)

        if (parsedData.length === 0) {
          toast.error("File Excel kosong atau tidak terbaca.")
          return
        }

        // Map excel columns to inventory schema
        const mappedItems: ImportItem[] = parsedData.map((row) => {
          // Normalize column headers to lowercase
          const rowLower: Record<string, any> = {};
          Object.keys(row).forEach(key => {
            const cleanKey = key.toLowerCase().trim().replace(/[_\s-]+/g, " ");
            rowLower[cleanKey] = row[key];
          });

          // Match name columns
          const itemName = rowLower["nama barang"] || 
                           rowLower["nama"] || 
                           rowLower["item name"] || 
                           rowLower["item"] || 
                           rowLower["nama_barang"] || 
                           rowLower["item_name"] || 
                           rowLower["produk"] || 
                           rowLower["product"] || 
                           rowLower["model"] || 
                           "Barang Tanpa Nama";
          
          let category = "Sparepart";
          const rawCat = (rowLower["kategori"] || rowLower["category"] || "").toString().toLowerCase();
          if (rawCat.includes("laptop")) category = "Laptop Bekas";
          else if (rawCat.includes("aksesoris") || rawCat.includes("accessories")) category = "Aksesoris";

          // Match quantity columns
          const rawQtyStr = rowLower["kuantitas"] || 
                            rowLower["qty"] || 
                            rowLower["jumlah"] || 
                            rowLower["quantity"] || 
                            rowLower["pcs"] || 
                            rowLower["stok"] || 
                            rowLower["stock"] || 
                            "1";
          const quantity = parseInt(rawQtyStr.toString().replace(/\D/g, ""), 10) || 1;

          // Match cost price columns
          const rawCost = rowLower["harga modal"] || 
                          rowLower["harga beli"] || 
                          rowLower["cost"] || 
                          rowLower["hpp"] || 
                          rowLower["harga_modal"] || 
                          rowLower["harga_beli"] || 
                          rowLower["unit cost"] || 
                          rowLower["unit_cost"] || 
                          rowLower["harga satuan"] || 
                          rowLower["harga_satuan"] || 
                          rowLower["modal"] || 
                          "0";
          const costPrice = parseIndonesianMoney(rawCost);
          
          // Match selling price columns
          const rawSell = rowLower["harga jual"] || 
                          rowLower["sell"] || 
                          rowLower["harga"] || 
                          rowLower["harga_jual"] || 
                          rowLower["price"] || 
                          rowLower["jual"] || 
                          rowLower["retail"] || 
                          null;
          
          // Default selling price to cost + 25% markup if not specified
          const sellingPrice = rawSell !== null ? parseIndonesianMoney(rawSell) : Math.round(costPrice * 1.25);
          
          const specs = rowLower["specs"] || 
                        rowLower["spesifikasi"] || 
                        rowLower["spec"] || 
                        rowLower["detail"] || 
                        rowLower["keterangan"] || 
                        "";
          const sku = rowLower["sku"] || rowLower["part number"] || rowLower["pn"] || "";
          const serialNumber = rowLower["serial number"] || rowLower["sn"] || rowLower["imei"] || "";

          return {
            id: crypto.randomUUID(),
            itemName,
            category,
            quantity,
            costPrice,
            sellingPrice,
            specs: specs.toString(),
            sku: sku.toString(),
            serialNumber: serialNumber.toString()
          };
        });

        setItems(mappedItems)
        toast.success(`Berhasil mengurai ${mappedItems.length} item dari Excel!`)
      } catch (err) {
        console.error(err)
        toast.error("Gagal mengurai file Excel. Pastikan formatnya benar.")
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleAiPdfParse = async (file: File) => {
    setIsLoading(true)
    try {
      // Convert file to Base64
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(",")[1];
          resolve(base64String);
        };
        reader.readAsDataURL(file);
      });

      const base64Data = await base64Promise;

      const res = await apiFetch('/api/inventory/import-ai', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileData: base64Data,
          mimeType: file.type
        })
      });

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal memproses AI")

      setSupplierName(data.supplierName || "")
      setInvoiceSummary(data.invoiceSummary || { discount: 0, tax: 0, shipping: 0, grandTotal: 0 })
      const mapped: ImportItem[] = (data.items || []).map((item: any) => ({
        id: crypto.randomUUID(),
        itemName: item.itemName || "Item Kustom AI",
        category: item.category || "Sparepart",
        quantity: item.quantity || 1,
        costPrice: item.costPrice || 0,
        sellingPrice: item.sellingPrice || Math.round((item.costPrice || 0) * 1.25),
        specs: item.specs || "",
        sku: item.sku || "",
        serialNumber: item.serialNumber || ""
      }));

      setItems(mapped)
      toast.success(`AI berhasil mengekstrak ${mapped.length} item dari Nota!`)
    } catch (err: any) {
      console.error(err)
      toast.error(`Gagal membaca nota: ${err.message || "Pastikan GEMINI_API_KEY terkonfigurasi"}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return;

    setFileName(file.name)
    setItems([])
    setSupplierName("")
    setInvoiceSummary({ discount: 0, tax: 0, shipping: 0, grandTotal: 0 })

    const ext = file.name.split(".").pop()?.toLowerCase()
    if (ext === "xlsx" || ext === "xls") {
      handleExcelParse(file)
    } else if (["pdf", "png", "jpg", "jpeg"].includes(ext || "")) {
      handleAiPdfParse(file)
    } else {
      toast.error("Format file tidak didukung. Gunakan Excel (.xlsx) atau Dokumen Nota (PDF, JPG, PNG).")
    }
  }

  const handleUpdateItem = (id: string, key: keyof ImportItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      return { ...item, [key]: value };
    }));
  }

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  const handleSaveImport = async () => {
    if (items.length === 0) return;
    setIsSaving(true)

    try {
      const itemsTotal = items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
      const { discount, tax, shipping } = invoiceSummary;
      const finalAmount = itemsTotal - discount + tax + shipping;
      
      const payload = {
        transactionType: "Pembelian Stok",
        amount: finalAmount,
        paymentMethod: "Cash",
        paymentStatus: "Paid",
        description: `Pembelian Stok - Supplier: ${supplierName || 'Umum'}`,
        metadata: {
           subTotal: itemsTotal,
           discount,
           tax,
           shipping
        },
        items: items.map(item => ({
          itemName: item.itemName,
          category: item.category,
          quantity: item.quantity,
          unitPrice: item.costPrice,
          sellingPrice: item.sellingPrice,
          specs: item.category === "Laptop Bekas" ? item.specs : undefined,
          sku: item.sku,
          serialNumber: item.serialNumber,
          tracksSerialNumber: item.category === "Laptop Bekas" || !!item.serialNumber
        }))
      };

      const res = await apiFetch('/api/transactions', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memproses transaksi Pembelian Stok.");
      }

      toast.success(`Berhasil mengimpor ${items.length} jenis barang ke inventori dan mencatat pembelian stok!`);
      onImportSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Gagal mengimpor barang. Silakan periksa koneksi atau role akun Anda.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-4xl rounded-xl shadow-lg border p-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center pb-4 border-b">
          <div>
            <h3 className="text-lg font-bold">Impor Barang Massal (Excel / PDF AI)</h3>
            <p className="text-xs text-muted-foreground">Unggah berkas Excel (.xlsx) atau berkas Foto Nota/Invoice PDF supplier Anda.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving || isLoading}>
            Batal
          </Button>
        </div>

        {/* Dropzone Area */}
        <div className="py-4 flex-shrink-0">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 dark:bg-slate-900/20"
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept=".xlsx,.xls,.pdf,.png,.jpg,.jpeg" 
            />
            {isLoading ? (
              <>
                <Loader2 className="h-10 w-10 text-primary animate-spin mb-2" />
                <span className="text-sm font-semibold">Membaca Nota via AI Gemini...</span>
                <span className="text-xs text-muted-foreground mt-1">Kami sedang mengekstrak daftar barang dan harga satuan dari dokumen Anda.</span>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                <span className="text-sm font-semibold">Klik atau seret berkas ke sini</span>
                <span className="text-xs text-muted-foreground mt-1">
                  Format didukung: <strong>Excel (.xlsx, .xls)</strong> atau <strong>Nota/PDF/Foto</strong>
                </span>
                {fileName && (
                  <span className="mt-3 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                    Berkas terpilih: {fileName}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Table Preview */}
        <div className="flex-1 overflow-y-auto min-h-[150px] border rounded-lg mb-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-muted-foreground text-center">
              <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm font-medium">Belum ada data diimpor</p>
              <p className="text-xs max-w-[320px] mt-1">Unggah berkas untuk menampilkan daftar tinjauan barang sebelum disimpan ke gudang.</p>
            </div>
          ) : (
            <div className="w-full">
              {supplierName && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/30 flex items-center gap-2 text-xs">
                  <span className="font-bold text-indigo-700 dark:text-indigo-400">Supplier Terdeteksi AI:</span>
                  <Input 
                    value={supplierName} 
                    onChange={e => setSupplierName(e.target.value)}
                    className="h-6 text-xs max-w-[200px] bg-background" 
                    placeholder="Nama Supplier..."
                  />
                </div>
              )}
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0">
                  <TableRow>
                    <TableHead className="text-xs py-2">Nama Barang</TableHead>
                    <TableHead className="text-xs py-2 w-[140px]">Kategori</TableHead>
                    <TableHead className="text-xs py-2 w-[160px]">Spesifikasi & ID</TableHead>
                    <TableHead className="text-xs py-2 w-[80px]">Jumlah</TableHead>
                    <TableHead className="text-xs py-2 w-[120px]">Harga Modal (HPP)</TableHead>
                    <TableHead className="text-xs py-2 w-[120px]">Harga Jual</TableHead>
                    <TableHead className="text-xs py-2 w-[50px] text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/20">
                      <TableCell className="p-2">
                        <Input 
                          value={item.itemName} 
                          onChange={(e) => handleUpdateItem(item.id, "itemName", e.target.value)} 
                          className="h-8 text-xs font-bold" 
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <ModernSelect
                          value={item.category}
                          onChange={(val) => handleUpdateItem(item.id, "category", val)}
                          options={[
                            { value: "Laptop Bekas", label: "Laptop Bekas" },
                            { value: "Sparepart", label: "Sparepart" },
                            { value: "Aksesoris", label: "Aksesoris" }
                          ]}
                          placeholder="Kategori"
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell className="p-2 flex flex-col gap-1">
                        <Input 
                          value={item.specs} 
                          disabled={item.category !== "Laptop Bekas"}
                          onChange={(e) => handleUpdateItem(item.id, "specs", e.target.value)} 
                          placeholder="Spesifikasi (opsional)"
                          className="h-7 text-xs" 
                        />
                        <div className="flex gap-1">
                          <Input 
                            value={item.sku || ""} 
                            onChange={(e) => handleUpdateItem(item.id, "sku", e.target.value)} 
                            placeholder="SKU"
                            className="h-6 text-[10px] w-1/2" 
                          />
                          <Input 
                            value={item.serialNumber || ""} 
                            onChange={(e) => handleUpdateItem(item.id, "serialNumber", e.target.value)} 
                            placeholder="S/N"
                            className="h-6 text-[10px] w-1/2" 
                          />
                        </div>
                      </TableCell>
                      <TableCell className="p-2">
                        <Input 
                          type="number" 
                          value={item.quantity} 
                          onChange={(e) => handleUpdateItem(item.id, "quantity", parseInt(e.target.value, 10) || 1)} 
                          className="h-8 text-xs font-mono" 
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Input 
                          type="number" 
                          value={item.costPrice} 
                          onChange={(e) => handleUpdateItem(item.id, "costPrice", parseFloat(e.target.value) || 0)} 
                          className="h-8 text-xs font-mono text-emerald-600 dark:text-emerald-400" 
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Input 
                          type="number" 
                          value={item.sellingPrice} 
                          onChange={(e) => handleUpdateItem(item.id, "sellingPrice", parseFloat(e.target.value) || 0)} 
                          className="h-8 text-xs font-mono text-indigo-600 dark:text-indigo-400" 
                        />
                      </TableCell>
                      <TableCell className="p-2 text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleRemoveItem(item.id)}
                          className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t flex-shrink-0">
          <div className="flex flex-col text-xs text-muted-foreground">
            <span className="font-semibold">
              {items.length > 0 && `Total: ${items.length} jenis barang (${items.reduce((s, i) => s + i.quantity, 0)} unit)`}
            </span>
            {invoiceSummary.tax > 0 || invoiceSummary.shipping > 0 || invoiceSummary.discount > 0 ? (
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                + Ekstra: PPN Rp{invoiceSummary.tax.toLocaleString('id-ID')} | Ongkir Rp{invoiceSummary.shipping.toLocaleString('id-ID')} | Diskon Rp{invoiceSummary.discount.toLocaleString('id-ID')}
              </span>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving || isLoading}>
              Batal
            </Button>
            <Button 
              onClick={handleSaveImport} 
              disabled={items.length === 0 || isSaving || isLoading}
              className="gap-1.5 font-bold"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Simpan ke Inventori
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
export default InventoryImportModal
