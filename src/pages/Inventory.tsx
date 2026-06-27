import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Search, Filter, Edit, Trash2, Printer, Download, FileSpreadsheet, Settings } from "lucide-react"
import { toast } from "sonner"
import { LaptopSpecForm } from "@/components/LaptopSpecForm"
import { useUserRole } from "@/hooks/useUserRole"
import { CameraScanner } from "@/components/CameraScanner"
import { ScanLine } from "lucide-react"
import { printBarcodeSticker, printBarcodeStickerBatch } from "@/lib/printBarcode"
import { TableSkeleton } from "@/components/ui/skeleton"
import { InventoryEmpty, SearchEmpty } from "@/components/ui/empty-state"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { ModernSelect } from "@/components/ui/modern-select"
import { Autocomplete } from "@/components/ui/autocomplete"
import { INVENTORY_ITEMS } from "@/data/inventory-items"
import { LAPTOP_MODELS } from "@/data/laptop-models"
import * as XLSX from "xlsx"
import { MarkdownTab } from "@/components/inventory/MarkdownTab"
import { TrendingDown, Info, Image as ImageIcon, Upload, Sparkles } from "lucide-react"

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)
}

const generateMedsosTemplate = (item: any) => {
  const storeName = localStorage.getItem("storeName") || "HANLAPTOP";
  const formattedPrice = formatCurrency(item.sellingPrice);
  
  let specsText = "";
  if (item.specs) {
    const parts = item.specs.split(/\||\n/);
    specsText = parts
      .map((part: string) => part.trim())
      .filter((part: string) => part.length > 0)
      .map((part: string) => {
        if (part.includes(":")) {
          const [key, ...valParts] = part.split(":");
          const val = valParts.join(":").trim();
          return `- ${key.trim()}: ${val}`;
        }
        return `- ${part}`;
      })
      .join("\n");
  } else {
    specsText = `- Kategori: ${item.category}\n- Status: Ready Stock`;
  }
  
  return `💻 LAPTOP READY STOCK - ${storeName.toUpperCase()}
=================================
Spesifikasi ${item.itemName}:
${specsText}
---------------------------------
Harga: ${formattedPrice}
Berminat? Hubungi kami segera!`;
};

import useSWR from "swr"

export function Inventory() {
  const { data: inventoryData, error: inventoryError, isLoading: loading, mutate: mutateInventory } = useSWR((import.meta.env.VITE_API_URL || '') + '/api/inventory')
  const items = Array.isArray(inventoryData) ? inventoryData : []
  const { isOwner, isManager, isInvestor, isKasir } = useUserRole()
  const canWrite = isOwner || isManager
  const canShowHPP = isOwner || isManager || isInvestor
  const { confirm, dialog } = useConfirmDialog()

  const { data: storeSettings } = useSWR<any>((import.meta.env.VITE_API_URL || '') + '/api/settings')
  const { data: suggestionsData, mutate: mutateSuggestions } = useSWR<any>((import.meta.env.VITE_API_URL || '') + '/api/suggestions')
  const { data: techniciansData } = useSWR<any[]>((import.meta.env.VITE_API_URL || '') + '/api/technicians')
  const { data: suppliersData } = useSWR<any[]>((import.meta.env.VITE_API_URL || '') + '/api/suppliers')
  
  const mergedLaptopModels = Array.from(new Set([
    ...LAPTOP_MODELS,
    ...(Array.isArray(suggestionsData?.laptopModels) ? suggestionsData.laptopModels : [])
  ]))
  
  const mergedInventoryItems = Array.from(new Set([
    ...INVENTORY_ITEMS,
    ...(Array.isArray(suggestionsData?.inventoryItems) ? suggestionsData.inventoryItems : [])
  ]))

  const [printInventoryData, setPrintInventoryData] = useState<any[] | null>(null)
  
  const [searchTerm, setSearchTerm] = useState("")
  
  // Bulk Actions States
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [bulkCategoryOpen, setBulkCategoryOpen] = useState(false)
  const [bulkCategoryVal, setBulkCategoryVal] = useState("")
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // Filters
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [showFilterMenu, setShowFilterMenu] = useState(false)

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [viewDetailItem, setViewDetailItem] = useState<any>(null)
  
  // Batch Barcode State
  const [isBatchBarcodeOpen, setIsBatchBarcodeOpen] = useState(false)
  const [batchItems, setBatchItems] = useState<any[]>([])
  const [batchConfig, setBatchConfig] = useState<any>({
    layoutSize: "58mm",
    format: "barcode",
    showSpecs: true
  })
  const [batchSearchTerm, setBatchSearchTerm] = useState("")
  
  // Add Form State
  const [addName, setAddName] = useState("")
  const [addCategory, setAddCategory] = useState("")
  const [addQty, setAddQty] = useState("")
  const [addMinStock, setAddMinStock] = useState("2")
  const [addCost, setAddCost] = useState("")
  const [addSell, setAddSell] = useState("")
  const [addSpecs, setAddSpecs] = useState("")
  const [addBarcode, setAddBarcode] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCameraScannerFor, setShowCameraScannerFor] = useState<"add" | "edit" | null>(null)

  // ERP Modal State
  const [isERPOpen, setIsERPOpen] = useState(false)
  const [erpItem, setErpItem] = useState<any>(null)
  
  // Consignment state
  const [consignmentSupplierId, setConsignmentSupplierId] = useState("")
  
  // Publish state
  const [isPublished, setIsPublished] = useState(false)
  
  // QC state
  const [qcGrade, setQcGrade] = useState("B")
  const [qcNotes, setQcNotes] = useState("")
  const [selectedTechnicianId, setSelectedTechnicianId] = useState("")
  
  // Markdown state
  const [isMarkdownOpen, setIsMarkdownOpen] = useState(false)

  // Image & Watermark state
  const [erpImageUrl, setErpImageUrl] = useState("")
  const [rawImageFile, setRawImageFile] = useState<File | null>(null)
  const [isWatermarkEnabled, setIsWatermarkEnabled] = useState(false)
  const [imagePreviewUrl, setImagePreviewUrl] = useState("")
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const openERPModal = (item: any) => {
    setErpItem(item)
    setIsPublished(item.isPublished || false)
    setConsignmentSupplierId(item.supplierId || "")
    setQcGrade(item.qcGrade || "B")
    setQcNotes(item.qcNotes || "")
    setSelectedTechnicianId(item.qcTechnicianId || "")
    setErpImageUrl(item.imageUrl || "")
    setRawImageFile(null)
    setIsWatermarkEnabled(false)
    setImagePreviewUrl(item.imageUrl || "")
    setIsERPOpen(true)
  }

  const handleImageUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRawImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
    }
  };

  const parseSpecs = (value: string, itemName: string) => {
    const result = {
      model: itemName,
      processor: "Processor Detail",
      vga: "VGA / Graphics",
      ram: "RAM",
      storage: "Storage",
      screen: "Layar / Screen"
    }
    if (value) {
      const parts = value.split(" | ");
      parts.forEach(part => {
        if (part.startsWith("Processor: ")) result.processor = part.replace("Processor: ", "");
        else if (part.startsWith("VGA: ")) result.vga = part.replace("VGA: ", "");
        else if (part.startsWith("RAM: ")) result.ram = part.replace("RAM: ", "");
        else if (part.startsWith("Storage: ")) result.storage = part.replace("Storage: ", "");
        else if (part.startsWith("Layar: ")) result.screen = part.replace("Layar: ", "");
      });
    }
    return result;
  }

  useEffect(() => {
    if (!isWatermarkEnabled || !imagePreviewUrl || !canvasRef.current || !erpItem) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = imagePreviewUrl;
    img.onload = () => {
      // 1. High Resolution for Instagram (cap at 2048px for ultra-crisp quality)
      const maxDim = 2048;
      let cw = img.width;
      let ch = img.height;
      if (cw > maxDim || ch > maxDim) {
        const ratio = Math.min(maxDim / cw, maxDim / ch);
        cw = Math.round(cw * ratio);
        ch = Math.round(ch * ratio);
      }
      if (cw < 800) { const r = 800 / cw; cw = 800; ch = Math.round(ch * r); }

      canvas.width = cw;
      canvas.height = ch;

      // 2. Enable High Quality Image Smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Draw original high-res image
      ctx.drawImage(img, 0, 0, cw, ch);

      const currentSpecs = parseSpecs(erpItem.specs || "", erpItem.itemName);

      // --- Prepare Specs Lines (Only specs, no decorative text) ---
      const specLines: { icon: string; label: string }[] = [];
      if (currentSpecs.processor && currentSpecs.processor !== "Processor Detail") {
        specLines.push({ icon: "⚡", label: currentSpecs.processor });
      }
      if (currentSpecs.vga && currentSpecs.vga !== "VGA / Graphics") {
        specLines.push({ icon: "🎮", label: currentSpecs.vga });
      }
      if (currentSpecs.ram && currentSpecs.ram !== "RAM") {
        specLines.push({ icon: "▦", label: `RAM ${currentSpecs.ram}` });
      }
      if (currentSpecs.storage && currentSpecs.storage !== "Storage") {
        specLines.push({ icon: "◉", label: `SSD ${currentSpecs.storage}` });
      }
      if (currentSpecs.screen && currentSpecs.screen !== "Layar / Screen") {
        specLines.push({ icon: "▢", label: currentSpecs.screen });
      }

      // --- Dimension and Font Calculations ---
      const pad = cw * 0.04; // 4% outer padding
      const cardPadding = cw * 0.024;
      const modelFontSize = Math.round(cw * 0.026);
      const specFontSize = Math.round(cw * 0.018);
      const lineHeight = Math.round(specFontSize * 1.5);

      // Calculate maximum content width for perfect fit
      ctx.font = `800 ${modelFontSize}px 'Segoe UI', system-ui, sans-serif`;
      let maxContentWidth = ctx.measureText(currentSpecs.model).width;
      
      ctx.font = `500 ${specFontSize}px 'Segoe UI', system-ui, sans-serif`;
      specLines.forEach(line => {
        const textWidth = ctx.measureText(`${line.icon}   ${line.label}`).width;
        if (textWidth > maxContentWidth) {
          maxContentWidth = textWidth;
        }
      });

      // Define Card Dimensions
      const cardW = maxContentWidth + cardPadding * 2 + 16;
      const headerH = modelFontSize + 10;
      const dividerH = 12;
      const linesH = specLines.length * lineHeight;
      const cardH = cardPadding * 2 + headerH + dividerH + linesH;

      const cardX = pad;
      const cardY = ch - cardH - pad;

      // 3. Draw Floating Glassmorphism Spec Card
      ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
      ctx.shadowBlur = 24;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 8;

      ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 16);
      ctx.fill();

      // Reset shadow
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Card Border Accent (Thin translucent)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 16);
      ctx.stroke();

      // Left Accent Border (Cyan-Blue Accent Bar)
      ctx.fillStyle = "#3b82f6";
      ctx.beginPath();
      ctx.roundRect(cardX + 1.5, cardY + 1.5, 6, cardH - 3, [14, 0, 0, 14]);
      ctx.fill();

      // --- Draw Content ---
      const contentX = cardX + cardPadding + 12;
      
      // Laptop Model Title
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.font = `800 ${modelFontSize}px 'Segoe UI', system-ui, sans-serif`;
      ctx.fillText(currentSpecs.model, contentX, cardY + cardPadding);

      // Divider line
      const sepY = cardY + cardPadding + modelFontSize + 8;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(contentX, sepY);
      ctx.lineTo(cardX + cardW - cardPadding, sepY);
      ctx.stroke();

      // Specifications Rows
      let currentY = sepY + 12;
      ctx.textBaseline = "top";
      
      specLines.forEach(line => {
        // Draw icon in cyan
        ctx.fillStyle = "#60a5fa";
        ctx.font = `700 ${specFontSize}px 'Segoe UI', system-ui, sans-serif`;
        ctx.fillText(line.icon, contentX, currentY);

        // Draw spec value
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.font = `600 ${specFontSize}px 'Segoe UI', system-ui, sans-serif`;
        ctx.fillText(line.label, contentX + specFontSize + 10, currentY);

        currentY += lineHeight;
      });
    };
  }, [isWatermarkEnabled, imagePreviewUrl, erpItem]);

  const saveERPSettings = async () => {
    // Check if the user changed the QC grade, notes, or technician from what was originally saved
    const isGradeChanged = qcGrade !== (erpItem.qcGrade || "B");
    const isNotesChanged = qcNotes !== (erpItem.qcNotes || "");
    const isTechChanged = selectedTechnicianId !== (erpItem.qcTechnicianId || "");

    // If they changed the grade or notes, but have no technician selected, warn them
    if ((isGradeChanged || isNotesChanged) && !selectedTechnicianId) {
      toast.warning("Silakan pilih teknisi pemeriksa untuk menyimpan hasil QC.")
      return
    }

    let uploadedImageUrl = erpImageUrl;

    try {
      setIsSubmitting(true)
      
      // 1. Process Image Upload
      if (rawImageFile || (isWatermarkEnabled && canvasRef.current)) {
        let imageBlob: Blob | null = null;
        
        if (isWatermarkEnabled && canvasRef.current) {
          imageBlob = await new Promise<Blob | null>((resolve) => {
            canvasRef.current?.toBlob((blob) => resolve(blob), "image/png");
          });
        } else if (rawImageFile) {
          imageBlob = rawImageFile;
        }

        if (imageBlob) {
          const uploadFormData = new FormData();
          uploadFormData.append("file", imageBlob, "catalog-photo.png");

          const uploadRes = await fetch((import.meta.env.VITE_API_URL || '') + "/api/upload", {
            method: "POST",
            body: uploadFormData
          });

          if (!uploadRes.ok) {
            const errorData = await uploadRes.json().catch(() => ({}));
            throw new Error(errorData.error || "Gagal mengunggah foto produk.");
          }

          const uploadResult = await uploadRes.json();
          uploadedImageUrl = uploadResult.url;
        }
      } else if (!imagePreviewUrl) {
        uploadedImageUrl = "";
      }

      // Update isPublished, Consignment Supplier & Image
      const res1 = await fetch((import.meta.env.VITE_API_URL || '') + `/api/inventory/${erpItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPublished,
          isConsignment: !!consignmentSupplierId,
          supplierId: consignmentSupplierId || null,
          imageUrl: uploadedImageUrl || null
        })
      });

      if (!res1.ok) {
        const errorData = await res1.json().catch(() => ({}));
        throw new Error(errorData.error || "Gagal menyimpan pengaturan katalog & konsinyasi");
      }

      // Submit QC Grade only if a technician is selected AND there are changes to save
      const shouldSaveQc = selectedTechnicianId && (isGradeChanged || isNotesChanged || isTechChanged || !erpItem.qcGrade);
      
      if (shouldSaveQc) {
        const res2 = await fetch((import.meta.env.VITE_API_URL || '') + `/api/inventory/${erpItem.id}/qc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grade: qcGrade,
            notes: qcNotes,
            technicianId: selectedTechnicianId
          })
        });

        if (!res2.ok) {
          const errorData = await res2.json().catch(() => ({}));
          throw new Error(errorData.error || "Gagal menyimpan data QC");
        }
      }

      toast.success("Pengaturan ERP & QC berhasil disimpan")
      setIsERPOpen(false)
      fetchInventory()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }


  // Edit Form State
  const [editId, setEditId] = useState("")
  const [editName, setEditName] = useState("")
  const [editCategory, setEditCategory] = useState("")
  const [editQty, setEditQty] = useState("")
  const [editMinStock, setEditMinStock] = useState("2")
  const [editCost, setEditCost] = useState("")
  const [editSell, setEditSell] = useState("")
  const [editSpecs, setEditSpecs] = useState("")
  const [editBarcode, setEditBarcode] = useState("")

  const fetchInventory = async () => {
    mutateInventory()
    mutateSuggestions()
  }

  const executeDelete = async (id: string) => {
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/inventory/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success("Item berhasil dihapus")
        fetchInventory()
      } else {
        toast.error("Gagal menghapus item")
      }
    } catch (err) {
      toast.error("Error deleting item")
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "Hapus Barang?",
      description: "Data stok akan terhapus permanen. Tindakan ini tidak dapat dibatalkan.",
      confirmLabel: "Hapus Permanen",
      variant: "destructive"
    });
    
    if (confirmed) {
      await executeDelete(id);
    }
  }

  const handleExportExcel = () => {
    try {
      const exportData = filteredItems.map((item: any, idx: number) => ({
        "No": idx + 1,
        "ID/SKU": item.id,
        "Nama Barang": item.itemName,
        "Kategori": item.category,
        "Stok (Qty)": item.quantity,
        "Harga Modal (HPP)": item.costPrice,
        "Harga Jual": item.sellingPrice,
        "Total Nilai Persediaan": item.costPrice * item.quantity,
        "Barcode": item.barcode || "-",
        "Spesifikasi": item.specs || "-"
      }));

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(exportData)
      XLSX.utils.book_append_sheet(wb, ws, "Stok Inventaris")
      
      const dateStr = new Date().toISOString().substring(0, 10);
      const storeName = localStorage.getItem("storeName") || "HanLaptop";
      XLSX.writeFile(wb, `Laporan_Stok_${storeName.replace(/ /g, "_")}_${dateStr}.xlsx`)
      toast.success("Excel berhasil diekspor!")
    } catch (e) {
      toast.error("Gagal mengekspor ke Excel")
    }
  }

  const handlePrintInventory = () => {
    setPrintInventoryData(filteredItems)
  }

  const openEditModal = (item: any) => {
    setEditId(item.id)
    setEditName(item.itemName)
    setEditCategory(item.category)
    setEditQty(item.quantity.toString())
    setEditMinStock(item.minStock !== undefined ? item.minStock.toString() : "2")
    setEditCost(item.costPrice ? item.costPrice.toString() : "0")
    setEditSell(item.sellingPrice.toString())
    setEditSpecs(item.specs || "")
    setEditBarcode(item.barcode || "")
    setIsEditOpen(true)
  }

  const submitEdit = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/inventory/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: editName,
          category: editCategory,
          sellingPrice: parseFloat(editSell),
          costPrice: parseFloat(editCost),
          quantity: parseInt(editQty),
          minStock: parseInt(editMinStock || "2"),
          specs: editCategory === "Laptop Bekas" ? editSpecs : undefined,
          barcode: editBarcode || undefined
        })
      })
      if (res.ok) {
        toast.success("Item berhasil diupdate")
        setIsEditOpen(false)
        fetchInventory()
      } else {
        toast.error("Gagal mengupdate item")
      }
    } catch (err) {
      toast.error("Error updating item")
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitAdd = async () => {
    if (!addName || !addCategory || !addQty || !addCost || !addSell) {
      toast.warning("Harap lengkapi semua field yang wajib");
      return;
    }
    setIsSubmitting(true)
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          itemName: addName, 
          category: addCategory, 
          quantity: parseInt(addQty), 
          minStock: parseInt(addMinStock || "2"),
          costPrice: parseFloat(addCost), 
          sellingPrice: parseFloat(addSell), 
          specs: addCategory === "Laptop Bekas" ? addSpecs : undefined,
          barcode: addBarcode || undefined
        })
      })
      if (res.ok) {
        toast.success("Barang berhasil ditambahkan")
        setIsAddOpen(false)
        setAddName(""); setAddCategory(""); setAddQty(""); setAddMinStock("2"); setAddCost(""); setAddSell(""); setAddSpecs(""); setAddBarcode("");
        fetchInventory()
      } else {
        toast.error("Gagal menambahkan barang")
      }
    } catch (err) {
      toast.error("Error adding item")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBulkPrint = () => {
    setBatchItems(items.map(item => ({
      ...item,
      quantityToPrint: selectedItemIds.includes(item.id) ? 1 : 0
    })));
    setIsBatchBarcodeOpen(true);
  };

  const handleBulkCategoryUpdate = async () => {
    if (!bulkCategoryVal) {
      toast.warning("Silakan pilih kategori terlebih dahulu.");
      return;
    }
    setIsBulkSubmitting(true);
    try {
      const promises = selectedItemIds.map(async (id) => {
        const item = items.find((i: any) => i.id === id);
        if (!item) return;
        return fetch((import.meta.env.VITE_API_URL || '') + `/api/inventory/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemName: item.itemName,
            category: bulkCategoryVal,
            sellingPrice: item.sellingPrice,
            quantity: item.quantity,
            specs: item.specs,
            barcode: item.barcode
          })
        });
      });
      
      const results = await Promise.all(promises);
      const failedCount = results.filter(res => !res || !res.ok).length;
      
      if (failedCount === 0) {
        toast.success(`Berhasil mengubah kategori ${selectedItemIds.length} barang ke "${bulkCategoryVal}"`);
      } else if (failedCount < selectedItemIds.length) {
        toast.warning(`Berhasil mengubah ${selectedItemIds.length - failedCount} barang, tetapi ${failedCount} gagal.`);
      } else {
        toast.error("Gagal mengubah kategori barang.");
      }
      
      setSelectedItemIds([]);
      setBulkCategoryOpen(false);
      setBulkCategoryVal("");
      fetchInventory();
    } catch (err) {
      toast.error("Terjadi kesalahan saat mengubah kategori massal.");
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!isOwner) {
      toast.error("Hanya Owner yang dapat melakukan hapus massal.");
      return;
    }
    
    const confirmed = await confirm({
      title: `Hapus ${selectedItemIds.length} Barang?`,
      description: `Seluruh data stok yang dipilih akan terhapus permanen. Tindakan ini TIDAK dapat dibatalkan.`,
      confirmLabel: `Hapus Permanen ${selectedItemIds.length} Barang`,
      variant: "destructive"
    });
    
    if (!confirmed) return;
    
    setIsBulkSubmitting(true);
    try {
      const promises = selectedItemIds.map(id => 
        fetch((import.meta.env.VITE_API_URL || '') + `/api/inventory/${id}`, { method: 'DELETE' })
      );
      const results = await Promise.all(promises);
      const failedCount = results.filter(res => !res.ok).length;
      
      if (failedCount === 0) {
        toast.success(`Berhasil menghapus ${selectedItemIds.length} barang.`);
      } else if (failedCount < selectedItemIds.length) {
        toast.warning(`Berhasil menghapus ${selectedItemIds.length - failedCount} barang, tetapi ${failedCount} gagal.`);
      } else {
        toast.error("Gagal menghapus barang terpilih.");
      }
      
      setSelectedItemIds([]);
      fetchInventory();
    } catch (err) {
      toast.error("Terjadi kesalahan saat menghapus massal.");
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const filteredItems = items.filter((item: any) => {
    // 1. Search Filter
    const matchSearch = item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (item.barcode && item.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // 2. Category Filter
    let matchCat = true;
    if (filterCategory === "laptop") matchCat = item.category === "Laptop Bekas";
    if (filterCategory === "sparepart") matchCat = item.category !== "Laptop Bekas" && item.category !== "Aksesoris" && item.category !== "Jasa Servis";
    if (filterCategory === "aksesoris") matchCat = item.category === "Aksesoris";

    // 3. Status Filter
    let matchStatus = true;
    if (filterStatus === "instock") matchStatus = item.quantity > 0;
    if (filterStatus === "outofstock") matchStatus = item.quantity === 0;
    if (filterStatus === "lowstock") matchStatus = item.quantity <= (item.minStock !== undefined ? item.minStock : 2) && item.quantity > 0;

    return matchSearch && matchCat && matchStatus;
  })

  const currentPageItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const laptopCount = items.filter((i: any) => i.category === "Laptop Bekas").reduce((sum: any, i: any) => sum + i.quantity, 0)
  const spareCount = items.filter((i: any) => i.category !== "Laptop Bekas" && i.category !== "Aksesoris" && i.category !== "Jasa Servis").reduce((sum: any, i: any) => sum + i.quantity, 0)
  const aksesorisCount = items.filter((i: any) => i.category === "Aksesoris").reduce((sum: any, i: any) => sum + i.quantity, 0)
  const totalAssetValue = items.reduce((sum: any, i: any) => sum + (i.costPrice * i.quantity), 0)

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {dialog}
      {/* Static Page Header */}
      <div className="shrink-0 flex flex-col gap-1.5 md:gap-2 bg-white/80 light-blue:bg-white dark:bg-card backdrop-blur-xl rounded-xl md:rounded-[2rem] border border-border shadow-sm z-40 relative p-2 md:px-5 md:py-3 mt-0 mb-2">
        
        {/* Title & Add Button */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base md:text-xl font-bold tracking-tight leading-none">Inventory</h2>
            <p className="text-muted-foreground mt-0.5 text-[9px] md:text-xs font-medium hidden sm:block">Kelola stok laptop dan sparepart Anda</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="flex items-center gap-1.5 h-8 px-3 text-[11px] font-bold hover:bg-emerald-500/10 hover:text-emerald-600 border-slate-200 dark:border-slate-800 cursor-pointer" onClick={handleExportExcel} title="Ekspor ke Excel">
              <FileSpreadsheet className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Excel</span>
            </Button>
            <Button size="sm" variant="outline" className="flex items-center gap-1.5 h-8 px-3 text-[11px] font-bold hover:bg-blue-500/10 hover:text-blue-600 border-slate-200 dark:border-slate-800 cursor-pointer" onClick={handlePrintInventory} title="Cetak Laporan">
              <Printer className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Cetak</span>
            </Button>
            <Button size="sm" variant="outline" className="flex items-center gap-1.5 h-8 px-3 text-[11px] font-bold hover:bg-amber-500/10 hover:text-amber-600 border-slate-200 dark:border-slate-800 cursor-pointer" onClick={() => {
              // Initialize batch items with quantityToPrint = 0
              setBatchItems(items.map(item => ({ ...item, quantityToPrint: 0 })));
              setIsBatchBarcodeOpen(true);
            }} title="Cetak Label Barcode/QR Massal">
              <Printer className="h-3.5 w-3.5 text-amber-500" /> <span className="hidden sm:inline">Label Batch</span>
            </Button>
            <Button size="sm" variant="outline" className="flex items-center gap-1.5 h-8 px-3 text-[11px] font-bold hover:bg-rose-500/10 hover:text-rose-600 border-slate-200 dark:border-slate-800 cursor-pointer" onClick={() => setIsMarkdownOpen(true)} title="Markdown Liquidator (Stok Mati)">
              <TrendingDown className="h-3.5 w-3.5 text-rose-500" /> <span className="hidden md:inline">Markdown</span>
            </Button>
            {canWrite && localStorage.getItem('selectedStoreId') !== 'all' && (
              <Button size="sm" className="flex items-center gap-1.5 h-8 px-3.5 text-[11px] font-bold shadow-md shadow-blue-500/20" onClick={() => setIsAddOpen(true)}>
                <Plus className="h-4 w-4" /> Tambah Barang
              </Button>
            )}
          </div>
        </div>

        {/* KPI Mini Stats */}
        <div className="grid grid-cols-5 md:grid-cols-4 gap-1.5 pb-0.5">
          <div className="col-span-2 md:col-span-1 bg-white/60 light-blue:bg-white dark:bg-card backdrop-blur-xl border border-border rounded-lg p-1.5 flex flex-col justify-center text-center">
            <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5 truncate">
              {canShowHPP ? "Total Value" : "Total Stok"}
            </span>
            <span className="text-[11px] md:text-[14px] font-bold text-foreground truncate">
              {canShowHPP 
                ? formatCurrency(totalAssetValue) 
                : `${items.reduce((sum: any, i: any) => sum + i.quantity, 0)} Pcs`}
            </span>
          </div>
          <div className="col-span-1 bg-white/60 light-blue:bg-white dark:bg-card backdrop-blur-xl border border-border rounded-lg p-1.5 flex flex-col justify-center text-center">
            <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5 truncate">Laptops</span>
            <span className="text-[11px] md:text-[14px] font-bold text-emerald-600 dark:text-emerald-400">{laptopCount}</span>
          </div>
          <div className="col-span-1 bg-white/60 light-blue:bg-white dark:bg-card backdrop-blur-xl border border-border rounded-lg p-1.5 flex flex-col justify-center text-center">
            <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5 truncate">Sparepart</span>
            <span className="text-[11px] md:text-[14px] font-bold text-blue-600 dark:text-blue-400">{spareCount}</span>
          </div>
          <div className="col-span-1 bg-white/60 light-blue:bg-white dark:bg-card backdrop-blur-xl border border-border rounded-lg p-1.5 flex flex-col justify-center text-center">
            <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5 truncate">Aksesoris</span>
            <span className="text-[11px] md:text-[14px] font-bold text-amber-600 dark:text-amber-400">{aksesorisCount}</span>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex gap-2 w-full mt-1">
          <div className="relative flex-1 group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <Input
              placeholder="Cari SKU/Nama..."
              className="pl-8 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-[11px] h-8 w-full rounded-lg shadow-sm focus-visible:ring-1 focus-visible:ring-blue-500/50 transition-all"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className="relative shrink-0">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 px-2.5 text-[10px] md:text-xs font-medium gap-1.5"
              onClick={() => setShowFilterMenu(!showFilterMenu)}
            >
              <Filter className="h-3 w-3" />
              <span className="hidden sm:inline">Filter</span>
              {(filterCategory !== "all" || filterStatus !== "all") && (
                <span className="ml-1 flex h-2 w-2 rounded-full bg-blue-600"></span>
              )}
            </Button>
            
            {showFilterMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowFilterMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-[200px] rounded-md border bg-popover text-popover-foreground shadow-md outline-none z-50 p-2.5 animate-in fade-in-80 zoom-in-95">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium text-muted-foreground px-1">Kategori</label>
                      <ModernSelect
                        value={filterCategory}
                        onChange={(val) => { setFilterCategory(val); setCurrentPage(1); }}
                        options={[
                          { value: "all", label: "Semua Kategori" },
                          { value: "laptop", label: "Laptop Bekas" },
                          { value: "sparepart", label: "Sparepart" },
                          { value: "aksesoris", label: "Aksesoris" }
                        ]}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium text-muted-foreground px-1">Status Stok</label>
                      <ModernSelect
                        value={filterStatus}
                        onChange={(val) => { setFilterStatus(val); setCurrentPage(1); }}
                        options={[
                          { value: "all", label: "Semua Status" },
                          { value: "instock", label: "Tersedia" },
                          { value: "outofstock", label: "Habis" },
                          { value: "lowstock", label: "Stok Menipis" }
                        ]}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="flex-1 flex flex-col min-h-0 space-y-2">
        {inventoryError ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <p className="text-destructive font-semibold text-lg mb-2">Gagal memuat data inventaris</p>
              <p className="text-muted-foreground text-sm mb-4">{inventoryError.message || "Terjadi kesalahan saat mengambil data."}</p>
              <Button onClick={() => mutateInventory()} variant="outline">Coba Lagi</Button>
            </div>
          </div>
        ) : loading ? (
          <div className="bg-card rounded-xl border shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden">
            <Table>
              <TableHeader className="sticky top-0 z-30 bg-muted/95 shadow-sm">
                <TableRow>
                  <TableHead className="py-2 px-2 text-[10px] w-[50px]">SKU/ID</TableHead>
                  <TableHead className="py-2 px-2 text-[10px] min-w-[180px]">Nama Barang</TableHead>
                  <TableHead className="py-2 px-2 text-[10px]">Kategori</TableHead>
                  <TableHead className="py-2 px-2 text-[10px]">Qty</TableHead>
                  <TableHead className="py-2 px-2 text-[10px]">Harga Jual</TableHead>
                  <TableHead className="py-2 px-1 text-[10px] w-[40px] text-center">Status</TableHead>
                  <TableHead className="text-right py-2 px-2 text-[10px] w-[50px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableSkeleton rows={8} cols={7} />
              </TableBody>
            </Table>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-card rounded-xl border shadow-sm flex-1">
            <InventoryEmpty onAdd={() => setIsAddOpen(true)} />
          </div>
        ) : (
          <div className="bg-card rounded-xl border shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden [&>div]:flex-1 [&>div]:overflow-auto [&>div]:border-0 [&>div]:rounded-none">
            <Table>
              <TableHeader className="sticky top-0 z-30 bg-muted/95 shadow-sm">
                <TableRow>
                  <TableHead className="py-2 px-2 text-[10px] w-[30px]">
                    {canWrite && (
                      <input 
                        type="checkbox" 
                        checked={currentPageItems.length > 0 && currentPageItems.every(item => selectedItemIds.includes(item.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const pageIds = currentPageItems.map(item => item.id);
                            setSelectedItemIds(prev => Array.from(new Set([...prev, ...pageIds])));
                          } else {
                            const pageIds = currentPageItems.map(item => item.id);
                            setSelectedItemIds(prev => prev.filter(id => !pageIds.includes(id)));
                          }
                        }}
                        className="rounded border-slate-300 dark:border-slate-800 text-primary focus:ring-primary w-3.5 h-3.5"
                      />
                    )}
                  </TableHead>
                  <TableHead className="py-2 px-2 text-[10px] md:text-[11px] w-[50px]">SKU/ID</TableHead>
                  <TableHead className="py-2 px-2 text-[10px] md:text-[11px] min-w-[180px] sm:min-w-[250px]">Nama Barang</TableHead>
                  <TableHead className="py-2 px-2 text-[10px] md:text-[11px] whitespace-nowrap">Kategori</TableHead>
                  <TableHead className="py-2 px-2 text-[10px] md:text-[11px]">Qty</TableHead>
                  {canShowHPP && <TableHead className="py-2 px-2 text-[10px] md:text-[11px] whitespace-nowrap">Cost (HPP)</TableHead>}
                  <TableHead className="py-2 px-2 text-[10px] md:text-[11px] whitespace-nowrap">Harga Jual</TableHead>
                  <TableHead className="py-2 px-1 text-[10px] md:text-[11px] w-[40px] md:w-[60px] text-center">Status</TableHead>
                  {localStorage.getItem('selectedStoreId') !== 'all' && <TableHead className="text-right py-2 px-2 text-[10px] md:text-[11px] w-[50px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
          <TableBody>
            {currentPageItems.map((item: any) => (
              <TableRow key={item.id} className="hover:bg-muted/30">
                <TableCell className="py-1.5 px-2">
                  {canWrite && (
                    <input 
                      type="checkbox" 
                      checked={selectedItemIds.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItemIds(prev => [...prev, item.id]);
                        } else {
                          setSelectedItemIds(prev => prev.filter(id => id !== item.id));
                        }
                      }}
                      className="rounded border-slate-300 dark:border-slate-800 text-primary focus:ring-primary w-3.5 h-3.5"
                    />
                  )}
                </TableCell>
                <TableCell className="font-medium text-[10px] md:text-[11px] py-1.5 px-2">{item.id.substring(0, 8).toUpperCase()}</TableCell>
                <TableCell className="py-1.5 px-2">
                  <div 
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => setViewDetailItem(item)}
                  >
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.itemName} className="w-8 h-8 rounded object-cover shadow-sm border shrink-0 bg-slate-100" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-muted border flex items-center justify-center text-[10px] text-muted-foreground shrink-0 select-none">💻</div>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <span className="font-medium text-[11px] md:text-[12px] text-primary hover:underline decoration-primary/50 underline-offset-2 transition-all leading-tight">
                        {item.itemName}
                      </span>
                    {item.category === "Laptop Bekas" && item.specs && (() => {
                      const conditionMatch = item.specs.match(/Kondisi:\s*([^|]+)/);
                      const condition = conditionMatch ? conditionMatch[1].trim() : null;
                      if (!condition) return null;
                      const isMinus = condition.toLowerCase().includes("minus");
                      const isGaransi = condition.toLowerCase().includes("garansi resmi");
                      return (
                        <span 
                          className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-bold tracking-wide border whitespace-nowrap ${
                            isMinus 
                              ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50" 
                              : isGaransi
                              ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50"
                              : "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50"
                          }`}
                          title={`Kondisi: ${condition}`}
                        >
                          {isMinus ? "Minus" : isGaransi ? "Garansi" : "Normal"}
                        </span>
                      )
                    })()}
                    {item.isConsignment && (
                      <span className="bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200 dark:bg-fuchsia-900/30 dark:text-fuchsia-400 dark:border-fuchsia-800/50 px-1 py-0.5 rounded text-[8px] font-bold whitespace-nowrap">
                        Titip Jual
                      </span>
                    )}
                    {item.qcGrade && (
                      <span className={`px-1 py-0.5 rounded text-[8px] font-bold whitespace-nowrap border ${
                        item.qcGrade === 'A' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        item.qcGrade === 'B' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400' :
                        item.qcGrade === 'C' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400'
                      }`}>
                        QC: {item.qcGrade}
                      </span>
                    )}
                    {!item.isPublished && (
                      <span className="bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 px-1 py-0.5 rounded text-[8px] font-bold whitespace-nowrap">
                        Hidden
                      </span>
                    )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-1.5 px-2">
                  <span className={`inline-flex items-center justify-center px-1 py-0.5 rounded text-[8px] md:text-[9px] font-semibold whitespace-nowrap border ${
                    item.category === 'Laptop Bekas' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' 
                    : item.category === 'Aksesoris' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                    : 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800'
                  }`}>
                    {item.category === 'Laptop Bekas' ? 'Laptop' : item.category}
                  </span>
                </TableCell>
                <TableCell className="font-bold text-[11px] md:text-[12px] py-1.5 px-2">
                  <div className="flex items-center gap-1">
                    <span>{item.quantity}</span>
                    {item.quantity <= (item.minStock !== undefined ? item.minStock : 2) && item.quantity > 0 && (
                      <span className="text-[8px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-1 rounded font-bold whitespace-nowrap">Menipis</span>
                    )}
                    {item.quantity === 0 && (
                      <span className="text-[8px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-1 rounded font-bold whitespace-nowrap">Habis</span>
                    )}
                  </div>
                </TableCell>
                {canShowHPP && <TableCell className="text-[10px] md:text-[11px] py-1.5 px-2 tabular-nums">{formatCurrency(item.costPrice)}</TableCell>}
                <TableCell className="text-[10px] md:text-[11px] py-1.5 px-2 tabular-nums">{formatCurrency(item.sellingPrice)}</TableCell>
                <TableCell className="py-1.5 px-1 flex justify-center">
                  <span className={`flex items-center justify-center w-5 h-5 rounded-full ${
                    item.quantity === 0 ? 'bg-destructive/10' : item.quantity <= (item.minStock !== undefined ? item.minStock : 2) ? 'bg-amber-500/10' : 'bg-emerald-500/10'
                  }`} title={item.quantity === 0 ? 'Habis' : item.quantity <= (item.minStock !== undefined ? item.minStock : 2) ? 'Menipis' : 'Aman'}>
                    <span className={`h-2 w-2 rounded-full ${
                      item.quantity === 0 ? 'bg-destructive' : item.quantity <= (item.minStock !== undefined ? item.minStock : 2) ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} />
                  </span>
                </TableCell>
                {localStorage.getItem('selectedStoreId') !== 'all' && (
                  <TableCell className="text-right py-1.5 px-2">
                    <div className="flex justify-end gap-0.5">
                      {item.barcode && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-emerald-500/10 hover:text-emerald-600 rounded" onClick={() => printBarcodeSticker(item, { name: localStorage.getItem('storeName') || 'Toko Anda', address: localStorage.getItem('storeAddress') || '', phone: localStorage.getItem('storePhone') || '' })} title="Cetak Barcode">
                          <Printer className="h-3 w-3" />
                        </Button>
                      )}
                      {canWrite && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-primary/10 hover:text-primary rounded" onClick={() => openEditModal(item)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                      {canWrite && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-indigo-500/10 hover:text-indigo-600 rounded" onClick={() => openERPModal(item)} title="Pengaturan ERP (Katalog, QC, Konsinyasi)">
                          <Settings className="h-3 w-3" />
                        </Button>
                      )}
                      {canWrite && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive rounded" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {filteredItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="p-0">
                  <SearchEmpty query={searchTerm || filterCategory || filterStatus} />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    )}

    {/* Pagination Controls */}
    {!loading && items.length > 0 && (
      <div className="flex items-center justify-between px-2 py-2 shrink-0 bg-card rounded-xl border mt-2">
        <p className="text-[10px] md:text-xs text-muted-foreground">
          Menampilkan <span className="font-medium text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span>-
          <span className="font-medium text-foreground">{Math.min(currentPage * itemsPerPage, filteredItems.length)}</span> dari <span className="font-medium text-foreground">{filteredItems.length}</span> barang
        </p>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[10px] md:text-xs px-2"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Sebelumnnya
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[10px] md:text-xs px-2"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredItems.length / itemsPerPage)))}
            disabled={currentPage === Math.ceil(filteredItems.length / itemsPerPage) || filteredItems.length === 0}
          >
            Selanjutnya
          </Button>
        </div>
      </div>
    )}
  </div>


  {/* MODAL ADD */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-background/80  flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-lg border p-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Tambah Barang Baru</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Barang</label>
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
                  <Button variant="outline" type="button" size="icon" onClick={() => setShowCameraScannerFor("add")} title="Scan Barcode pakai Kamera HP">
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
                    { value: "Aksesoris", label: "Aksesoris" }
                  ]}
                  placeholder="-- Pilih Kategori --"
                />
              </div>
              {addCategory === "Laptop Bekas" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Spesifikasi Laptop</label>
                  <LaptopSpecForm value={addSpecs} onChange={setAddSpecs} />
                </div>
              )}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Kuantitas</label>
                  <Input type="number" value={addQty} onChange={e => setAddQty(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Batas Minimum</label>
                  <Input type="number" value={addMinStock} onChange={e => setAddMinStock(e.target.value)} placeholder="2" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Harga Modal (Rp)</label>
                  <Input type="number" value={addCost} onChange={e => setAddCost(e.target.value)} placeholder="0" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Harga Jual (Rp)</label>
                <Input type="number" value={addSell} onChange={e => setAddSell(e.target.value)} placeholder="0" />
              </div>
              <div className="flex gap-3 justify-end mt-6 pt-4">
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
                <Button onClick={submitAdd} disabled={isSubmitting}>
                  {isSubmitting ? "Menyimpan..." : "Simpan Barang"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-background/80  flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-lg border p-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Edit Barang</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Barang</label>
                <Autocomplete 
                  value={editName} 
                  onChange={setEditName} 
                  options={editCategory === "Laptop Bekas" ? mergedLaptopModels : mergedInventoryItems} 
                  placeholder={editCategory === "Laptop Bekas" ? "Ketik merek laptop..." : "Ketik nama barang..."} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Barcode / SKU (Opsional)</label>
                <div className="flex gap-2">
                  <Input value={editBarcode} onChange={e => setEditBarcode(e.target.value)} placeholder="Scan barcode disini..." className="flex-1" />
                  <Button variant="outline" type="button" size="icon" onClick={() => setShowCameraScannerFor("edit")} title="Scan Barcode pakai Kamera HP">
                    <ScanLine className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Kategori</label>
                <Input value={editCategory} disabled className="bg-muted/50" />
              </div>
              {editCategory === "Laptop Bekas" && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Spesifikasi Laptop</label>
                    <LaptopSpecForm value={editSpecs} onChange={setEditSpecs} />
                  </div>
                  <div className="space-y-2 pt-2 border-t mt-4">
                    <label className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Ringkasan Spesifikasi (Untuk Disalin)</label>
                    <div className="relative">
                      <textarea 
                        readOnly 
                        className="flex w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-xs focus-visible:outline-none min-h-[80px]"
                        value={`${editName}\n${editSpecs.replace(/ \| /g, '\n')}`}
                      />
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        className="absolute right-2 top-2 h-7 px-2 text-[10px]"
                        onClick={() => {
                          navigator.clipboard.writeText(`${editName}\n${editSpecs.replace(/ \| /g, '\n')}`);
                          toast.success("Ringkasan berhasil disalin!");
                        }}
                        type="button"
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                </>
              )}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Stok Tersedia</label>
                  <Input type="number" value={editQty} onChange={e => setEditQty(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Batas Minimum</label>
                  <Input type="number" value={editMinStock} onChange={e => setEditMinStock(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Harga Jual (Rp)</label>
                  <Input type="number" value={editSell} onChange={e => setEditSell(e.target.value)} />
                </div>
              </div>
              {canShowHPP && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Harga Modal / HPP (Rp)</label>
                  <Input type="number" value={editCost} onChange={e => setEditCost(e.target.value)} />
                </div>
              )}
              <div className="flex gap-3 justify-end mt-6 pt-4">
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button>
                <Button onClick={submitEdit} disabled={isSubmitting}>
                  {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VIEW DETAIL */}
      {viewDetailItem && (
        <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-4" onClick={() => setViewDetailItem(null)}>
          <div className="bg-card w-full max-w-md rounded-xl shadow-lg border p-6 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">{viewDetailItem.itemName}</h3>
            
            {viewDetailItem.category === "Laptop Bekas" && viewDetailItem.specs && (() => {
               const conditionMatch = viewDetailItem.specs.match(/Kondisi:\s*([^|]+)/);
               const condition = conditionMatch ? conditionMatch[1].trim() : null;
               const isMinus = condition?.startsWith("Minus");
               return condition ? (
                 <div className={`text-[11px] inline-flex items-center mb-4 px-2 py-0.5 rounded font-medium border ${
                   isMinus ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:border-red-800" 
                   : "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800"
                 }`}>
                   {condition}
                 </div>
               ) : null;
            })()}

            <div className="space-y-4">
              {viewDetailItem.specs && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Spesifikasi</label>
                  <div className="text-sm bg-muted/30 p-3 rounded-md border whitespace-pre-wrap">
                    {viewDetailItem.specs.replace(/ \| /g, '\n')}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Kategori</label>
                  <p className="text-sm font-medium">{viewDetailItem.category}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Stok Tersedia</label>
                  <p className="text-sm font-medium">{viewDetailItem.quantity} unit</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-4 border-t mt-4">
                <Button 
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 font-bold"
                  onClick={() => {
                    const text = generateMedsosTemplate(viewDetailItem);
                    navigator.clipboard.writeText(text);
                    toast.success("Format Medsos berhasil disalin!");
                  }}
                >
                  Salin Format Medsos
                </Button>
                <div className="flex gap-2">
                  <Button 
                    className="flex-1" 
                    variant="outline" 
                    onClick={() => {
                      const text = `${viewDetailItem.itemName}\n${viewDetailItem.specs ? viewDetailItem.specs.replace(/ \| /g, '\n') : ''}`.trim();
                      navigator.clipboard.writeText(text);
                      toast.success("Detail berhasil disalin!");
                    }}
                  >
                    Salin Biasa
                  </Button>
                  {viewDetailItem.barcode && (
                    <Button 
                      className="flex-1 border-dashed border-emerald-500/50 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" 
                      variant="outline" 
                      onClick={() => printBarcodeSticker(viewDetailItem, { name: localStorage.getItem('storeName') || 'Toko Anda', address: localStorage.getItem('storeAddress') || '', phone: localStorage.getItem('storePhone') || '' })}
                    >
                      <Printer className="h-4 w-4 mr-1.5" />
                      Cetak Barcode
                    </Button>
                  )}
                  <Button className="flex-1" variant="outline" onClick={() => setViewDetailItem(null)}>Tutup</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* CAMERA SCANNER MODAL */}
      {showCameraScannerFor && (
        <CameraScanner 
          onClose={() => setShowCameraScannerFor(null)} 
          onScanSuccess={(decodedText) => {
            if (showCameraScannerFor === "add") {
              setAddBarcode(decodedText);
            } else if (showCameraScannerFor === "edit") {
              setEditBarcode(decodedText);
            }
            setShowCameraScannerFor(null);
            toast.success("Barcode berhasil di-scan!");
          }} 
        />
      )}

      {/* ── PRINT PORTAL ── */}
      {printInventoryData && createPortal(
        <>
          <style>{`
            @media print {
              body * { visibility: hidden; }
              .print-area, .print-area * { visibility: visible; }
              .print-area { position: absolute; left: 0; top: 0; width: 100%; }
              .invoice-action-bar { display: none !important; }
              .invoice-paper { box-shadow: none !important; padding: 0 !important; max-width: 100% !important; border: none !important; }
            }
          `}</style>

          {/* Action Bar */}
          <div className="invoice-action-bar fixed top-0 left-0 right-0 z-[9999999] bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm print:hidden">
            <div className="max-w-[900px] mx-auto px-4 py-3 flex items-center justify-between">
              <button
                onClick={() => setPrintInventoryData(null)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                Kembali ke Halaman
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 hidden sm:inline">Ukuran: A4 (210 × 297 mm)</span>
                <Button size="sm" className="gap-2 rounded-lg font-bold px-5" onClick={() => window.print()}>
                  <Printer className="w-4 h-4" />
                  Cetak Laporan
                </Button>
              </div>
            </div>
          </div>

          {/* Print Content Area */}
          <div className="print-area fixed inset-0 z-[999999] overflow-y-auto font-sans text-slate-900 w-full bg-slate-200 print:static print:bg-white print:overflow-visible">
            <div className="invoice-paper max-w-[794px] mx-auto my-2 mt-16 print:mt-0 print:my-0 px-6 sm:px-[40px] py-6 sm:py-[30px] bg-white shadow-2xl print:shadow-none min-h-[auto] sm:min-h-[1000px] border border-slate-200 print:border-none text-left">
              
              {/* Header / Letterhead */}
              <div className="flex justify-between items-start border-b border-slate-900 pb-4 mb-5 gap-4">
                <div className="flex items-start gap-4 sm:gap-6">
                  {storeSettings?.storeLogo && (
                    <div className="w-24 sm:w-32 h-auto flex items-start justify-center shrink-0">
                      <img src={storeSettings.storeLogo} alt="Logo" className="w-full h-auto object-contain" />
                    </div>
                  )}
                  <div className="flex flex-col pt-1 sm:pt-2">
                    <h1 className="text-[18px] sm:text-[22px] font-black tracking-tight text-slate-900 uppercase">
                      {storeSettings?.storeName || localStorage.getItem("storeName") || "HanLaptop"}
                    </h1>
                    <p className="text-[12px] text-slate-600 mt-1 max-w-[280px] leading-relaxed">
                      {storeSettings?.storeAddress || localStorage.getItem("storeAddress") || "Jl. Komputer Raya No.123"}
                    </p>
                    <p className="text-[12px] text-slate-600 font-medium mt-0.5">
                      Telp: {storeSettings?.storePhone || localStorage.getItem("storePhone") || "0812-3456-7890"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-[18px] sm:text-[20px] font-black text-slate-900 uppercase tracking-wider leading-none mb-3">
                    LAPORAN STOK INVENTARIS
                  </h2>
                  <div className="space-y-1 text-right">
                    <p className="text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700">Tanggal: </span>
                      <span>{new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700">Filter Kategori: </span>
                      <span className="capitalize">{filterCategory === "all" ? "Semua Kategori" : filterCategory}</span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700">Filter Status: </span>
                      <span className="capitalize">{filterStatus === "all" ? "Semua Status" : filterStatus}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="mb-6">
                <table className="w-full text-left border-collapse" style={{ tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '6%' }} />
                    <col style={{ width: '42%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '12%' }} />
                  </colgroup>
                  <thead>
                    <tr className="border-y border-slate-900">
                      <th className="py-2 px-1 font-bold text-[10px] uppercase text-slate-800">No</th>
                      <th className="py-2 px-1 font-bold text-[10px] uppercase text-slate-800">Nama Barang</th>
                      <th className="py-2 px-1 font-bold text-[10px] uppercase text-slate-800">Kategori</th>
                      <th className="py-2 px-1 text-center font-bold text-[10px] uppercase text-slate-800">Stok</th>
                      <th className="py-2 px-1 text-right font-bold text-[10px] uppercase text-slate-800">Hrg Jual</th>
                      {canShowHPP && <th className="py-2 px-1 text-right font-bold text-[10px] uppercase text-slate-800">Hrg Modal</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {printInventoryData.map((item: any, i: number) => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="py-1.5 px-1 text-[10px] text-slate-800">{i + 1}</td>
                        <td className="py-1.5 px-1 text-[10px] text-slate-800 break-words font-medium">
                          {item.itemName}
                          {item.barcode && <span className="block text-[8px] text-slate-400 font-mono">Barcode: {item.barcode}</span>}
                        </td>
                        <td className="py-1.5 px-1 text-[10px] text-slate-600">{item.category}</td>
                        <td className="py-1.5 px-1 text-center text-[10px] text-slate-800 font-bold">{item.quantity}</td>
                        <td className="py-1.5 px-1 text-right text-[10px] text-slate-700">{formatCurrency(item.sellingPrice)}</td>
                        {canShowHPP && (
                          <td className="py-1.5 px-1 text-right text-[10px] font-semibold text-slate-800">
                            {formatCurrency(item.costPrice)}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="flex justify-end mb-8">
                <div className="w-[300px] border border-slate-300 rounded-md overflow-hidden text-[11px]">
                  <div className="p-2.5 bg-slate-50 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Jumlah Jenis Barang</span>
                      <span className="font-semibold text-slate-900">{printInventoryData.length} item</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Unit Fisik</span>
                      <span className="font-semibold text-slate-900">
                        {printInventoryData.reduce((acc, curr) => acc + curr.quantity, 0)} unit
                      </span>
                    </div>
                  </div>
                  {canShowHPP && (
                    <div className="flex justify-between items-center bg-white text-slate-900 px-2.5 py-2.5 border-t border-slate-300">
                      <span className="font-bold uppercase tracking-wider text-[10px]">TOTAL ASET PERSIDIAAN</span>
                      <span className="font-black text-[13px]">
                        {formatCurrency(printInventoryData.reduce((acc, curr) => acc + (curr.costPrice * curr.quantity), 0))}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Signatures */}
              <div className="flex justify-between mt-12 pt-6 border-t border-slate-200 text-center px-4">
                <div className="flex flex-col justify-between w-40 h-24">
                  <p className="text-[11px] text-slate-500 font-medium">Petugas Gudang / Staf,</p>
                  <div className="border-b border-slate-400 w-full mb-1 mt-auto"></div>
                  <p className="text-[11px] font-bold text-slate-900">..............................</p>
                </div>
                <div className="flex flex-col justify-between w-40 h-24">
                  <p className="text-[11px] text-slate-500 font-medium">Diverifikasi Oleh (Owner),</p>
                  <div className="border-b border-slate-400 w-full mb-1 mt-auto"></div>
                  <p className="text-[11px] font-bold text-slate-900">
                    {storeSettings?.storeName || localStorage.getItem("storeName") || "Owner"}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 pt-3 border-t border-slate-200">
                <p className="text-[9px] font-medium text-slate-400 text-center">
                  Laporan Inventori ini dibuat secara otomatis oleh sistem HanLaptop POS per {new Date().toLocaleString('id-ID')}
                </p>
              </div>

            </div>
          </div>
        </>,
        document.body
      )}

      {/* ── BATCH BARCODE PRINT MODAL ── */}
      {isBatchBarcodeOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-in fade-in duration-200">
          <div className="bg-background border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-amber-500" />
                <h3 className="font-extrabold text-base md:text-lg text-foreground">Cetak Label Barcode & QR Code Massal</h3>
              </div>
              <button 
                onClick={() => setIsBatchBarcodeOpen(false)} 
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-full hover:bg-muted transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-border min-h-0">
              
              {/* Left Column: Form & Item list */}
              <div className="flex flex-col p-4 overflow-y-auto space-y-4 min-h-0">
                {/* Print Configurations */}
                <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded-xl border border-border/50">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Ukuran Kertas</label>
                    <ModernSelect
                      value={batchConfig.layoutSize}
                      onChange={(val) => setBatchConfig({ ...batchConfig, layoutSize: val })}
                      options={[
                        { value: "58mm", label: "Thermal 58mm" },
                        { value: "80mm", label: "Thermal 80mm" }
                      ]}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Format Kode</label>
                    <ModernSelect
                      value={batchConfig.format}
                      onChange={(val) => setBatchConfig({ ...batchConfig, format: val })}
                      options={[
                        { value: "barcode", label: "Barcode (1D)" },
                        { value: "qrcode", label: "QR Code (2D)" }
                      ]}
                    />
                  </div>
                  <div className="col-span-2 flex items-center justify-between pt-1">
                    <label className="text-xs font-semibold text-foreground">Tampilkan Spesifikasi Ringkas</label>
                    <input 
                      type="checkbox"
                      checked={batchConfig.showSpecs}
                      onChange={(e) => setBatchConfig({ ...batchConfig, showSpecs: e.target.checked })}
                      className="w-4 h-4 rounded text-primary border-border focus:ring-primary cursor-pointer"
                    />
                  </div>
                </div>

                {/* Search Item */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Cari Barang</label>
                  <Input 
                    placeholder="Cari berdasarkan nama atau kode..." 
                    value={batchSearchTerm}
                    onChange={(e) => setBatchSearchTerm(e.target.value)}
                    className="text-xs h-9 rounded-lg"
                  />
                </div>
                   {/* Items Selection List */}
                <div className="flex-1 border border-border rounded-xl overflow-y-auto min-h-[200px] divide-y divide-border bg-card">
                  {batchItems
                    .filter(item => {
                      const barcodeVal = item.barcode || "";
                      const itemNameVal = item.itemName || "";
                      const idVal = item.id || "";
                      if (batchSearchTerm === "") return true;
                      const term = batchSearchTerm.toLowerCase();
                      return itemNameVal.toLowerCase().includes(term) || 
                             barcodeVal.toLowerCase().includes(term) || 
                             idVal.toLowerCase().includes(term);
                    })
                    .map((item) => {
                      const displayBarcode = item.barcode || item.id.substring(0, 8).toUpperCase() + " (SKU)";
                      return (
                        <div key={item.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-foreground truncate">{item.itemName}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground font-mono">
                              <span>Barcode: {displayBarcode}</span>
                              <span>•</span>
                              <span>Stok: {item.quantity}</span>
                            </div>
                          </div>
                          
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => {
                                setBatchItems(batchItems.map(bi => 
                                  bi.id === item.id 
                                    ? { ...bi, quantityToPrint: Math.max(0, bi.quantityToPrint - 1) } 
                                    : bi
                                ));
                              }}
                              className="w-6 h-6 rounded-md border border-border flex items-center justify-center hover:bg-muted text-foreground transition-colors cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-bold text-xs">{item.quantityToPrint}</span>
                            <button
                              onClick={() => {
                                setBatchItems(batchItems.map(bi => 
                                  bi.id === item.id 
                                    ? { ...bi, quantityToPrint: Math.min(100, bi.quantityToPrint + 1) } 
                                    : bi
                                ));
                              }}
                              className="w-6 h-6 rounded-md border border-border flex items-center justify-center hover:bg-muted text-foreground transition-colors cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  {batchItems.filter(item => {
                    const barcodeVal = item.barcode || "";
                    const itemNameVal = item.itemName || "";
                    const idVal = item.id || "";
                    if (batchSearchTerm === "") return true;
                    const term = batchSearchTerm.toLowerCase();
                    return itemNameVal.toLowerCase().includes(term) || 
                           barcodeVal.toLowerCase().includes(term) || 
                           idVal.toLowerCase().includes(term);
                  }).length === 0 && (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      Tidak ada barang yang sesuai dengan pencarian Anda.
                    </div>
                  )}
                </div>
              </div>
 
              {/* Right Column: Live Preview & Summary */}
              <div className="flex flex-col p-4 bg-muted/10 overflow-y-auto min-h-0 items-center justify-between gap-4">
                
                {/* Print Summary */}
                <div className="w-full text-center p-3 rounded-xl bg-primary/5 border border-primary/10 text-xs">
                  <p className="font-bold text-foreground">Ringkasan Cetakan</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Total stiker yang akan dicetak: <span className="font-black text-primary text-sm">{batchItems.reduce((acc, curr) => acc + curr.quantityToPrint, 0)}</span> lembar
                  </p>
                </div>
 
                {/* Simulated Label Sticker Preview */}
                <div className="flex-1 flex flex-col items-center justify-center w-full min-h-[220px]">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Preview Stiker (Simulasi)</p>
                  
                  {/* Sticker Box */}
                  <div 
                    className="bg-white text-black p-4 rounded shadow-lg border border-slate-300 flex flex-col items-center justify-center text-center font-mono leading-normal overflow-hidden transition-all duration-300 select-none"
                    style={{
                      width: batchConfig.layoutSize === "58mm" ? "220px" : "280px",
                      minHeight: batchConfig.layoutSize === "58mm" ? "160px" : "200px",
                    }}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wide border-b border-black w-full pb-0.5 mb-1.5">
                      {localStorage.getItem('storeName') || 'HanLaptop'}
                    </div>
                    {(() => {
                      const activePreviewItem = batchItems.find(bi => bi.quantityToPrint > 0);
                      const itemName = activePreviewItem?.itemName || "NAMA BARANG PREVIEW";
                      const specs = activePreviewItem?.specs || "Core i5 | 8GB RAM | 256GB SSD | Intel HD";
                      const barcodeVal = activePreviewItem 
                        ? (activePreviewItem.barcode || activePreviewItem.id.substring(0, 8).toUpperCase())
                        : "A12B34CD";
                      const priceVal = activePreviewItem?.sellingPrice || 7500000;
                      
                      return (
                        <>
                          <div className="text-[10px] font-black w-full line-clamp-2 leading-tight">
                            {itemName}
                          </div>
                          {batchConfig.showSpecs && (
                            <div className="text-[8px] text-slate-600 line-clamp-2 w-full mt-0.5 leading-snug">
                              {specs}
                            </div>
                          )}
                          
                          {/* Simulated Code */}
                          <div className="my-2 flex items-center justify-center w-full">
                            {batchConfig.format === "barcode" ? (
                              <div className="flex flex-col items-center w-full">
                                {/* Simulated Barcode bars */}
                                <div className="flex items-end justify-center gap-[1px] h-8 w-4/5 bg-transparent border-x border-black">
                                  {Array.from({ length: 28 }).map((_, i) => (
                                    <div 
                                      key={i} 
                                      className="bg-black" 
                                      style={{ 
                                        width: i % 3 === 0 ? '2px' : i % 5 === 0 ? '3px' : '1px',
                                        height: i % 2 === 0 ? '100%' : '80%'
                                      }} 
                                    />
                                  ))}
                                </div>
                                <span className="text-[8px] mt-0.5 tracking-widest font-bold font-mono">
                                  {barcodeVal}
                                </span>
                              </div>
                            ) : (
                              <div className="w-14 h-14 bg-white border-2 border-black rounded p-0.5 flex flex-wrap gap-0.5 justify-between items-center shrink-0">
                                {/* Simulated QR blocks */}
                                <div className="w-5 h-5 border-4 border-black shrink-0"></div>
                                <div className="w-5 h-5 border-4 border-black shrink-0"></div>
                                <div className="w-5 h-5 border-4 border-black shrink-0"></div>
                                <div className="w-5 h-5 flex flex-wrap gap-[1px] p-[1px] shrink-0">
                                  <div className="w-1 h-1 bg-black"></div>
                                  <div className="w-1 h-1 bg-black"></div>
                                  <div className="w-1 h-1 bg-black"></div>
                                  <div className="w-1 h-1 bg-black"></div>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="text-[12px] font-black border-t border-black w-full pt-0.5">
                            {formatCurrency(priceVal)}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
 
                {/* Print Buttons */}
                <div className="w-full flex gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsBatchBarcodeOpen(false)}
                    className="rounded-lg"
                  >
                    Tutup
                  </Button>
                  <Button
                    onClick={() => {
                      const selected = batchItems.filter(bi => bi.quantityToPrint > 0);
                      if (selected.length === 0) {
                        toast.warning("Silakan tambahkan kuantitas stiker untuk dicetak terlebih dahulu!");
                        return;
                      }
                      const selectedMapped = selected.map(item => ({
                        ...item,
                        barcode: item.barcode || item.id.substring(0, 8).toUpperCase()
                      }));
                      
                      // 1. Print stickers
                      printBarcodeStickerBatch(
                        selectedMapped,
                        batchConfig,
                        {
                          name: localStorage.getItem('storeName') || 'Toko Anda',
                          address: localStorage.getItem('storeAddress') || '',
                          phone: localStorage.getItem('storePhone') || ''
                        }
                      );

                      // 2. Automatically save generated barcodes (short SKU/ID) to database for items without barcode values
                      if (canWrite) {
                        const itemsToUpdate = selected.filter(item => !item.barcode);
                        if (itemsToUpdate.length > 0) {
                          const payload = itemsToUpdate.map(item => ({
                            id: item.id,
                            barcode: item.id.substring(0, 8).toUpperCase()
                          }));
                          
                          fetch((import.meta.env.VITE_API_URL || '') + '/api/inventory/bulk-barcode', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                          })
                          .then(async (res) => {
                            if (res.ok) {
                              toast.success(`Berhasil menyimpan ${itemsToUpdate.length} barcode/SKU baru ke database item.`);
                              fetchInventory();
                            } else {
                              console.error("Gagal menyimpan barcode massal");
                              toast.error("Gagal memperbarui data barcode di server.");
                            }
                          })
                          .catch((err) => {
                            console.error("Koneksi gagal saat memperbarui barcode massal:", err);
                            toast.error("Gagal terhubung ke server untuk menyimpan barcode.");
                          });
                        }
                      }
                  }}
                    size="sm" 
                    className="rounded-lg font-bold"
                  >
                    Cetak Massal
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bulk Actions Bar */}
      {selectedItemIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-4 px-6 py-3.5 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/50 dark:border-slate-800/80 text-white min-w-[320px] md:min-w-[600px] max-w-[90vw] animate-in slide-in-from-bottom-8 duration-300">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-black text-white">
              {selectedItemIds.length}
            </span>
            <span className="text-xs md:text-sm font-semibold tracking-tight">Barang Terpilih</span>
            <button 
              className="text-[10px] text-slate-400 hover:text-white underline ml-2 transition-colors cursor-pointer"
              onClick={() => setSelectedItemIds([])}
            >
              Batal
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-[11px] font-bold text-slate-200 hover:bg-slate-800 hover:text-white border border-slate-700/50 rounded-lg cursor-pointer"
              onClick={handleBulkPrint}
            >
              <Printer className="h-3.5 w-3.5 mr-1 text-amber-400" />
              <span className="hidden sm:inline">Cetak Barcode</span>
              <span className="sm:hidden">Barcode</span>
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-[11px] font-bold text-slate-200 hover:bg-slate-800 hover:text-white border border-slate-700/50 rounded-lg cursor-pointer"
              onClick={() => {
                setBulkCategoryVal("");
                setBulkCategoryOpen(true);
              }}
            >
              <Edit className="h-3.5 w-3.5 mr-1 text-blue-400" />
              <span className="hidden sm:inline">Ubah Kategori</span>
              <span className="sm:hidden">Kategori</span>
            </Button>
            
            {isOwner && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-[11px] font-bold text-rose-200 hover:bg-rose-950/40 hover:text-rose-400 border border-rose-900/50 rounded-lg cursor-pointer"
                onClick={handleBulkDelete}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1 text-rose-500" />
                <span className="hidden sm:inline">Hapus Massal</span>
                <span className="sm:hidden">Hapus</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* MODAL UBAH KATEGORI MASSAL */}
      {bulkCategoryOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-sm rounded-xl shadow-lg border p-6 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold mb-4">Ubah Kategori Massal ({selectedItemIds.length} Barang)</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Pilih Kategori Baru</label>
                <ModernSelect
                  value={bulkCategoryVal}
                  onChange={(val) => setBulkCategoryVal(val)}
                  options={[
                    { value: "Laptop Bekas", label: "Laptop Bekas" },
                    { value: "Sparepart", label: "Sparepart" },
                    { value: "Aksesoris", label: "Aksesoris" }
                  ]}
                  placeholder="-- Pilih Kategori --"
                />
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button variant="outline" size="sm" onClick={() => setBulkCategoryOpen(false)} disabled={isBulkSubmitting}>
                  Batal
                </Button>
                <Button size="sm" onClick={handleBulkCategoryUpdate} disabled={isBulkSubmitting || !bulkCategoryVal}>
                  {isBulkSubmitting ? "Mengupdate..." : "Ubah Kategori"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ERP & QC SETTINGS MODAL */}
      {isERPOpen && erpItem && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-lg">Pengaturan ERP & QC</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setIsERPOpen(false)}>✕</Button>
            </div>
            
            <div className="p-4 overflow-y-auto space-y-6 flex-1">
              <div className="bg-muted/50 p-3 rounded-lg border">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Barang Terpilih</p>
                <p className="font-medium">{erpItem.itemName}</p>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">{erpItem.id}</p>
              </div>

              {/* Tampilkan di Katalog */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
                  Katalog Publik
                </h4>
                <div className="flex items-center justify-between p-3 border rounded-xl bg-card">
                  <div>
                    <p className="text-sm font-medium">Tampilkan Barang</p>
                    <p className="text-xs text-muted-foreground">Aktifkan untuk menampilkan di website katalog publik</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-blue-500"></div>
                  </label>
                </div>
              </div>

              {/* Foto Produk */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                  Foto Produk
                </h4>
                <div className="p-3 border rounded-xl bg-card space-y-3 flex flex-col items-center">
                  {imagePreviewUrl ? (
                    <div className="relative w-full max-w-[280px] border rounded-xl overflow-hidden shadow bg-slate-50 flex items-center justify-center">
                      {isWatermarkEnabled ? (
                        <canvas ref={canvasRef} className="w-full h-auto block" />
                      ) : (
                        <img src={imagePreviewUrl} alt="Pratinjau" className="w-full h-auto block" />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setRawImageFile(null)
                          setImagePreviewUrl("")
                          setErpImageUrl("")
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md transition-colors w-6 h-6 flex items-center justify-center text-xs font-bold"
                        title="Hapus foto"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="w-full aspect-square max-w-[200px] border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-400 p-4 text-center bg-slate-50/50 dark:bg-slate-900/10">
                      <ImageIcon className="w-8 h-8 mb-2 text-slate-300 dark:text-slate-700" />
                      <span className="text-xs font-medium">Belum ada foto</span>
                    </div>
                  )}

                  <div className="w-full flex items-center gap-2">
                    <input
                      type="file"
                      id="raw-image-upload"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUploadChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full rounded-lg"
                      onClick={() => document.getElementById("raw-image-upload")?.click()}
                    >
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      Pilih Foto Mentah
                    </Button>
                  </div>

                  {erpItem.category === "Laptop Bekas" && imagePreviewUrl && (
                    <div className="flex items-center justify-between w-full p-2 border rounded-lg bg-muted/20">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-xs font-semibold">Watermark Spek Otomatis</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={isWatermarkEnabled}
                          onChange={(e) => setIsWatermarkEnabled(e.target.checked)}
                        />
                        <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-slate-600 peer-checked:bg-blue-500"></div>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Konsinyasi */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-fuchsia-500 rounded-full" />
                  Status Konsinyasi (Titip Jual)
                </h4>
                <div className="p-3 border rounded-xl bg-card space-y-3">
                  <p className="text-xs text-muted-foreground">Pilih pemasok jika barang ini titip jual (konsinyasi).</p>
                  <ModernSelect
                    value={consignmentSupplierId}
                    onChange={setConsignmentSupplierId}
                    placeholder="-- Pilih Pemasok / Supplier --"
                    options={[
                      { value: "", label: "Bukan Konsinyasi (Milik Sendiri)" },
                      ...(Array.isArray(suppliersData)
                        ? suppliersData.map((s: any) => ({ value: s.id, label: `${s.name} (${s.id})` }))
                        : [])
                    ]}
                  />
                  {consignmentSupplierId && (
                    <div className="bg-fuchsia-50 dark:bg-fuchsia-900/20 text-fuchsia-700 dark:text-fuchsia-400 p-2 rounded-lg text-xs font-medium flex items-center gap-2 border border-fuchsia-200 dark:border-fuchsia-800/50">
                      <Info className="w-4 h-4 shrink-0" />
                      Status Konsinyasi Aktif
                    </div>
                  )}
                </div>
              </div>
 
              {/* QC Inspeksi */}
              {erpItem.category === "Laptop Bekas" && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                    Inspeksi QC
                  </h4>
                  <div className="p-3 border rounded-xl bg-card space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Grade Kondisi</label>
                      <ModernSelect
                        value={qcGrade}
                        onChange={setQcGrade}
                        options={[
                          { value: "A", label: "Grade A (Mulus, Normal 100%)" },
                          { value: "B", label: "Grade B (Lecet Pemakaian Wajar)" },
                          { value: "C", label: "Grade C (Minus Fungsi Ringan)" },
                          { value: "REJECT", label: "Grade D / Reject (Bahan / Rusak)" },
                        ]}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Teknisi Pemeriksa</label>
                      <ModernSelect
                        value={selectedTechnicianId}
                        onChange={setSelectedTechnicianId}
                        placeholder="-- Pilih Teknisi --"
                        options={[
                          { value: "", label: "-- Pilih Teknisi --" },
                          ...(Array.isArray(techniciansData)
                            ? techniciansData.map((t: any) => ({ value: t.id, label: `${t.name}${t.phone ? ` (${t.phone})` : ''}` }))
                            : [])
                        ]}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Catatan Inspeksi</label>
                      <textarea 
                        className="w-full text-sm rounded-lg border bg-background px-3 py-2 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        rows={3}
                        placeholder="Contoh: Layar whitespot tipis, baterai tahan 2 jam..."
                        value={qcNotes}
                        onChange={(e) => setQcNotes(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t flex justify-end gap-2 bg-muted/20">
              <Button variant="outline" onClick={() => setIsERPOpen(false)} disabled={isSubmitting}>Batal</Button>
              <Button onClick={saveERPSettings} disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Pengaturan"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MARKDOWN MODAL */}
      {isMarkdownOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-4xl rounded-2xl shadow-2xl border flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-lg">Markdown Liquidator</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setIsMarkdownOpen(false)}>✕</Button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <MarkdownTab />
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
