import { useState, useEffect } from "react"
import { useLocation } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Autocomplete } from "@/components/ui/autocomplete"
import { Search, Plus, Wrench, MessageCircle, AlertCircle, Trash2, Printer, Edit2, MoreVertical, CheckCircle, X, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import useSWR from "swr"
import { useUserRole } from "@/hooks/useUserRole"
import { LAPTOP_MODELS } from "@/data/laptop-models"
import { printServiceLabel } from "@/lib/printServiceLabel"



const COLUMNS = ['Diterima', 'Dikerjakan', 'Menunggu Part', 'Selesai', 'Diambil', 'Batal']

const getCleanedNotes = (notesStr: string) => {
  if (!notesStr) return "";
  return notesStr
    .replace(/\n?\[QC:\s*\{[\s\S]*?\}\]/g, "")
    .replace(/\n?\[Kelengkapan:\s*\{[\s\S]*?\}\]/g, "")
    .replace(/\n?\[Spareparts:\s*\[[\s\S]*?\]\]/g, "")
    .replace(/\n?\[Spareparts:\s*[\s\S]*?\]\]/g, "") // fallback
    .trim();
};

const getSlaStatus = (receivedDateStr: string, status: string) => {
  if (['Selesai', 'Diambil', 'Batal'].includes(status)) return null;
  const received = new Date(receivedDateStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - received.getTime());
  const diffHours = diffTime / (1000 * 60 * 60);
  
  if (diffHours > 72) {
    return {
      level: 'critical',
      label: 'Critical (>72j)',
      className: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400',
      dotColor: 'bg-rose-500'
    };
  } else if (diffHours > 24) {
    return {
      level: 'warning',
      label: 'Warning (>24j)',
      className: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
      dotColor: 'bg-amber-500'
    };
  }
  return {
    level: 'normal',
    label: 'Baru (<24j)',
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
    dotColor: 'bg-emerald-500'
  };
};


const COMMON_SERVICE_ISSUES = [
  "Mati Total (No Power)",
  "No Display (Nyala tapi layar gelap)",
  "Layar Blank Putih / Bergaris",
  "Blue Screen (BSOD) / Sering Restart",
  "Overheat (Panas berlebih) / Thermal Paste",
  "Kipas (Fan) berisik / tidak muter",
  "Keyboard error / beberapa tombol mati",
  "Baterai drop / kembung / tidak mau ngecas",
  "Engsel patah / casing pecah / lecet",
  "Install ulang OS (Windows/Mac) / Bootloop",
  "Upgrade RAM / Tambah Kapasitas",
  "Upgrade SSD / HDD lemot",
  "Pembersihan Debu (Cleaning Kipas/Mobo)",
  "Speaker sember / mati sebelah / tidak ada suara",
  "Port USB / HDMI / Audio / Charger longgar/rusak",
  "Wifi / Bluetooth tidak terdeteksi",
  "Lupa Password Windows / BIOS lock",
  "Terkena Air (Water Damage / Korosi)",
  "Touchpad error / loncat-loncat",
  "Kamera / Webcam mati"
]

export function Services() {
  const { role, isOwner } = useUserRole()
  const location = useLocation()
  const { data: settings } = useSWR<any>(
    (import.meta.env.VITE_API_URL || '') + '/api/settings'
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editingService, setEditingService] = useState<any>(null)

  // Warranty Claim State
  const [isWarrantyClaim, setIsWarrantyClaim] = useState(false)
  const [originalTxId, setOriginalTxId] = useState<string | null>(null)
  
  // Form State
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerAddress, setCustomerAddress] = useState("")
  const [deviceName, setDeviceName] = useState("")
  const [issue, setIssue] = useState("")
  const [technicianName, setTechnicianName] = useState("")
  const [estimatedCost, setEstimatedCost] = useState("")
  const [finalCost, setFinalCost] = useState("")
  const [notes, setNotes] = useState("")
  const [status, setStatus] = useState("Diterima")
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null) // State for 3-dot menu
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: "", message: "", confirmText: "Ya", isDestructive: false, onConfirm: () => {} })

  // New States for Servis Upgrades
  const [openWaDropdownId, setOpenWaDropdownId] = useState<string | null>(null)
  const [selectedParts, setSelectedParts] = useState<{ id: string; name: string; price: number; qty: number; maxStock: number }[]>([])
  const [partSearchQuery, setPartSearchQuery] = useState("")
  const [checkoutService, setCheckoutService] = useState<any>(null)
  const [checkoutFinalCost, setCheckoutFinalCost] = useState("")
  const [qcKeyboard, setQcKeyboard] = useState(false)
  const [qcScreen, setQcScreen] = useState(false)
  const [qcWifi, setQcWifi] = useState(false)
  const [qcAudio, setQcAudio] = useState(false)
  const [qcCharger, setQcCharger] = useState(false)
  const [kelengkapanCharger, setKelengkapanCharger] = useState(false)
  const [kelengkapanTas, setKelengkapanTas] = useState(false)
  const [kelengkapanDus, setKelengkapanDus] = useState(false)
  const [kelengkapanLainnya, setKelengkapanLainnya] = useState("")
  const [activeModalTab, setActiveModalTab] = useState<'detail' | 'history'>('detail')

  const getQcPassCount = (notesStr: string) => {
    const match = (notesStr || "").match(/\[QC:\s*(.*?)\]/);
    if (!match) return null;
    try {
      const obj = JSON.parse(match[1]);
      const vals = Object.values(obj);
      const passed = vals.filter(Boolean).length;
      return { passed, total: vals.length };
    } catch(e) {
      return null;
    }
  };

  const handleWAWithTemplate = (s: any, templateType: string) => {
    const storeName = storeSettings?.storeName || localStorage.getItem("storeName") || "HanLaptop";
    const receiptLink = `${window.location.origin}/nota-servis/${s.id}`;
    let template = "";

    const typeLower = templateType.toLowerCase();

    if (typeLower === 'diterima' || typeLower === 'penerimaan') {
      template = storeSettings?.waTemplateServiceDiterima || localStorage.getItem("waTemplateServiceDiterima") || "Halo Kak {nama}, laptop *{unit}* telah kami terima di *{toko}* dengan keluhan: *\"{keluhan}\"*. Unit saat ini dalam antrean pengecekan. Cek status: {link}";
    } else if (typeLower === 'dikerjakan') {
      template = storeSettings?.waTemplateServiceDikerjakan || localStorage.getItem("waTemplateServiceDikerjakan") || "Halo Kak {nama}, laptop *{unit}* di *{toko}* saat ini sedang dalam proses perbaikan oleh teknisi kami. Cek status: {link}";
    } else if (typeLower === 'menunggu part' || typeLower === 'tunggu part') {
      template = storeSettings?.waTemplateServiceMenungguPart || localStorage.getItem("waTemplateServiceMenungguPart") || "Halo Kak {nama}, perbaikan laptop *{unit}* di *{toko}* ditangguhkan sementara karena sedang menunggu ketersediaan sparepart. Cek status: {link}";
    } else if (typeLower === 'selesai' || typeLower === 'diambil') {
      template = storeSettings?.waTemplateServiceSelesai || localStorage.getItem("waTemplateServiceSelesai") || "Halo Kak {nama}, kabar baik! Laptop *{unit}* di *{toko}* selesai diperbaiki. Total Biaya: *{biaya}*. Silakan diambil. Cek detail: {link}";
    } else if (typeLower === 'batal') {
      template = storeSettings?.waTemplateServiceBatal || localStorage.getItem("waTemplateServiceBatal") || "Halo Kak {nama}, mohon maaf perbaikan laptop *{unit}* di *{toko}* dibatalkan karena tidak memungkinkan untuk diperbaiki/suku cadang tidak tersedia. Cek status: {link}";
    } else if (typeLower === 'estimasi') {
      template = "Halo Kak {nama},\n\nBerikut hasil diagnosa untuk laptop *{unit}* di *{toko}*:\n- Keluhan: *\"{keluhan}\"*\n- Tindakan: {tindakan}\n- Estimasi Biaya: *{biaya}*\n\nMohon konfirmasi persetujuannya untuk memulai pengerjaan servis ya Kak. Terima kasih.";
    } else {
      // umum / default
      template = storeSettings?.waTemplateUmum || localStorage.getItem("waTemplateUmum") || "Halo Kak {nama}, ini dengan *{toko}*. ";
      if (!template.includes("{nama}") && !template.includes("{toko}")) {
        template = `Halo Kak {nama}, ini dengan *{toko}*.\n\nUpdate Servis Laptop: *{unit}*\nStatus Saat Ini: *${s.status}*\n{tindakan}\nBiaya: *{biaya}*\nCek Nota Lengkap: {link}\n\nTerima kasih.`;
      }
    }

    const costVal = typeLower === 'selesai' || typeLower === 'diambil' ? (s.finalCost || s.estimatedCost || 0) : (s.estimatedCost || 0);
    const formattedCost = formatCurrency(costVal);
    const tindakanStr = s.notes ? getCleanedNotes(s.notes) : "-";

    const text = template
      .replace(/{nama}/g, s.customerName || "Pelanggan")
      .replace(/{unit}/g, s.deviceName || "Laptop")
      .replace(/{keluhan}/g, s.issue || "-")
      .replace(/{toko}/g, storeName)
      .replace(/{biaya}/g, formattedCost)
      .replace(/{tindakan}/g, tindakanStr)
      .replace(/{link}/g, receiptLink);

    let phone = s.customerPhone || '';
    if (phone.startsWith('0')) phone = '62' + phone.substring(1);
    
    const encodedText = encodeURIComponent(text);
    if (phone) window.open(`https://wa.me/${phone}?text=${encodedText}`, '_blank');
    else window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  }



  const formatNumberInput = (val: string) => {
    if (!val) return "";
    const num = val.toString().replace(/\D/g, "");
    return num ? new Intl.NumberFormat("id-ID").format(parseInt(num, 10)) : "";
  }

  const handleCostChange = (val: string, setter: (val: string) => void) => {
    setter(val.replace(/\D/g, ""));
  }

  // Auto-fill Estimasi Biaya based on Keluhan (supports multi-issue, comma-separated)
  // Recalculates from scratch whenever issue changes — user can still override manually
  useEffect(() => {
    let calculatedCost = 0;

    // Split multi-issue string by comma and calculate for each individual issue
    const issueList = issue.split(",").map(s => s.trim()).filter(Boolean);
    if (issueList.length === 0) return;

    if (settings?.serviceIssues && Array.isArray(settings.serviceIssues)) {
      // For each typed issue, sum up matching preset costs
      for (const singleIssue of issueList) {
        const lowerSingle = singleIssue.toLowerCase();
        for (const si of settings.serviceIssues) {
          if (lowerSingle.includes(si.issue.toLowerCase())) {
            calculatedCost += si.cost;
            break; // only count this preset once per typed issue
          }
        }
      }
    } else {
      // Fallback: check combined string (already handles multi because includes() searches the whole text)
      const lowerIssue = issue.toLowerCase();
      if (lowerIssue.includes("mati total")) calculatedCost += 450000;
      if (lowerIssue.includes("no display") || lowerIssue.includes("blank")) calculatedCost += 350000;
      if (lowerIssue.includes("install ulang") || lowerIssue.includes("bootloop")) calculatedCost += 100000;
      if (lowerIssue.includes("keyboard")) calculatedCost += 300000;
      if (lowerIssue.includes("baterai")) calculatedCost += 400000;
      if (lowerIssue.includes("pembersihan debu") || lowerIssue.includes("thermal paste") || lowerIssue.includes("overheat")) calculatedCost += 150000;
      if (lowerIssue.includes("engsel")) calculatedCost += 200000;
      if (lowerIssue.includes("speaker")) calculatedCost += 150000;
      if (lowerIssue.includes("lupa password")) calculatedCost += 100000;
      if (lowerIssue.includes("terkena air")) calculatedCost += 500000;
    }

    if (calculatedCost > 0) {
      setEstimatedCost(calculatedCost.toString());
    }
  }, [issue, settings]);

  // ── Deteksi mode klaim garansi dari router state ──
  useEffect(() => {
    const state = location.state as any
    if (state?.mode === 'claim' || location.search.includes('mode=claim')) {
      setIsWarrantyClaim(true)
      setOriginalTxId(state?.originalTxId || null)
      setCustomerName(state?.customerName || "")
      setCustomerPhone(state?.customerPhone || "")
      setCustomerAddress(state?.customerAddress || "")
      setDeviceName(state?.deviceDesc || "")
      setIssue("Klaim Garansi")
      setEstimatedCost("0")
      setShowModal(true)
      // Bersihkan state agar tidak trigger ulang jika halaman di-refresh
      window.history.replaceState({}, '', '/services')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { data: services, error: servicesError, mutate, isLoading } = useSWR((import.meta.env.VITE_API_URL || '') + '/api/services', { refreshInterval: 5000 })
  const { data: storeSettings } = useSWR<any>((import.meta.env.VITE_API_URL || '') + '/api/settings')
  const { data: inventoryData, mutate: mutateInventory } = useSWR((import.meta.env.VITE_API_URL || '') + '/api/inventory?fetchAll=true')
  const { data: techniciansData } = useSWR((import.meta.env.VITE_API_URL || '') + '/api/technicians?active=true')
  const { data: suggestionsData, mutate: mutateSuggestions } = useSWR<any>((import.meta.env.VITE_API_URL || '') + '/api/suggestions')

  const mergedLaptopModels = Array.from(new Set([
    ...LAPTOP_MODELS,
    ...(Array.isArray(suggestionsData?.laptopModels) ? suggestionsData.laptopModels : [])
  ]))
  const technicianOptions = Array.isArray(techniciansData) ? techniciansData.map((t: any) => t.name) : []



  const filteredServices = (Array.isArray(services) ? services : []).filter((s: any) => 
    !searchQuery || 
    s.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.issue.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Stats Calculations for Servis
  const activeStatuses = ['Diterima', 'Dikerjakan', 'Menunggu Part']
  const activeServices = (Array.isArray(services) ? services : []).filter((s: any) => activeStatuses.includes(s.status))
  const totalActiveCount = activeServices.length
  const estimatedQueueValue = activeServices.reduce((sum: number, s: any) => sum + (s.estimatedCost || 0), 0)

  const todayStr = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD local time
  
  const finishedToday = (Array.isArray(services) ? services : []).filter((s: any) => {
    if (s.status !== 'Selesai' && s.status !== 'Diambil') return false
    if (!s.completedDate) return false
    const compDateStr = new Date(s.completedDate).toLocaleDateString('en-CA')
    return compDateStr === todayStr
  })
  const finishedTodayCount = finishedToday.length

  const realizedToday = (Array.isArray(services) ? services : [])
    .filter((s: any) => {
      if (s.status !== 'Diambil') return false
      if (!s.completedDate) return false
      const compDateStr = new Date(s.completedDate).toLocaleDateString('en-CA')
      return compDateStr === todayStr
    })
    .reduce((sum: number, s: any) => sum + (s.finalCost || s.estimatedCost || 0), 0)

  const openModal = (service: any = null) => {
    setActiveModalTab('detail')
    setKelengkapanCharger(false)
    setKelengkapanTas(false)
    setKelengkapanDus(false)
    setKelengkapanLainnya("")
    setIsWarrantyClaim(service?.warrantyClaimed || false)
    setOriginalTxId(service?.originalTransactionId || null)
    
    setEditingService(service)
    setCustomerName(service?.customerName || "")
    setCustomerPhone(service?.customerPhone || "")
    setCustomerAddress(service?.customerAddress || "")
    setDeviceName(service?.deviceName || "")
    setIssue(service?.issue || "")
    setTechnicianName(service?.technicianName || "")
    setEstimatedCost(service?.estimatedCost?.toString() || "")
    setStatus(service?.status || "Diterima")
    setFinalCost(service?.finalCost && service.finalCost > 0 
      ? service.finalCost.toString() 
      : (service?.estimatedCost ? service.estimatedCost.toString() : ""))
    
    // Parse parts & QC from notes
    let rawNotes = service?.notes || "";
    let partsList: any[] = [];
    let qcObj = { keyboard: false, screen: false, wifi: false, audio: false, charger: false };
    let kelengkapanObj = { charger: false, tas: false, dus: false, lainnya: "" };
    
    if (service) {
      // Parse spareparts
      const partsMatch = rawNotes.match(/\[Spareparts:\s*(\[[\s\S]*?\])\]/);
      if (partsMatch) {
        try {
          partsList = JSON.parse(partsMatch[1]);
        } catch (e) {
          console.error("Failed to parse spareparts JSON", e);
        }
      }
      
      // Parse QC
      const qcMatch = rawNotes.match(/\[QC:\s*(\{[\s\S]*?\})\]/);
      if (qcMatch) {
        try {
          qcObj = JSON.parse(qcMatch[1]);
        } catch (e) {
          console.error("Failed to parse QC JSON", e);
        }
      }

      // Parse Kelengkapan
      const kelengkapanMatch = rawNotes.match(/\[Kelengkapan:\s*(\{[\s\S]*?\})\]/);
      if (kelengkapanMatch) {
        try {
          kelengkapanObj = JSON.parse(kelengkapanMatch[1]);
        } catch (e) {
          console.error("Failed to parse Kelengkapan JSON", e);
        }
      }

      // Clean the notes unconditionally for modal input view
      rawNotes = rawNotes
        .replace(/\n?\[QC:\s*\{[\s\S]*?\}\]/g, "")
        .replace(/\n?\[Kelengkapan:\s*\{[\s\S]*?\}\]/g, "")
        .replace(/\n?\[Spareparts:\s*\[[\s\S]*?\]\]/g, "")
        .replace(/\n?\[Spareparts:\s*[\s\S]*?\]\]/g, "") // fallback
        .trim();
    }
    
    setSelectedParts(partsList);
    setQcKeyboard(qcObj.keyboard || false);
    setQcScreen(qcObj.screen || false);
    setQcWifi(qcObj.wifi || false);
    setQcAudio(qcObj.audio || false);
    setQcCharger(qcObj.charger || false);
    setKelengkapanCharger(kelengkapanObj.charger || false);
    setKelengkapanTas(kelengkapanObj.tas || false);
    setKelengkapanDus(kelengkapanObj.dus || false);
    setKelengkapanLainnya(kelengkapanObj.lainnya || "");
    setNotes(rawNotes);
    
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = (import.meta.env.VITE_API_URL || '') + (editingService ? `/api/services/${editingService.id}` : '/api/services');
      const method = editingService ? 'PATCH' : 'POST';
      
      // Format notes to append QC, Kelengkapan, and selected parts
      let finalNotes = notes
        .replace(/\n?\[QC:\s*\{[\s\S]*?\}\]/g, "")
        .replace(/\n?\[Spareparts:\s*\[[\s\S]*?\]\]/g, "")
        .replace(/\n?\[Kelengkapan:\s*\{[\s\S]*?\}\]/g, "")
        .trim();
      
      const qcObj = { keyboard: qcKeyboard, screen: qcScreen, wifi: qcWifi, audio: qcAudio, charger: qcCharger };
      finalNotes = `${finalNotes}\n[QC: ${JSON.stringify(qcObj)}]`.trim();
      
      const kelengkapanObj = { charger: kelengkapanCharger, tas: kelengkapanTas, dus: kelengkapanDus, lainnya: kelengkapanLainnya };
      finalNotes = `${finalNotes}\n[Kelengkapan: ${JSON.stringify(kelengkapanObj)}]`.trim();
      
      if (selectedParts.length > 0) {
        finalNotes = `${finalNotes}\n[Spareparts: ${JSON.stringify(selectedParts)}]`.trim();
      }

      const matchedTech = Array.isArray(techniciansData) 
        ? techniciansData.find((t: any) => t.name.trim().toLowerCase() === technicianName.trim().toLowerCase())
        : null;
      const finalTechId = matchedTech ? matchedTech.id : null;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerAddress,
          deviceName,
          issue,
          technicianName,
          technicianId: finalTechId,
          estimatedCost: estimatedCost ? parseFloat(estimatedCost) : 0,
          finalCost: finalCost ? parseFloat(finalCost) : 0,
          status,
          notes: finalNotes,
          warrantyClaimed: isWarrantyClaim,
          originalTransactionId: originalTxId || null,
        })
      });

      if (res.ok) {
        const updatedItem = await res.json()
        toast.success(`Servis berhasil ${editingService ? 'diperbarui' : 'ditambahkan'}`, {
          action: {
            label: "Kirim WA",
            onClick: () => handleWAWithTemplate(updatedItem, updatedItem.status)
          }
        })
        setShowModal(false)
        mutate()
        mutateSuggestions()
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Gagal menyimpan servis");
        mutate();
      }
    } catch (e) {
      toast.error("Terjadi kesalahan jaringan")
    }
  }

  const executeStatusChangeToDiambil = async (id: string, finalCostVal: number) => {
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/services/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'Diambil', 
          createTransaction: true, 
          finalCost: finalCostVal 
        })
      });

      if (res.ok) {
        const updatedItem = await res.json();
        toast.success(`Status diubah menjadi Diambil`, {
          action: {
            label: "Kirim WA",
            onClick: () => handleWAWithTemplate(updatedItem, 'Diambil')
          }
        });
        
        const serviceObj = (Array.isArray(services) ? services : []).find((s: any) => s.id === id);
        if (serviceObj) {
          const partsMatch = (serviceObj.notes || "").match(/\[Spareparts:\s*(.*?)\]$/);
          if (partsMatch) {
            try {
              const partsList = JSON.parse(partsMatch[1]);
              const invList = Array.isArray(inventoryData) ? inventoryData : [];
              for (const part of partsList) {
                const invItem = invList.find((i: any) => i.id === part.id);
                if (invItem) {
                  const newQty = Math.max(0, invItem.quantity - part.qty);
                  await fetch((import.meta.env.VITE_API_URL || '') + `/api/inventory/${part.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      itemName: invItem.itemName,
                      category: invItem.category,
                      sellingPrice: invItem.sellingPrice,
                      quantity: newQty,
                      specs: invItem.specs || undefined,
                      barcode: invItem.barcode || undefined
                    })
                  });
                }
              }
              mutateInventory();
            } catch (e) {
              console.error("Failed to deduct spareparts stock", e);
            }
          }
        }
        mutate();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Gagal mengubah status menjadi Diambil");
        mutate();
      }
    } catch (e) {
      toast.error("Terjadi kesalahan jaringan");
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (newStatus === 'Diambil') {
      const service = services.find((s: any) => s.id === id);
      if (service) {
        setCheckoutService(service);
        const defaultCost = service.finalCost && service.finalCost > 0
          ? service.finalCost.toString()
          : (service.estimatedCost ? service.estimatedCost.toString() : "0");
        setCheckoutFinalCost(defaultCost);
      }
      return;
    }

    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/services/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        const updatedItem = await res.json();
        toast.success(`Status diubah menjadi ${newStatus}`, {
          action: {
            label: "Kirim WA",
            onClick: () => handleWAWithTemplate(updatedItem, newStatus)
          }
        });
        mutate();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Gagal mengubah status");
        mutate();
      }
    } catch (e) {
      toast.error("Terjadi kesalahan jaringan");
    }
  };

  const handleDelete = async (id: string) => {
    if (role !== "owner" && role !== "manager") {
      toast.error("Hanya Owner atau Manager yang dapat menghapus data servis")
      return
    }

    setConfirmDialog({
      isOpen: true,
      title: "Hapus Data Servis",
      message: "Yakin ingin menghapus data servis ini secara permanen?",
      confirmText: "Hapus",
      isDestructive: true,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/services/${id}`, { method: 'DELETE' });
          if (res.ok) {
            toast.success("Data berhasil dihapus")
            mutate()
            mutateSuggestions()
          } else {
            toast.error("Gagal menghapus data")
          }
        } catch (e) {
          toast.error("Terjadi kesalahan jaringan")
        }
      }
    });
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0)
  }

  const handleWA = (s: any) => {
    const storeName = localStorage.getItem("storeName") || "HanLaptop";
    const receiptLink = `${window.location.origin}/nota-servis/${s.id}`;
    const text = `Halo Kak ${s.customerName},\nIni dengan *${storeName}*.\n\nUpdate Servis Laptop: *${s.deviceName}*\nStatus Saat Ini: *${s.status}*\n${s.notes ? `Catatan: ${getCleanedNotes(s.notes)}\n` : ''}${s.status === 'Selesai' || s.status === 'Diambil' ? `Biaya Akhir: ${formatCurrency(s.finalCost || s.estimatedCost)}\n` : `Estimasi Biaya: ${formatCurrency(s.estimatedCost)}\n`}\nCek Nota/Status Lengkap: ${receiptLink}\n\nTerima kasih.`;
    
    let phone = s.customerPhone || '';
    if (phone.startsWith('0')) phone = '62' + phone.substring(1);
    
    const encodedText = encodeURIComponent(text);
    if (phone) window.open(`https://wa.me/${phone}?text=${encodedText}`, '_blank');
    else window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Diterima': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
      case 'Dikerjakan': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
      case 'Menunggu Part': return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800'
      case 'Selesai': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
      case 'Diambil': return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
      case 'Batal': return 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="sticky top-0 z-40 shrink-0 flex flex-col md:flex-row justify-between gap-2 md:items-center p-3 md:px-5 md:py-3 bg-white/80 light-blue:bg-white dark:bg-card backdrop-blur-xl rounded-xl md:rounded-[2rem] border border-border shadow-sm mt-0 mb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" /> Manajemen Servis
          </h2>
          <p className="text-muted-foreground text-xs md:text-sm">Pantau proses perbaikan laptop dari masuk hingga selesai.</p>
        </div>
        {localStorage.getItem('selectedStoreId') !== 'all' && (
          <Button onClick={() => openModal()} className="rounded-full shadow-lg shadow-primary/20 whitespace-nowrap">
            <Plus className="mr-2 h-4 w-4" /> Tambah Servis
          </Button>
        )}
      </div>

      {/* Stats Board Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 shrink-0">
        <Card className="bg-card border-border/60 shadow-sm">
          <CardContent className="p-3 md:p-3.5 flex flex-col justify-center">
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground">Servis Aktif</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-lg md:text-2xl font-extrabold text-blue-600 dark:text-blue-400">{totalActiveCount}</span>
              <span className="text-[9px] md:text-[10px] text-muted-foreground font-medium">unit antrean</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border/60 shadow-sm">
          <CardContent className="p-3 md:p-3.5 flex flex-col justify-center">
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground">Estimasi Antrean</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-lg md:text-2xl font-extrabold text-amber-600 dark:text-amber-400">{formatCurrency(estimatedQueueValue)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/60 shadow-sm">
          <CardContent className="p-3 md:p-3.5 flex flex-col justify-center">
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground">Selesai Hari Ini</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-lg md:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{finishedTodayCount}</span>
              <span className="text-[9px] md:text-[10px] text-muted-foreground font-medium">unit</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/60 shadow-sm">
          <CardContent className="p-3 md:p-3.5 flex flex-col justify-center">
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground">Pendapatan Hari Ini</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-lg md:text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{formatCurrency(realizedToday)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 mb-4 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Cari nama pelanggan, unit, atau keluhan..." 
            className="pl-9 bg-card rounded-xl h-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {servicesError ? (
          <div className="flex h-full items-center justify-center p-8">
            <div className="text-center">
              <p className="text-destructive font-semibold text-lg mb-2">Gagal memuat data servis</p>
              <p className="text-muted-foreground text-sm mb-4">{servicesError.message}</p>
              <Button onClick={() => mutate()} variant="outline">Coba Lagi</Button>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">Memuat data servis...</div>
        ) : (
          <div className="flex h-full gap-4 pb-4 px-1 min-w-max">
            {COLUMNS.map(col => {
              const colItems = filteredServices.filter((s:any) => s.status === col)
              return (
                <div 
                  key={col} 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const id = e.dataTransfer.getData("text/plain");
                    if (id) {
                      handleStatusChange(id, col);
                    }
                  }}
                  className="w-80 flex flex-col h-full max-h-full bg-muted/40 rounded-2xl border border-border overflow-hidden"
                >
                  <div className="p-3 border-b border-border bg-card/50 flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-sm">{col}</h3>
                    <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">{colItems.length}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {colItems.map((item:any) => {
                      const sla = getSlaStatus(item.receivedDate, item.status);
                      return (
                        <Card 
                          key={item.id} 
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", item.id);
                          }}
                          className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow border-border/60 bg-card text-left ${
                            sla
                              ? sla.level === 'critical'
                                ? 'border-l-4 border-l-rose-500'
                                : sla.level === 'warning'
                                ? 'border-l-4 border-l-amber-500'
                                : 'border-l-4 border-l-emerald-500'
                              : ''
                          }`}
                        >
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1 overflow-hidden">
                                <h4 className="font-bold text-sm truncate" title={item.deviceName}>{item.deviceName}</h4>
                                <p className="text-xs text-muted-foreground truncate">{item.customerName}</p>
                              </div>
                              <div className="flex flex-col items-end gap-1 ml-2 whitespace-nowrap shrink-0">
                                <div className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${getStatusColor(item.status)}`}>
                                  {item.status}
                                </div>
                                {item.warrantyClaimed && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
                                    🛡️ Garansi
                                  </span>
                                )}
                                {sla && (
                                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold border ${sla.className}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${sla.dotColor}`} />
                                    {sla.label}
                                  </span>
                                )}
                              </div>
                            </div>
                          
                          <p className="text-xs text-foreground/80 line-clamp-2 mb-3 bg-muted/50 p-1.5 rounded-md border border-border/50">
                            "{item.issue}"
                          </p>

                          <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-border/50">
                            {/* First row: Cost and QC status (left), action button (right) */}
                            <div className="flex flex-wrap justify-between items-center gap-1.5 min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0 shrink-0">
                                <span className="text-xs font-bold text-primary shrink-0">
                                  {formatCurrency(item.finalCost && item.finalCost > 0 ? item.finalCost : item.estimatedCost)}
                                </span>
                                {(() => {
                                  const qc = getQcPassCount(item.notes);
                                  if (!qc) return null;
                                  const isAllPassed = qc.passed === qc.total;
                                  return (
                                    <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-bold border whitespace-nowrap ${
                                      isAllPassed 
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800" 
                                        : "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
                                    }`}>
                                      QC: {qc.passed}/{qc.total} {isAllPassed ? "✓" : ""}
                                    </span>
                                  );
                                })()}
                              </div>
                              {localStorage.getItem('selectedStoreId') !== 'all' && (
                                <div className="flex shrink-0">
                                  {item.status === 'Diterima' && (
                                    <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded font-bold" onClick={() => handleStatusChange(item.id, 'Dikerjakan')}>
                                      Kerjakan
                                    </Button>
                                  )}
                                  {item.status === 'Dikerjakan' && (
                                    <div className="flex gap-1">
                                      <Button variant="outline" size="sm" className="h-7 px-1.5 text-[10px] border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100 rounded font-bold" onClick={() => handleStatusChange(item.id, 'Menunggu Part')}>
                                        Tunggu Part
                                      </Button>
                                      <Button variant="outline" size="sm" className="h-7 px-1.5 text-[10px] border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded font-bold" onClick={() => handleStatusChange(item.id, 'Selesai')}>
                                        Selesai
                                      </Button>
                                    </div>
                                  )}
                                  {item.status === 'Menunggu Part' && (
                                    <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded font-bold" onClick={() => handleStatusChange(item.id, 'Dikerjakan')}>
                                      Lanjut Kerjakan
                                    </Button>
                                  )}
                                  {item.status === 'Selesai' && (
                                    <Button variant="default" size="sm" className="h-7 px-2 text-[10px] bg-primary text-primary-foreground hover:bg-primary/90 rounded font-bold" onClick={() => handleStatusChange(item.id, 'Diambil')}>
                                      Ambil & Bayar
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Second row: Utility buttons */}
                            <div className="flex justify-end items-center gap-1 border-t border-border/30 pt-1.5 mt-0.5">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 shrink-0" onClick={() => {
                                const storeName = storeSettings?.storeName || localStorage.getItem("storeName") || "HanLaptop";
                                const storeAddress = storeSettings?.storeAddress || localStorage.getItem("storeAddress") || "Jl. Komputer Raya No.123";
                                const storePhone = storeSettings?.storePhone || localStorage.getItem("storePhone") || "0812-3456-7890";
                                printServiceLabel(item, { name: storeName, address: storeAddress, phone: storePhone });
                              }} title="Cetak Label Unit">
                                <Printer className="h-4 w-4" />
                              </Button>

                              <div className="relative inline-block shrink-0">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" 
                                  onClick={() => setOpenWaDropdownId(openWaDropdownId === item.id ? null : item.id)}
                                  title="WhatsApp Update"
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </Button>
                                {openWaDropdownId === item.id && (
                                  <>
                                    <div className="fixed inset-0 z-[90]" onClick={() => setOpenWaDropdownId(null)} />
                                    <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-xl z-[100] animate-in fade-in zoom-in-95 p-1 text-left">
                                      <div className="text-[10px] font-bold px-2 py-1 text-muted-foreground border-b mb-1">Kirim Update WA</div>
                                      <button type="button" className="w-full text-left px-2 py-1.5 text-[11px] font-medium hover:bg-muted rounded transition-colors" onClick={() => { handleWAWithTemplate(item, 'penerimaan'); setOpenWaDropdownId(null); }}>📩 Penerimaan Unit</button>
                                      <button type="button" className="w-full text-left px-2 py-1.5 text-[11px] font-medium hover:bg-muted rounded transition-colors" onClick={() => { handleWAWithTemplate(item, 'estimasi'); setOpenWaDropdownId(null); }}>💰 Estimasi Biaya</button>
                                      <button type="button" className="w-full text-left px-2 py-1.5 text-[11px] font-medium hover:bg-muted rounded transition-colors" onClick={() => { handleWAWithTemplate(item, 'selesai'); setOpenWaDropdownId(null); }}>✅ Selesai Diperbaiki</button>
                                      <button type="button" className="w-full text-left px-2 py-1.5 text-[11px] font-medium hover:bg-muted rounded transition-colors" onClick={() => { handleWAWithTemplate(item, 'batal'); setOpenWaDropdownId(null); }}>❌ Batal/No Fix</button>
                                      <button type="button" className="w-full text-left px-2 py-1.5 text-[11px] font-medium hover:bg-muted rounded transition-colors border-t border-border/50 mt-1" onClick={() => { handleWAWithTemplate(item, 'umum'); setOpenWaDropdownId(null); }}>💬 Status Umum</button>
                                    </div>
                                  </>
                                )}
                              </div>
                              {localStorage.getItem('selectedStoreId') !== 'all' && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 shrink-0" onClick={() => openModal(item)} title="Edit">
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <div className="relative inline-block">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-7 w-7" 
                                      onClick={() => setOpenDropdownId(openDropdownId === item.id ? null : item.id)}
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                    {openDropdownId === item.id && (
                                      <>
                                        <div className="fixed inset-0 z-[90]" onClick={() => setOpenDropdownId(null)} />
                                        <div className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-xl shadow-xl z-[100] animate-in fade-in zoom-in-95 p-1">
                                          <div className="text-[10px] font-bold px-2 py-1 text-muted-foreground">Pindah Status</div>
                                          {COLUMNS.filter(c => c !== col).map(c => (
                                            <button 
                                              key={c}
                                              className="w-full text-left px-2 py-1.5 text-[11px] font-medium hover:bg-muted rounded transition-colors"
                                              onClick={() => {
                                                handleStatusChange(item.id, c);
                                                setOpenDropdownId(null);
                                              }}
                                            >
                                              &rarr; {c}
                                            </button>
                                          ))}
                                          {(role === "owner" || role === "manager") && (
                                            <button 
                                              className="w-full text-left px-2 py-1.5 text-[11px] font-medium text-destructive hover:bg-destructive/10 rounded transition-colors mt-1 border-t border-border/50"
                                              onClick={() => {
                                                handleDelete(item.id);
                                                setOpenDropdownId(null);
                                              }}
                                            >
                                              <Trash2 className="inline-block h-3 w-3 mr-1" /> Hapus
                                            </button>
                                          )}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );})}
                    {colItems.length === 0 && (
                      <div className="text-center py-8 text-xs text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
                        Tidak ada data
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-[500px] max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl border border-border flex flex-col">
            <div className="px-5 py-4 border-b border-border flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold flex items-center gap-2">
                {isWarrantyClaim && <ShieldCheck className="h-5 w-5 text-blue-600" />}
                {editingService
                  ? (editingService.warrantyClaimed ? 'Edit Klaim Garansi' : 'Edit Data Servis')
                  : (isWarrantyClaim ? 'Klaim Garansi' : 'Tambah Servis Baru')
                }
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(false)} className="h-8 w-8 rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Warranty Claim Banner */}
            {isWarrantyClaim && (
              <div className="mx-5 mt-4 flex items-start gap-3 rounded-xl border border-blue-300 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-800 p-3">
                <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-blue-800 dark:text-blue-300">Mode Klaim Garansi</p>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                    Service ini tercatat sebagai <strong>klaim garansi gratis</strong>. Data pelanggan dan unit sudah otomatis terisi dari transaksi pembelian.
                  </p>
                </div>
              </div>
            )}

            {editingService && (
              <div className="flex border-b border-border text-sm font-medium shrink-0 bg-muted/20">
                <button
                  type="button"
                  onClick={() => setActiveModalTab('detail')}
                  className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${
                    activeModalTab === 'detail'
                      ? 'border-indigo-600 text-indigo-600 font-bold dark:border-indigo-500 dark:text-indigo-400'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Detail Servis
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('history')}
                  className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${
                    activeModalTab === 'history'
                      ? 'border-indigo-600 text-indigo-600 font-bold dark:border-indigo-500 dark:text-indigo-400'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Riwayat Unit
                </button>
              </div>
            )}

            {(!editingService || activeModalTab === 'detail') ? (
              <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1">
                {editingService?.status === 'Batal' && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl flex items-start gap-2.5 text-xs font-semibold leading-relaxed">
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Servis Dibatalkan Pelanggan</p>
                      <p className="font-normal text-[11px] text-rose-600 mt-0.5">Pelanggan telah membatalkan perbaikan ini melalui link nota. Status terkunci dan pengerjaan tidak dapat dilanjutkan.</p>
                    </div>
                  </div>
                )}
                {editingService?.status === 'Diambil' && (
                  <div className="bg-slate-50 border border-slate-200 text-slate-700 p-3 rounded-xl flex items-start gap-2.5 text-xs font-semibold leading-relaxed">
                    <CheckCircle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Servis Selesai & Diambil</p>
                      <p className="font-normal text-[11px] text-slate-600 mt-0.5">Unit laptop telah diambil oleh pelanggan dan transaksi pembayaran telah lunas dibayar.</p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nama Pelanggan <span className="text-destructive">*</span></label>
                    <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">No WhatsApp</label>
                    <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="0812..." />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Alamat Pelanggan</label>
                  <Input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Jl. Alamat Lengkap..." />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipe/Unit Laptop <span className="text-destructive">*</span></label>
                  <Autocomplete 
                    options={mergedLaptopModels} 
                    value={deviceName} 
                    onChange={setDeviceName} 
                    placeholder="Asus ROG / Lenovo ThinkPad..." 
                    inputClassName="border-border" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Keluhan / Kerusakan <span className="text-destructive">*</span></label>
                  <Autocomplete 
                    options={settings?.serviceIssues?.map((si: any) => si.issue) || COMMON_SERVICE_ISSUES} 
                    value={issue} 
                    onChange={setIssue} 
                    placeholder="Mati total / Layar blank..." 
                    inputClassName="border-border"
                    allowMultiple={true}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nama Teknisi</label>
                    <Autocomplete
                      placeholder="Pilih atau ketik nama teknisi..."
                      value={technicianName}
                      onChange={setTechnicianName}
                      options={technicianOptions}
                      inputClassName="border-border text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Estimasi Biaya</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-sm text-muted-foreground font-medium">Rp</span>
                      <Input type="text" value={formatNumberInput(estimatedCost)} onChange={(e) => handleCostChange(e.target.value, setEstimatedCost)} className="pl-9" />
                    </div>
                  </div>
                </div>

                {editingService && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <label className="text-sm font-medium text-emerald-600">Biaya Akhir (Final Cost)</label>
                    <p className="text-[10px] text-muted-foreground -mt-1 mb-1">Isi sebelum menandai Selesai/Diambil</p>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-2.5 text-sm text-emerald-600 font-medium">Rp</span>
                      <Input type="text" value={formatNumberInput(finalCost)} onChange={(e) => handleCostChange(e.target.value, setFinalCost)} className="pl-9 border-emerald-200 focus-visible:ring-emerald-500" />
                    </div>
                  </div>
                )}

                {/* Spareparts Section */}
                <div className="space-y-2 border-t pt-3 border-border">
                  <label className="text-sm font-medium text-primary">Sparepart Terpakai (Opsional)</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Autocomplete
                        placeholder="Cari sparepart di stok..."
                        value={partSearchQuery}
                        onChange={(val) => {
                          setPartSearchQuery(val);
                          const invList = Array.isArray(inventoryData) ? inventoryData : [];
                          const matched = invList.find((i: any) => i.itemName === val && i.quantity > 0);
                          if (matched) {
                            setSelectedParts((prev) => {
                              const exists = prev.find((p) => p.id === matched.id);
                              if (exists) return prev;
                              return [...prev, { id: matched.id, name: matched.itemName, price: matched.sellingPrice, qty: 1, maxStock: matched.quantity }];
                            });
                            setPartSearchQuery("");
                            // Adjust cost automatically
                            if (editingService) {
                              setFinalCost((prev) => {
                                const curr = prev ? parseFloat(prev.replace(/\D/g, "")) : 0;
                                return (curr + matched.sellingPrice).toString();
                              });
                            } else {
                              setEstimatedCost((prev) => {
                                const curr = prev ? parseFloat(prev.replace(/\D/g, "")) : 0;
                                return (curr + matched.sellingPrice).toString();
                              });
                            }
                          }
                        }}
                        options={(Array.isArray(inventoryData) ? inventoryData : [])
                          .filter((i: any) => i.quantity > 0)
                          .map((i: any) => i.itemName)}
                      />
                    </div>
                  </div>

                  {selectedParts.length > 0 && (
                    <div className="space-y-1.5 mt-2 bg-muted/40 p-2.5 rounded-xl border border-border">
                      {selectedParts.map((part) => (
                        <div key={part.id} className="flex justify-between items-center text-xs">
                          <span className="font-semibold truncate max-w-[200px]" title={part.name}>{part.name}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Input
                              type="number"
                              min="1"
                              max={part.maxStock}
                              value={part.qty}
                              onChange={(e) => {
                                const newQty = Math.min(part.maxStock, Math.max(1, parseInt(e.target.value) || 1));
                                const qtyDiff = newQty - part.qty;
                                setSelectedParts(selectedParts.map(p => p.id === part.id ? { ...p, qty: newQty } : p));
                                if (editingService) {
                                  setFinalCost((prev) => {
                                    const curr = prev ? parseFloat(prev.replace(/\D/g, "")) : 0;
                                    return (curr + (qtyDiff * part.price)).toString();
                                  });
                                } else {
                                  setEstimatedCost((prev) => {
                                    const curr = prev ? parseFloat(prev.replace(/\D/g, "")) : 0;
                                    return (curr + (qtyDiff * part.price)).toString();
                                  });
                                }
                              }}
                              className="w-12 h-6 text-center text-[10px] p-0.5"
                            />
                            <span className="text-[10px] text-muted-foreground">/ {part.maxStock}</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(part.price * part.qty)}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedParts(selectedParts.filter((p) => p.id !== part.id));
                                if (editingService) {
                                  setFinalCost((prev) => {
                                    const curr = prev ? parseFloat(prev.replace(/\D/g, "")) : 0;
                                    return Math.max(0, curr - (part.price * part.qty)).toString();
                                  });
                                } else {
                                  setEstimatedCost((prev) => {
                                    const curr = prev ? parseFloat(prev.replace(/\D/g, "")) : 0;
                                    return Math.max(0, curr - (part.price * part.qty)).toString();
                                  });
                                }
                              }}
                              className="h-5 w-5 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Kelengkapan Unit */}
                <div className="space-y-2 border-t pt-3 border-border">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      Kelengkapan Unit Diterima
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const allChecked = kelengkapanCharger && kelengkapanTas && kelengkapanDus;
                        setKelengkapanCharger(!allChecked);
                        setKelengkapanTas(!allChecked);
                        setKelengkapanDus(!allChecked);
                      }}
                      className="text-[10px] text-indigo-600 hover:text-indigo-700 font-bold hover:underline"
                    >
                      {kelengkapanCharger && kelengkapanTas && kelengkapanDus ? "Uncheck Semua" : "Ceklis Semua"}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 bg-muted/30 p-3 rounded-xl border border-border">
                    <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                      <input type="checkbox" checked={kelengkapanCharger} onChange={(e) => setKelengkapanCharger(e.target.checked)} className="rounded border-slate-300 dark:border-slate-800 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5" />
                      Charger
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                      <input type="checkbox" checked={kelengkapanTas} onChange={(e) => setKelengkapanTas(e.target.checked)} className="rounded border-slate-300 dark:border-slate-800 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5" />
                      Tas / Case
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                      <input type="checkbox" checked={kelengkapanDus} onChange={(e) => setKelengkapanDus(e.target.checked)} className="rounded border-slate-300 dark:border-slate-800 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5" />
                      Dus / Box
                    </label>
                  </div>
                  <div className="mt-1">
                    <Input value={kelengkapanLainnya} onChange={(e) => setKelengkapanLainnya(e.target.value)} placeholder="Kelengkapan lain (misal: Mouse, RAM, dll.)" className="text-xs h-8" />
                  </div>
                </div>

                {/* Quality Control (QC) Checklist */}
                <div className="space-y-2 border-t pt-3 border-border">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      Quality Control (QC) Checklist
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const allChecked = qcKeyboard && qcScreen && qcWifi && qcAudio && qcCharger;
                        setQcKeyboard(!allChecked);
                        setQcScreen(!allChecked);
                        setQcWifi(!allChecked);
                        setQcAudio(!allChecked);
                        setQcCharger(!allChecked);
                      }}
                      className="text-[10px] text-amber-600 hover:text-amber-700 font-bold hover:underline"
                    >
                      {qcKeyboard && qcScreen && qcWifi && qcAudio && qcCharger ? "Uncheck Semua" : "Ceklis Semua"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 bg-muted/30 p-3 rounded-xl border border-border">
                    <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                      <input type="checkbox" checked={qcKeyboard} onChange={(e) => setQcKeyboard(e.target.checked)} className="rounded border-slate-300 dark:border-slate-800 text-primary focus:ring-primary w-3.5 h-3.5" />
                      Keyboard & Touchpad
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                      <input type="checkbox" checked={qcScreen} onChange={(e) => setQcScreen(e.target.checked)} className="rounded border-slate-300 dark:border-slate-800 text-primary focus:ring-primary w-3.5 h-3.5" />
                      Layar / Display
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                      <input type="checkbox" checked={qcWifi} onChange={(e) => setQcWifi(e.target.checked)} className="rounded border-slate-300 dark:border-slate-800 text-primary focus:ring-primary w-3.5 h-3.5" />
                      Wi-Fi & Bluetooth
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                      <input type="checkbox" checked={qcAudio} onChange={(e) => setQcAudio(e.target.checked)} className="rounded border-slate-300 dark:border-slate-800 text-primary focus:ring-primary w-3.5 h-3.5" />
                      Audio & Speaker
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                      <input type="checkbox" checked={qcCharger} onChange={(e) => setQcCharger(e.target.checked)} className="rounded border-slate-300 dark:border-slate-800 text-primary focus:ring-primary w-3.5 h-3.5" />
                      Baterai & Charger
                    </label>
                  </div>
                </div>

                {editingService && (
                  <div className="space-y-2 border-t pt-3 border-border">
                    <label className="text-sm font-medium text-foreground">Status Servis</label>
                    <select 
                      value={status} 
                      onChange={(e) => setStatus(e.target.value)} 
                      disabled={editingService.status === 'Batal' || editingService.status === 'Diambil'}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:bg-muted"
                    >
                      {COLUMNS.map((col) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Catatan Tambahan (Internal/Garansi)</label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>

                <div className="pt-4 flex justify-end items-center gap-2 border-t border-border mt-4">
                  {(role === "owner" || role === "manager") && editingService && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive mr-auto flex items-center gap-1.5" 
                      onClick={() => {
                        handleDelete(editingService.id);
                        setShowModal(false);
                      }}
                    >
                      <Trash2 className="h-4 w-4" /> Hapus Servis
                    </Button>
                  )}
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Tutup</Button>
                  <Button type="submit">{editingService ? 'Simpan Perubahan' : 'Tambah Servis'}</Button>
                </div>
              </form>
            ) : (
              <div className="p-5 space-y-4 flex-grow overflow-y-auto max-h-[60vh] text-left">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Riwayat Perbaikan Sebelumnya
                </h3>
                {(() => {
                  const otherServices = (Array.isArray(services) ? services : []).filter((s: any) => {
                    if (!editingService) return false;
                    if (s.id === editingService.id) return false;
                    
                    const samePhone = customerPhone && s.customerPhone && s.customerPhone.trim() === customerPhone.trim();
                    const sameDevice = deviceName && s.deviceName && s.deviceName.toLowerCase().trim() === deviceName.toLowerCase().trim();
                    
                    return samePhone || sameDevice;
                  });

                  if (otherServices.length === 0) {
                    return (
                      <p className="text-xs text-muted-foreground italic py-8 text-center bg-muted/20 rounded-xl border border-dashed border-border/50">
                        Tidak ada riwayat perbaikan sebelumnya untuk unit/pelanggan ini.
                      </p>
                    );
                  }

                  const getInlineCleanedNotes = (notesStr: string) => {
                    return getCleanedNotes(notesStr) || "-";
                  };

                  const getStatusColor = (st: string) => {
                    if (st === 'Selesai' || st === 'Diambil') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200/50';
                    if (st === 'Batal') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200/50';
                    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200/50';
                  };

                  return (
                    <div className="space-y-3">
                      {otherServices.map((s: any) => (
                        <div key={s.id} className="p-3 border border-border rounded-xl bg-muted/20 space-y-2 text-xs">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-mono text-muted-foreground">
                              {new Date(s.receivedDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-[9px] border ${getStatusColor(s.status)}`}>
                              {s.status}
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-foreground">{s.deviceName}</p>
                            <p className="text-muted-foreground mt-0.5">Keluhan: <span className="font-semibold text-foreground">{s.issue}</span></p>
                          </div>
                          <div className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded border border-border/40">
                            <span className="font-semibold block text-[10px] uppercase text-muted-foreground mb-0.5">Catatan:</span>
                            <p className="italic text-foreground">{getInlineCleanedNotes(s.notes)}</p>
                          </div>
                          <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                            <span>Teknisi: <span className="font-semibold text-foreground">{s.technicianName || "-"}</span></span>
                            <span className="font-bold text-foreground">
                              {formatCurrency(s.finalCost || s.estimatedCost || 0)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                <div className="pt-4 flex justify-end border-t border-border mt-4 shrink-0">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Tutup</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* MODAL CHECKOUT SERVIS (AMBIL & BAYAR) */}
      {checkoutService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-2xl shadow-xl border border-border flex flex-col overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
              <h3 className="font-bold text-base">Ambil & Bayar Laptop</h3>
              <Button variant="ghost" size="icon" onClick={() => setCheckoutService(null)} className="h-8 w-8 rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-5 space-y-4 text-left">
              <div className="text-sm">
                <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Unit & Pelanggan</p>
                <p className="font-bold text-foreground text-sm mt-0.5">{checkoutService.deviceName}</p>
                <p className="text-xs text-muted-foreground">Pelanggan: {checkoutService.customerName}</p>
              </div>

              <div className="bg-muted/40 p-3 rounded-xl border border-border/60 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Estimasi Awal:</span>
                  <span className="font-semibold text-foreground">{formatCurrency(checkoutService.estimatedCost)}</span>
                </div>
                {checkoutService.finalCost && checkoutService.finalCost !== checkoutService.estimatedCost && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Biaya Akhir Tersimpan:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(checkoutService.finalCost)}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Biaya Akhir (Final Cost)</label>
                
                <div className="flex gap-2">
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    className="flex-1 text-[10px] h-7 font-bold border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100 dark:border-blue-900 dark:text-blue-400 dark:bg-blue-950/20"
                    onClick={() => setCheckoutFinalCost(checkoutService.estimatedCost?.toString() || "0")}
                  >
                    Pakai Estimasi Awal
                  </Button>
                  {checkoutService.finalCost && (
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      className="flex-1 text-[10px] h-7 font-bold border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 dark:border-emerald-900 dark:text-emerald-400 dark:bg-emerald-950/20"
                      onClick={() => setCheckoutFinalCost(checkoutService.finalCost?.toString() || "0")}
                    >
                      Pakai Biaya Tersimpan
                    </Button>
                  )}
                </div>

                <div className="relative mt-2">
                  <span className="absolute left-3 top-2.5 text-sm text-emerald-600 font-bold">Rp</span>
                  <Input 
                    type="text" 
                    value={formatNumberInput(checkoutFinalCost)} 
                    onChange={(e) => handleCostChange(e.target.value, setCheckoutFinalCost)} 
                    className="pl-9 font-bold text-emerald-600 dark:text-emerald-400 border-emerald-200 focus-visible:ring-emerald-500" 
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border mt-4">
                <Button variant="outline" size="sm" onClick={() => setCheckoutService(null)}>
                  Batal
                </Button>
                <Button 
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  onClick={async () => {
                    const finalCostVal = parseFloat(checkoutFinalCost.replace(/\D/g, "")) || 0;
                    const sId = checkoutService.id;
                    setCheckoutService(null);
                    await executeStatusChangeToDiambil(sId, finalCostVal);
                  }}
                >
                  Konfirmasi & Bayar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-[400px] rounded-2xl shadow-xl border border-border flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className={`px-5 py-4 border-b ${confirmDialog.isDestructive ? 'border-rose-100 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-900' : 'border-slate-100 bg-slate-50/50 dark:bg-slate-800/50 dark:border-slate-800'} flex items-start gap-3`}>
              <AlertCircle className={`h-6 w-6 mt-0.5 ${confirmDialog.isDestructive ? 'text-rose-500' : 'text-blue-500'}`} />
              <div>
                <h2 className="text-lg font-bold text-foreground">{confirmDialog.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{confirmDialog.message}</p>
              </div>
            </div>
            <div className="p-4 bg-card flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}>Batal</Button>
              <Button type="button" variant={confirmDialog.isDestructive ? 'destructive' : 'default'} onClick={confirmDialog.onConfirm}>{confirmDialog.confirmText}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
