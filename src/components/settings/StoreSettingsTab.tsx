import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useUserRole } from "@/hooks/useUserRole"
import { 
  Save, 
  CheckCircle2, 
  Building2, 
  MessageSquare, 
  Sliders, 
  Plus, 
  Trash2, 
  Check, 
  Sparkles,
  Image as ImageIcon,
  PenTool,
  Smartphone
} from "lucide-react"
import { toast } from "sonner"

export function StoreSettingsTab() {
  const { isOwner } = useUserRole()
  const [applyToAllBranches, setApplyToAllBranches] = useState(false)
  const [storeName, setStoreName] = useState("HanLaptop")
  const [storeLogo, setStoreLogo] = useState("")
  const [storeSignature, setStoreSignature] = useState("")
  const [address, setAddress] = useState("Jl. Komputer Raya No.123")
  const [phone, setPhone] = useState("0812-3456-7890")
  const [storeFooter, setStoreFooter] = useState("")
  const [storeInstagram, setStoreInstagram] = useState("hanlaptop")
  const [waTemplatePiutang, setWaTemplatePiutang] = useState("Halo Kak {nama}, sekadar mengingatkan bahwa ada tagihan dari *{toko}* untuk nota *{nota}* senilai *{sisa}* yang jatuh tempo pada *{tempo}*. Terima kasih.")
  const [waTemplateUmum, setWaTemplateUmum] = useState("Halo Kak {nama}, ini dengan *{toko}*. ")
  const [waTemplateNota, setWaTemplateNota] = useState("Halo Kak {nama}, berikut adalah detail transaksi Kakak di *{toko}* untuk nota *{nota}* senilai *{total}*.\n\nLihat Nota Online: {link}\n\nTerima kasih telah berbelanja di tempat kami!")
  const [waTemplateServiceDiterima, setWaTemplateServiceDiterima] = useState("Halo Kak {nama}, laptop *{unit}* telah kami terima di *{toko}* dengan keluhan: *\"{keluhan}\"*. Unit saat ini dalam antrean pengecekan. Cek status: {link}")
  const [waTemplateServiceDikerjakan, setWaTemplateServiceDikerjakan] = useState("Halo Kak {nama}, laptop *{unit}* di *{toko}* saat ini sedang dalam proses perbaikan oleh teknisi kami. Cek status: {link}")
  const [waTemplateServiceMenungguPart, setWaTemplateServiceMenungguPart] = useState("Halo Kak {nama}, perbaikan laptop *{unit}* di *{toko}* ditangguhkan sementara karena sedang menunggu ketersediaan sparepart. Cek status: {link}")
  const [waTemplateServiceSelesai, setWaTemplateServiceSelesai] = useState("Halo Kak {nama}, kabar baik! Laptop *{unit}* di *{toko}* selesai diperbaiki. Total Biaya: *{biaya}*. Silakan diambil. Cek detail: {link}")
  const [waTemplateServiceBatal, setWaTemplateServiceBatal] = useState("Halo Kak {nama}, mohon maaf perbaikan laptop *{unit}* di *{toko}* dibatalkan karena tidak memungkinkan untuk diperbaiki/suku cadang tidak tersedia. Cek status: {link}")
  const [enableCashierShift, setEnableCashierShift] = useState(true)
  const [savedInfo, setSavedInfo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expenseCategories, setExpenseCategories] = useState<string[]>([])
  const [serviceIssues, setServiceIssues] = useState<{ issue: string; cost: number }[]>([])
  const [newCategory, setNewCategory] = useState("")
  const [newIssue, setNewIssue] = useState("")
  const [newIssueCost, setNewIssueCost] = useState("")

  // Sub-tab navigation state
  const [settingsActiveSubTab, setSettingsActiveSubTab] = useState<"umum" | "wa" | "erp">("umum")
  
  // WhatsApp Template active selection
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<
    "umum" | "piutang" | "nota" | "servis_terima" | "servis_kerja" | "servis_part" | "servis_selesai" | "servis_batal"
  >("umum")

  useEffect(() => {
    // Load Store Info from API (fallback to local if error)
    setLoading(true)
    fetch((import.meta.env.VITE_API_URL || '') + '/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setStoreName(data.storeName || "HanLaptop")
          setStoreLogo(data.storeLogo || "")
          setStoreSignature(data.storeSignature || "")
          setAddress(data.storeAddress || "")
          setPhone(data.storePhone || "")
          
          // Parse footer and Instagram
          let rawFooter = data.storeFooter || ""
          let parsedInstagram = "hanlaptop"
          if (rawFooter.includes("|||IG:")) {
            const parts = rawFooter.split("|||IG:")
            rawFooter = parts[0]
            parsedInstagram = parts[1] || "hanlaptop"
          }
          setStoreFooter(rawFooter)
          setStoreInstagram(parsedInstagram)
          
          setEnableCashierShift(data.enableCashierShift !== false)
          
          localStorage.setItem("storeName", data.storeName || "HanLaptop")
          localStorage.setItem("storeLogo", data.storeLogo || "")
          localStorage.setItem("storeSignature", data.storeSignature || "")
          localStorage.setItem("storeAddress", data.storeAddress || "Jl. Komputer Raya No.123")
          localStorage.setItem("storePhone", data.storePhone || "0812-3456-7890")
          localStorage.setItem("storeFooter", rawFooter)
          localStorage.setItem("storeInstagram", parsedInstagram)
          localStorage.setItem("enableCashierShift", data.enableCashierShift !== false ? "true" : "false")
          
          if (data.waTemplatePiutang) {
            setWaTemplatePiutang(data.waTemplatePiutang)
            localStorage.setItem("waTemplatePiutang", data.waTemplatePiutang)
          }
          if (data.waTemplateUmum) {
            setWaTemplateUmum(data.waTemplateUmum)
            localStorage.setItem("waTemplateUmum", data.waTemplateUmum)
          }
          if (data.waTemplateNota) {
            setWaTemplateNota(data.waTemplateNota)
            localStorage.setItem("waTemplateNota", data.waTemplateNota)
          }
          if (data.waTemplateServiceDiterima) {
            setWaTemplateServiceDiterima(data.waTemplateServiceDiterima)
            localStorage.setItem("waTemplateServiceDiterima", data.waTemplateServiceDiterima)
          }
          if (data.waTemplateServiceDikerjakan) {
            setWaTemplateServiceDikerjakan(data.waTemplateServiceDikerjakan)
            localStorage.setItem("waTemplateServiceDikerjakan", data.waTemplateServiceDikerjakan)
          }
          if (data.waTemplateServiceMenungguPart) {
            setWaTemplateServiceMenungguPart(data.waTemplateServiceMenungguPart)
            localStorage.setItem("waTemplateServiceMenungguPart", data.waTemplateServiceMenungguPart)
          }
          if (data.waTemplateServiceSelesai) {
            setWaTemplateServiceSelesai(data.waTemplateServiceSelesai)
            localStorage.setItem("waTemplateServiceSelesai", data.waTemplateServiceSelesai)
          }
          if (data.waTemplateServiceBatal) {
            setWaTemplateServiceBatal(data.waTemplateServiceBatal)
            localStorage.setItem("waTemplateServiceBatal", data.waTemplateServiceBatal)
          }
          if (data.expenseCategories) {
            setExpenseCategories(data.expenseCategories)
            localStorage.setItem("expenseCategories", JSON.stringify(data.expenseCategories))
          }
          if (data.serviceIssues) {
            setServiceIssues(data.serviceIssues)
            localStorage.setItem("serviceIssues", JSON.stringify(data.serviceIssues))
          }
        }
      })
      .catch(() => {
        // Load from local if API fails
        const localName = localStorage.getItem("storeName")
        const localLogo = localStorage.getItem("storeLogo")
        const localSignature = localStorage.getItem("storeSignature")
        const localAddress = localStorage.getItem("storeAddress")
        const localPhone = localStorage.getItem("storePhone")
        const localFooter = localStorage.getItem("storeFooter")
        const localInstagram = localStorage.getItem("storeInstagram")
        const localWaTemplate = localStorage.getItem("waTemplatePiutang")
        const localWaTemplateUmum = localStorage.getItem("waTemplateUmum")
        const localWaTemplateNota = localStorage.getItem("waTemplateNota")
        const localWaTemplateServiceDiterima = localStorage.getItem("waTemplateServiceDiterima")
        const localWaTemplateServiceDikerjakan = localStorage.getItem("waTemplateServiceDikerjakan")
        const localWaTemplateServiceMenungguPart = localStorage.getItem("waTemplateServiceMenungguPart")
        const localWaTemplateServiceSelesai = localStorage.getItem("waTemplateServiceSelesai")
        const localWaTemplateServiceBatal = localStorage.getItem("waTemplateServiceBatal")
        const localEnableShift = localStorage.getItem("enableCashierShift")
        if (localName) setStoreName(localName)
        if (localLogo) setStoreLogo(localLogo)
        if (localSignature) setStoreSignature(localSignature)
        if (localAddress) setAddress(localAddress)
        if (localPhone) setPhone(localPhone)
        if (localFooter) setStoreFooter(localFooter)
        if (localInstagram) setStoreInstagram(localInstagram)
        if (localWaTemplate) setWaTemplatePiutang(localWaTemplate)
        if (localWaTemplateUmum) setWaTemplateUmum(localWaTemplateUmum)
        if (localWaTemplateNota) setWaTemplateNota(localWaTemplateNota)
        if (localWaTemplateServiceDiterima) setWaTemplateServiceDiterima(localWaTemplateServiceDiterima)
        if (localWaTemplateServiceDikerjakan) setWaTemplateServiceDikerjakan(localWaTemplateServiceDikerjakan)
        if (localWaTemplateServiceMenungguPart) setWaTemplateServiceMenungguPart(localWaTemplateServiceMenungguPart)
        if (localWaTemplateServiceSelesai) setWaTemplateServiceSelesai(localWaTemplateServiceSelesai)
        if (localWaTemplateServiceBatal) setWaTemplateServiceBatal(localWaTemplateServiceBatal)
        setEnableCashierShift(localEnableShift !== "false")
        const localExpenseCategories = localStorage.getItem("expenseCategories")
        const localServiceIssues = localStorage.getItem("serviceIssues")
        if (localExpenseCategories) setExpenseCategories(JSON.parse(localExpenseCategories))
        if (localServiceIssues) setServiceIssues(JSON.parse(localServiceIssues))
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const handleSaveInfo = async () => {
    try {
      const combinedFooter = storeFooter + "|||IG:" + storeInstagram;
      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName,
          storeAddress: address,
          storePhone: phone,
          storeLogo,
          storeSignature,
          storeFooter: combinedFooter,
          waTemplatePiutang,
          waTemplateUmum,
          waTemplateNota,
          waTemplateServiceDiterima,
          waTemplateServiceDikerjakan,
          waTemplateServiceMenungguPart,
          waTemplateServiceSelesai,
          waTemplateServiceBatal,
          enableCashierShift,
          expenseCategories,
          serviceIssues,
          applyToAllBranches
        })
      });

      if (res.ok) {
        localStorage.setItem("storeName", storeName)
        localStorage.setItem("storeLogo", storeLogo)
        localStorage.setItem("storeSignature", storeSignature)
        localStorage.setItem("storeAddress", address)
        localStorage.setItem("storePhone", phone)
        localStorage.setItem("storeFooter", storeFooter)
        localStorage.setItem("storeInstagram", storeInstagram)
        localStorage.setItem("waTemplatePiutang", waTemplatePiutang)
        localStorage.setItem("waTemplateUmum", waTemplateUmum)
        localStorage.setItem("waTemplateNota", waTemplateNota)
        localStorage.setItem("waTemplateServiceDiterima", waTemplateServiceDiterima)
        localStorage.setItem("waTemplateServiceDikerjakan", waTemplateServiceDikerjakan)
        localStorage.setItem("waTemplateServiceMenungguPart", waTemplateServiceMenungguPart)
        localStorage.setItem("waTemplateServiceSelesai", waTemplateServiceSelesai)
        localStorage.setItem("waTemplateServiceBatal", waTemplateServiceBatal)
        localStorage.setItem("enableCashierShift", enableCashierShift ? "true" : "false")
        localStorage.setItem("expenseCategories", JSON.stringify(expenseCategories))
        localStorage.setItem("serviceIssues", JSON.stringify(serviceIssues))
        setSavedInfo(true)
        toast.success("Informasi toko berhasil disimpan ke database!")
        setTimeout(() => setSavedInfo(false), 3000)
      } else {
        const error = await res.json();
        toast.error(`Gagal menyimpan: ${error.error}`)
      }
    } catch (e) {
      toast.error("Terjadi kesalahan jaringan.")
    }
  }

  // Template list structure
  const templates = [
    {
      key: "umum" as const,
      label: "Pelanggan Umum",
      description: "Dikirim untuk sapaan atau info kasual umum.",
      value: waTemplateUmum,
      setValue: setWaTemplateUmum,
      placeholders: ["{nama}", "{toko}"],
      placeholderDesc: {
        "{nama}": "Nama Pelanggan",
        "{toko}": "Nama Toko"
      } as Record<string, string>
    },
    {
      key: "piutang" as const,
      label: "Tagihan Piutang",
      description: "Pengingat piutang yang jatuh tempo.",
      value: waTemplatePiutang,
      setValue: setWaTemplatePiutang,
      placeholders: ["{nama}", "{toko}", "{nota}", "{sisa}", "{tempo}"],
      placeholderDesc: {
        "{nama}": "Nama Pelanggan",
        "{toko}": "Nama Toko",
        "{nota}": "Nomor Nota/Invoice",
        "{sisa}": "Sisa Tagihan",
        "{tempo}": "Tanggal Jatuh Tempo"
      } as Record<string, string>
    },
    {
      key: "nota" as const,
      label: "Kirim Nota / Invoice",
      description: "Pemberian tautan nota digital pasca transaksi.",
      value: waTemplateNota,
      setValue: setWaTemplateNota,
      placeholders: ["{nama}", "{toko}", "{nota}", "{total}", "{link}"],
      placeholderDesc: {
        "{nama}": "Nama Pelanggan",
        "{toko}": "Nama Toko",
        "{nota}": "Nomor Nota/Invoice",
        "{total}": "Total Pembayaran",
        "{link}": "Tautan Nota Digital"
      } as Record<string, string>
    },
    {
      key: "servis_terima" as const,
      label: "Servis: Unit Diterima",
      description: "Notifikasi masuk antrean antrian servis toko.",
      value: waTemplateServiceDiterima,
      setValue: setWaTemplateServiceDiterima,
      placeholders: ["{nama}", "{toko}", "{unit}", "{keluhan}", "{link}"],
      placeholderDesc: {
        "{nama}": "Nama Pelanggan",
        "{toko}": "Nama Toko",
        "{unit}": "Nama Laptop/Unit",
        "{keluhan}": "Kerusakan/Keluhan Awal",
        "{link}": "Tautan Status Servis"
      } as Record<string, string>
    },
    {
      key: "servis_kerja" as const,
      label: "Servis: Sedang Dikerjakan",
      description: "Notifikasi ketika perbaikan mulai dikerjakan.",
      value: waTemplateServiceDikerjakan,
      setValue: setWaTemplateServiceDikerjakan,
      placeholders: ["{nama}", "{toko}", "{unit}", "{link}"],
      placeholderDesc: {
        "{nama}": "Nama Pelanggan",
        "{toko}": "Nama Toko",
        "{unit}": "Nama Laptop/Unit",
        "{link}": "Tautan Status Servis"
      } as Record<string, string>
    },
    {
      key: "servis_part" as const,
      label: "Servis: Menunggu Part",
      description: "Pemberitahuan tertunda karena menunggu sparepart.",
      value: waTemplateServiceMenungguPart,
      setValue: setWaTemplateServiceMenungguPart,
      placeholders: ["{nama}", "{toko}", "{unit}", "{link}"],
      placeholderDesc: {
        "{nama}": "Nama Pelanggan",
        "{toko}": "Nama Toko",
        "{unit}": "Nama Laptop/Unit",
        "{link}": "Tautan Status Servis"
      } as Record<string, string>
    },
    {
      key: "servis_selesai" as const,
      label: "Servis: Selesai",
      description: "Pengumuman unit selesai diperbaiki & siap diambil.",
      value: waTemplateServiceSelesai,
      setValue: setWaTemplateServiceSelesai,
      placeholders: ["{nama}", "{toko}", "{unit}", "{biaya}", "{link}"],
      placeholderDesc: {
        "{nama}": "Nama Pelanggan",
        "{toko}": "Nama Toko",
        "{unit}": "Nama Laptop/Unit",
        "{biaya}": "Biaya Final Servis",
        "{link}": "Tautan Detail Servis"
      } as Record<string, string>
    },
    {
      key: "servis_batal" as const,
      label: "Servis: Dibatalkan",
      description: "Notifikasi pembatalan servis dari teknisi.",
      value: waTemplateServiceBatal,
      setValue: setWaTemplateServiceBatal,
      placeholders: ["{nama}", "{toko}", "{unit}", "{link}"],
      placeholderDesc: {
        "{nama}": "Nama Pelanggan",
        "{toko}": "Nama Toko",
        "{unit}": "Nama Laptop/Unit",
        "{link}": "Tautan Status Servis"
      } as Record<string, string>
    }
  ]

  const currentTemplate = templates.find(t => t.key === selectedTemplateKey) || templates[0]

  // Insert dynamic placeholder tags at current cursor pos
  const insertPlaceholder = (placeholder: string) => {
    const textarea = document.getElementById("template-textarea") as HTMLTextAreaElement
    if (!textarea) {
      currentTemplate.setValue(currentTemplate.value + placeholder)
      return
    }
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = currentTemplate.value
    const before = text.substring(0, start)
    const after = text.substring(end, text.length)
    currentTemplate.setValue(before + placeholder + after)
    
    // Maintain selection and focus
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length)
    }, 10)
  }

  // Parse custom markdown-like codes (*bold*, _italic_, ~strike~) for preview
  const renderWhatsAppPreview = (text: string) => {
    if (!text) {
      return <span className="text-muted-foreground italic">Pesan kosong...</span>
    }

    let replaced = text
      .replace(/{nama}/g, "Budi Santoso")
      .replace(/{toko}/g, storeName || "HanLaptop")
      .replace(/{nota}/g, "TRX-20260624001")
      .replace(/{total}/g, "Rp 1.450.000")
      .replace(/{biaya}/g, "Rp 350.000")
      .replace(/{sisa}/g, "Rp 500.000")
      .replace(/{tempo}/g, "30 Juni 2026")
      .replace(/{unit}/g, "ASUS ROG Zephyrus G14")
      .replace(/{keluhan}/g, "Keyboard mati & laptop mati total")
      .replace(/{link}/g, "https://hanlaptop.com/nota/TRX-001")

    const lines = replaced.split("\n")
    return lines.map((line, idx) => {
      let html = line
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")

      // WhatsApp format replacements
      html = html.replace(/\*(.*?)\*/g, "<strong>$1</strong>")
      html = html.replace(/_(.*?)_/g, "<em>$1</em>")
      html = html.replace(/~(.*?)~/g, "<del>$1</del>")

      return (
        <div key={idx} dangerouslySetInnerHTML={{ __html: html || "&nbsp;" }} />
      )
    })
  }

  if (loading) {
    return <div className="text-center py-10 text-muted-foreground text-sm font-medium">Memuat pengaturan toko...</div>
  }

  return (
    <Card className="animate-in fade-in duration-300 shadow-md border-border/80">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg md:text-xl flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Informasi & Pengaturan Toko
        </CardTitle>
        <CardDescription>
          Kelola detail profil fisik toko, kustomisasi notifikasi pelanggan, serta daftar referensi ERP.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Horizontal Navigation Sub-Tabs */}
        <div className="flex gap-1.5 p-1 bg-muted/40 rounded-xl border border-border shadow-inner w-full md:w-fit overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setSettingsActiveSubTab("umum")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all duration-300 whitespace-nowrap shrink-0 ${
              settingsActiveSubTab === "umum"
                ? "bg-white dark:bg-card text-foreground shadow border border-border"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Building2 className="h-4 w-4" /> Info Toko & Struk
          </button>
          <button
            type="button"
            onClick={() => setSettingsActiveSubTab("wa")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all duration-300 whitespace-nowrap shrink-0 ${
              settingsActiveSubTab === "wa"
                ? "bg-white dark:bg-card text-foreground shadow border border-border"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <MessageSquare className="h-4 w-4" /> Template WhatsApp
          </button>
          <button
            type="button"
            onClick={() => setSettingsActiveSubTab("erp")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all duration-300 whitespace-nowrap shrink-0 ${
              settingsActiveSubTab === "erp"
                ? "bg-white dark:bg-card text-foreground shadow border border-border"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Sliders className="h-4 w-4" /> Kustomisasi List
          </button>
        </div>

        {/* Tab 1: Info Toko & Struk */}
        {settingsActiveSubTab === "umum" && (
          <div className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-300">
            {/* Logo and Signature Dropzones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 border rounded-2xl p-4 bg-muted/10 relative overflow-hidden">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Logo Toko (Opsional)</label>
                <div className="flex items-center gap-4 mt-1">
                  <div className="w-16 h-16 bg-muted/40 rounded-xl border border-dashed border-border/80 flex items-center justify-center overflow-hidden shrink-0">
                    {storeLogo ? (
                      <img src={storeLogo} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground/60" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input 
                      type="file" 
                      accept="image/*"
                      id="logo-upload"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onload = (e) => setStoreLogo(e.target?.result as string)
                          reader.readAsDataURL(file)
                        }
                      }} 
                    />
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => document.getElementById("logo-upload")?.click()}
                        className="text-xs font-semibold h-8"
                      >
                        Pilih File
                      </Button>
                      {storeLogo && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setStoreLogo("")} 
                          className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-semibold h-8"
                        >
                          Hapus
                        </Button>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-none">PNG, JPG, WebP. Maks 2MB.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 border rounded-2xl p-4 bg-muted/10 relative overflow-hidden">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tanda Tangan (TTD) (Opsional)</label>
                <div className="flex items-center gap-4 mt-1">
                  <div className="w-16 h-16 bg-muted/40 rounded-xl border border-dashed border-border/80 flex items-center justify-center overflow-hidden shrink-0">
                    {storeSignature ? (
                      <img src={storeSignature} alt="TTD" className="w-full h-full object-contain" />
                    ) : (
                      <PenTool className="h-6 w-6 text-muted-foreground/60" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input 
                      type="file" 
                      accept="image/*"
                      id="signature-upload"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onload = (e) => setStoreSignature(e.target?.result as string)
                          reader.readAsDataURL(file)
                        }
                      }} 
                    />
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => document.getElementById("signature-upload")?.click()}
                        className="text-xs font-semibold h-8"
                      >
                        Pilih File
                      </Button>
                      {storeSignature && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setStoreSignature("")} 
                          className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-semibold h-8"
                        >
                          Hapus
                        </Button>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-none">Gambar transparan disukai untuk struk.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* General Textfields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Nama Toko</label>
                <Input value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="Nama Toko Anda" className="rounded-xl border-border/80" />
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Nomor WA Toko</label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Nomor Telepon/WA Toko" className="rounded-xl border-border/80" />
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Instagram Toko</label>
                <Input value={storeInstagram} onChange={e => setStoreInstagram(e.target.value)} placeholder="Username IG (tanpa @)" className="rounded-xl border-border/80" />
              </div>
            </div>

            <div className="grid gap-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Alamat Lengkap Toko</label>
              <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Alamat Fisik Toko" className="rounded-xl border-border/80" />
            </div>

            {/* Cashier Shift Toggle Card */}
            <div className="flex items-center justify-between p-4 rounded-2xl border border-border/80 bg-muted/10 my-2">
              <div className="space-y-0.5 max-w-[80%] text-left">
                <label className="text-sm font-semibold text-foreground">Aktifkan Shift Kasir</label>
                <p className="text-xs text-muted-foreground">Aktifkan sistem shift harian dengan modal awal dan penghitungan kas akhir untuk kasir.</p>
              </div>
              <button
                type="button"
                onClick={() => setEnableCashierShift(!enableCashierShift)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${enableCashierShift ? "bg-primary" : "bg-muted"}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${enableCashierShift ? "translate-x-5" : "translate-x-0"}`}
                />
              </button>
            </div>

            {/* Receipt Footer Message */}
            <div className="grid gap-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Catatan Tambahan Footer Struk</label>
              <Input 
                value={storeFooter} 
                onChange={e => setStoreFooter(e.target.value)} 
                placeholder="Misal: Barang yang sudah dibeli tidak dapat ditukar. Terima kasih!" 
                className="rounded-xl border-border/80"
              />
              <p className="text-[10px] text-muted-foreground">Pesan ini akan tampil di bagian terbawah struk cetak kasir.</p>
            </div>
          </div>
        )}

        {/* Tab 2: WhatsApp Templates Editor */}
        {settingsActiveSubTab === "wa" && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[500px]">
              
              {/* Left pane: template picker */}
              <div className="md:col-span-4 flex flex-col gap-1.5 border-r pr-0 md:pr-4 border-border md:border-b-0 border-b pb-4 md:pb-0">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 mb-2">
                  Notifikasi Terkustomisasi
                </label>
                <div className="space-y-1.5">
                  {templates.map(t => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setSelectedTemplateKey(t.key)}
                      className={`w-full flex flex-col items-start text-left p-3 rounded-xl transition-all duration-200 border ${
                        selectedTemplateKey === t.key
                          ? "bg-primary/5 dark:bg-primary/10 text-primary border-primary/30 shadow-sm"
                          : "hover:bg-muted/50 text-muted-foreground hover:text-foreground border-transparent"
                      }`}
                    >
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        {t.label}
                        {selectedTemplateKey === t.key && (
                          <Check className="h-3 w-3 text-primary stroke-[3]" />
                        )}
                      </span>
                      <span className="text-[10px] text-muted-foreground/80 mt-0.5 line-clamp-1">
                        {t.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right pane: editor + live preview */}
              <div className="md:col-span-8 flex flex-col gap-5">
                
                {/* Selected Template Header */}
                <div className="space-y-1 bg-muted/20 p-3 rounded-xl border border-border/50">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    Editor: {currentTemplate.label}
                  </h4>
                  <p className="text-xs text-muted-foreground">{currentTemplate.description}</p>
                </div>

                {/* Textarea Editor */}
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Isi Notifikasi WhatsApp</label>
                    <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                      <Smartphone className="h-3 w-3" /> Live Sync
                    </span>
                  </div>
                  <textarea
                    id="template-textarea"
                    className="flex min-h-[140px] w-full rounded-xl border border-border/80 bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all font-mono leading-relaxed resize-y"
                    value={currentTemplate.value}
                    onChange={e => currentTemplate.setValue(e.target.value)}
                    placeholder="Masukkan template notifikasi. Gunakan format WA (*tebal*, _miring_, ~coret~)..."
                  />
                </div>

                {/* Variable Badges Insertion */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Klik variabel di bawah untuk menyisipkan:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentTemplate.placeholders.map(placeholder => (
                      <button
                        key={placeholder}
                        type="button"
                        onClick={() => insertPlaceholder(placeholder)}
                        title={currentTemplate.placeholderDesc[placeholder]}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-mono font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 transition-all"
                      >
                        {placeholder}
                        <span className="text-[9px] text-indigo-400/80 font-normal font-sans ml-1">({currentTemplate.placeholderDesc[placeholder]})</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Real-time WhatsApp Device Preview Mockup */}
                <div className="space-y-2 mt-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Tampilan Pratinjau (Chat WhatsApp)</span>
                  <div className="border border-border rounded-2xl overflow-hidden shadow-sm">
                    
                    {/* Device Chat Header */}
                    <div className="bg-[#075e54] dark:bg-[#1f2c34] px-4 py-2.5 flex items-center gap-3 text-white">
                      <div className="w-8 h-8 rounded-full bg-[#128c7e] dark:bg-[#25d366]/20 flex items-center justify-center font-bold text-xs shrink-0 select-none">
                        CS
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold leading-tight">Customer Care ({storeName})</span>
                        <span className="text-[9px] text-[#25d366] font-medium leading-none mt-0.5">Online</span>
                      </div>
                    </div>
                    
                    {/* WhatsApp Chat Area Background */}
                    <div className="bg-[#efeae2] dark:bg-[#0b141a] p-4 min-h-[160px] flex flex-col justify-end relative">
                      <div className="absolute inset-0 opacity-[0.05] bg-[radial-gradient(#000_1.5px,transparent_1.5px)] [background-size:20px_20px] dark:opacity-[0.08]" />
                      
                      {/* Left align placeholder just for context (Optional) */}
                      <div className="relative z-10 self-end max-w-[85%] bg-[#d9fdd3] dark:bg-[#005c4b] text-slate-800 dark:text-slate-100 rounded-xl rounded-tr-none px-3.5 py-2 text-xs shadow-sm text-left">
                        {/* Chat bubble tail */}
                        <div className="absolute right-0 top-0 w-2 h-2 bg-[#d9fdd3] dark:bg-[#005c4b] [clip-path:polygon(0_0,100%_0,100%_100%)] translate-x-[2px]" />
                        
                        <div className="space-y-1 font-sans break-words whitespace-pre-wrap leading-relaxed">
                          {renderWhatsAppPreview(currentTemplate.value)}
                        </div>
                        
                        {/* Timestamp & check ticks */}
                        <div className="flex items-center justify-end gap-0.5 text-[8px] text-muted-foreground/80 mt-1 float-right font-mono">
                          <span>12:00</span>
                          <span className="text-sky-500 font-bold ml-1">✓✓</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* Tab 3: List ERP customization */}
        {settingsActiveSubTab === "erp" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
            
            {/* Section 1: Expense categories */}
            <div className="space-y-3 border border-border/80 rounded-2xl p-4 bg-muted/10">
              <div className="space-y-0.5">
                <h4 className="text-sm font-semibold text-foreground">Kategori Biaya Operasional / Pengeluaran</h4>
                <p className="text-xs text-muted-foreground">Kategori pengeluaran kas yang dapat dipilih pada saat pencatatan biaya toko harian.</p>
              </div>

              <div className="flex gap-2 pt-1">
                <Input 
                  value={newCategory} 
                  onChange={e => setNewCategory(e.target.value)} 
                  placeholder="Masukkan nama kategori baru, contoh: Listrik & Air" 
                  className="text-xs rounded-xl border-border/80"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (!newCategory.trim()) return
                      if (expenseCategories.includes(newCategory.trim())) {
                        toast.error("Kategori sudah ada")
                        return
                      }
                      setExpenseCategories([...expenseCategories, newCategory.trim()])
                      setNewCategory("")
                    }
                  }}
                />
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={() => {
                    if (!newCategory.trim()) return
                    if (expenseCategories.includes(newCategory.trim())) {
                      toast.error("Kategori sudah ada")
                      return
                    }
                    setExpenseCategories([...expenseCategories, newCategory.trim()])
                    setNewCategory("")
                  }}
                  className="rounded-xl shrink-0"
                >
                  <Plus className="h-4 w-4 mr-1" /> Tambah
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-1.5 p-3 rounded-xl border border-border/80 bg-background max-h-[180px] overflow-y-auto mt-2">
                {expenseCategories.length === 0 ? (
                  <span className="text-xs text-muted-foreground py-1">Belum ada kategori pengeluaran kustom.</span>
                ) : (
                  expenseCategories.map((cat, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted text-xs font-semibold text-slate-700 dark:text-slate-200 border">
                      <span>{cat}</span>
                      <button 
                        type="button" 
                        onClick={() => setExpenseCategories(expenseCategories.filter(c => c !== cat))}
                        className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded p-0.5 transition-colors font-bold ml-1"
                        title="Hapus"
                      >
                        &times;
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Section 2: Service issues lists */}
            <div className="space-y-3 border border-border/80 rounded-2xl p-4 bg-muted/10">
              <div className="space-y-0.5">
                <h4 className="text-sm font-semibold text-foreground">Daftar Kerusakan & Estimasi Biaya Servis Laptop</h4>
                <p className="text-xs text-muted-foreground">List rekomendasi keluhan servis bawaan dan estimasi biaya perbaikannya.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <Input 
                  value={newIssue} 
                  onChange={e => setNewIssue(e.target.value)} 
                  placeholder="Keluhan servis (contoh: Ganti Keyboard)" 
                  className="sm:col-span-2 text-xs rounded-xl border-border/80"
                />
                <Input 
                  type="number" 
                  value={newIssueCost} 
                  onChange={e => setNewIssueCost(e.target.value)} 
                  placeholder="Estimasi biaya (Rp)" 
                  className="text-xs rounded-xl border-border/80"
                />
              </div>

              <div className="flex justify-end">
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={() => {
                    if (!newIssue.trim() || !newIssueCost.trim()) {
                      toast.error("Nama keluhan dan biaya wajib diisi")
                      return
                    }
                    const costNum = Number(newIssueCost)
                    if (isNaN(costNum) || costNum < 0) {
                      toast.error("Biaya harus angka valid")
                      return
                    }
                    if (serviceIssues.some(si => si.issue.toLowerCase() === newIssue.trim().toLowerCase())) {
                      toast.error("Keluhan sudah ada")
                      return
                    }
                    setServiceIssues([...serviceIssues, { issue: newIssue.trim(), cost: costNum }])
                    setNewIssue("")
                    setNewIssueCost("")
                  }}
                  className="rounded-xl text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Keluhan
                </Button>
              </div>

              <div className="border border-border/80 rounded-xl overflow-hidden max-h-[250px] overflow-y-auto mt-2 bg-background">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-muted/50 font-bold border-b">
                    <tr>
                      <th className="p-2.5">Keluhan/Kategori Kerusakan</th>
                      <th className="p-2.5 text-right">Estimasi Biaya Standar</th>
                      <th className="p-2.5 text-center w-[70px]">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceIssues.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-4 text-center text-muted-foreground">Belum ada keluhan servis kustom.</td>
                      </tr>
                    ) : (
                      serviceIssues.map((si, idx) => (
                        <tr key={idx} className="hover:bg-muted/30 border-b last:border-0 transition-colors">
                          <td className="p-2.5 font-medium">{si.issue}</td>
                          <td className="p-2.5 text-right font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                            {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(si.cost)}
                          </td>
                          <td className="p-2.5 text-center">
                            <button 
                              type="button" 
                              onClick={() => setServiceIssues(serviceIssues.filter((_, i) => i !== idx))}
                              className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 p-1 rounded transition-colors"
                              title="Hapus"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </CardContent>

      {/* Global Card Footer with Save button */}
      <CardFooter className="border-t px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 rounded-b-md">
        {isOwner && (
          <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={applyToAllBranches}
              onChange={(e) => setApplyToAllBranches(e.target.checked)}
              className="rounded border-input text-primary focus:ring-primary h-4 w-4"
            />
            <span>Terapkan semua pengaturan ini ke semua cabang</span>
          </label>
        )}
        <Button className="gap-2 rounded-xl px-5 font-bold shadow-sm sm:ml-auto" onClick={handleSaveInfo}>
          {savedInfo ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />} 
          {savedInfo ? "Tersimpan!" : "Simpan Perubahan"}
        </Button>
      </CardFooter>
    </Card>
  )
}

export default StoreSettingsTab
