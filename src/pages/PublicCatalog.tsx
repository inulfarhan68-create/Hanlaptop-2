import { useEffect, useState } from "react"
import { useParams, useSearchParams, useNavigate } from "react-router-dom"
import { Store, MapPin, Phone, Package, Search, MessageCircle, X, Cpu, HardDrive, Monitor, MemoryStick, Keyboard, Gamepad2, FileText, ShieldAlert, Share2, Copy, Check, ChevronDown, Laptop, Award, Info, Layers } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
)

function parseItemSpecs(specs: string) {
  const result: { 
    processor?: string; 
    vga?: string; 
    ram?: string; 
    storage?: string; 
    screen?: string; 
    keyboard?: string; 
    os?: string; 
    condition?: string; 
    defect?: string; 
  } = {}
  
  if (!specs) return result
  const parts = specs.split(" | ")
  parts.forEach(part => {
    if (part.startsWith("Processor: ")) result.processor = part.replace("Processor: ", "")
    else if (part.startsWith("VGA: ")) result.vga = part.replace("VGA: ", "")
    else if (part.startsWith("RAM: ")) result.ram = part.replace("RAM: ", "")
    else if (part.startsWith("Storage: ")) result.storage = part.replace("Storage: ", "")
    else if (part.startsWith("Layar: ")) result.screen = part.replace("Layar: ", "")
    else if (part.startsWith("Keyboard: ")) result.keyboard = part.replace("Keyboard: ", "")
    else if (part.startsWith("OS: ")) result.os = part.replace("OS: ", "")
    else if (part.startsWith("Kondisi: ")) {
      const condStr = part.replace("Kondisi: ", "")
      if (condStr.startsWith("Minus (") && condStr.endsWith(")")) {
        result.condition = "Minus"
        result.defect = condStr.substring(7, condStr.length - 1)
      } else {
        result.condition = condStr
      }
    }
  })
  return result
}

function conditionLabel(c: string) {
  if (c === "NEW") return { text: "Baru / New", color: "bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-extrabold" }
  if (c === "USED_A") return { text: "Grade A+", color: "bg-amber-50 dark:bg-amber-950/20 border border-amber-250 dark:border-amber-900/30 text-amber-600 dark:text-amber-500 font-extrabold" }
  if (c === "USED_B") return { text: "Grade B", color: "bg-blue-50 dark:bg-blue-950/20 border border-blue-250 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 font-extrabold" }
  if (c === "USED_C") return { text: "Grade C", color: "bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-extrabold" }
  return { text: "Lainnya", color: "bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-extrabold" }
}

export interface LaptopClassification {
  id: "student_office" | "creative_dev" | "gaming_heavy";
  name: string;
  color: string;
}

export function classifyLaptop(itemName: string, specsStr: string, price: number): LaptopClassification[] {
  const specs = parseItemSpecs(specsStr || "");
  const nameLower = itemName.toLowerCase();
  const procLower = (specs.processor || "").toLowerCase();
  const vgaLower = (specs.vga || "").toLowerCase();
  
  // Clean RAM value to number
  const ramStr = (specs.ram || "").toLowerCase();
  const ramGb = parseInt(ramStr.replace(/[^0-9]/g, "")) || 0;
  
  const classifications: LaptopClassification[] = [];
  
  // 1. Gaming & Rendering Berat
  const hasDedicatedGpu = vgaLower.includes("rtx") || 
                           vgaLower.includes("gtx") || 
                           vgaLower.includes("radeon rx") || 
                           vgaLower.includes("geforce") ||
                           vgaLower.includes("quadro") ||
                           vgaLower.includes("discrete") ||
                           nameLower.includes("rog") || 
                           nameLower.includes("tuf") || 
                           nameLower.includes("legion") || 
                           nameLower.includes("nitro") || 
                           nameLower.includes("predator") ||
                           nameLower.includes("alienware") ||
                           nameLower.includes("gaming");
  
  const isHighPerformanceCpu = procLower.includes("i7") || 
                               procLower.includes("i9") || 
                               procLower.includes("ryzen 7") || 
                               procLower.includes("ryzen 9");
  
  if (hasDedicatedGpu || (isHighPerformanceCpu && ramGb >= 16)) {
    classifications.push({
      id: "gaming_heavy",
      name: "Gaming & Render",
      color: "bg-slate-900 text-slate-100 border-slate-950 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-850"
    });
  }
  
  // 2. Desain, Editing & Coding
  const isCapableCpu = procLower.includes("i5") || 
                        procLower.includes("i7") || 
                        procLower.includes("i9") || 
                        procLower.includes("ryzen 5") || 
                        procLower.includes("ryzen 7") || 
                        procLower.includes("ryzen 9") || 
                        procLower.includes("m1") || 
                        procLower.includes("m2") || 
                        procLower.includes("m3") || 
                        procLower.includes("m4");
  
  const isAppleMac = nameLower.includes("macbook") || procLower.includes("apple");
  
  if ((isCapableCpu && ramGb >= 8) || isAppleMac || price >= 6000000) {
    classifications.push({
      id: "creative_dev",
      name: "Desain & Coding",
      color: "bg-slate-900 text-slate-100 border-slate-950 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-850"
    });
  }
  
  // 3. Pelajar & Kerja Harian
  const isBasicCpu = procLower.includes("celeron") || 
                     procLower.includes("pentium") || 
                     procLower.includes("athlon") || 
                     procLower.includes("i3") || 
                     procLower.includes("ryzen 3") ||
                     procLower.includes("core 2") ||
                     procLower.includes("dual core");
  
  if (isBasicCpu || price < 7000000 || ramGb <= 8 || (!hasDedicatedGpu && price < 9000000)) {
    classifications.push({
      id: "student_office",
      name: "Student & Office",
      color: "bg-slate-900 text-slate-100 border-slate-950 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-850"
    });
  }
  
  // Default fallback if no classification matches
  if (classifications.length === 0) {
    classifications.push({
      id: "student_office",
      name: "Student & Office",
      color: "bg-slate-900 text-slate-100 border-slate-950 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-850"
    });
  }
  
  return classifications;
}

export function PublicCatalog() {
  const { slug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(() => {
    return searchParams.get("q") || searchParams.get("search") || ""
  })
  const [lightboxItem, setLightboxItem] = useState<any>(null)
  const [selectedCategory, setSelectedCategory] = useState("Semua")
  const [selectedRecommendation, setSelectedRecommendation] = useState<string>("all")
  const [sortBy, setSortBy] = useState("newest")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isBranchMenuOpen, setIsBranchMenuOpen] = useState(false)
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false)

  useEffect(() => {
    const q = searchParams.get("q") || searchParams.get("search") || ""
    setSearch(q)
  }, [searchParams])

  useEffect(() => {
    fetchCatalog()
  }, [slug])

  // Open lightbox automatically if "item" parameter exists in URL search params
  useEffect(() => {
    if (data && data.items) {
      const itemId = searchParams.get("item")
      if (itemId) {
        const found = data.items.find((item: any) => item.id === itemId)
        if (found) {
          setLightboxItem(found)
        }
      } else {
        setLightboxItem(null)
      }
    }
  }, [searchParams, data])

  const fetchCatalog = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/public/catalog/${slug}?t=${Date.now()}`, {
        cache: 'no-store'
      })
      if (!res.ok) {
        throw new Error("Toko tidak ditemukan atau tidak aktif")
      }
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenLightbox = (item: any) => {
    setLightboxItem(item)
    setSearchParams({ item: item.id })
  }

  const handleCloseLightbox = () => {
    setLightboxItem(null)
    setSearchParams({})
  }

  const handleCopyLink = (itemId: string) => {
    const link = `${window.location.origin}${window.location.pathname}?item=${itemId}`
    navigator.clipboard.writeText(link)
    setCopiedId(itemId)
    toast.success("Tautan produk berhasil disalin!")
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getDynamicWaLink = (item: any) => {
    if (!item) return ""
    const storePhone = data?.store?.phone || ""
    const waNumber = storePhone.replace(/[^0-9]/g, '').replace(/^0/, '62')
    if (!waNumber) return item.waLink || ""
    
    const productLink = `${window.location.origin}${window.location.pathname}?item=${item.id}`
    const sn = item.barcode || '-'
    const message = `Halo ${data?.store?.name || "Han Laptop"}, saya tertarik dengan unit *${item.itemName}* (SN: ${sn}) seharga *Rp ${item.sellingPrice.toLocaleString("id-ID")}* yang saya lihat di Katalog Online:\n\n${productLink}\n\nApakah unit ini masih tersedia?`
    return `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-950 flex flex-col items-center p-6 space-y-8 animate-pulse">
        <Skeleton className="h-40 w-full max-w-5xl rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-80 rounded-3xl" />)}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950">
        <div className="text-center space-y-4 max-w-sm p-8 bg-white dark:bg-card rounded-3xl border shadow-lg border-border/80">
          <Package className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-650" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">Katalog Tidak Ditemukan</h1>
          <p className="text-slate-500 text-sm">Silakan periksa kembali tautan yang Anda buka atau hubungi pemilik toko.</p>
        </div>
      </div>
    )
  }

  // Get unique categories for pills filter
  const categories = ["Semua", ...Array.from(new Set(data.items.map((item: any) => item.category))) as string[]]

  // Filter & Sort Logic
  const filteredItems = data.items
    .filter((item: any) => {
      const matchesSearch = item.itemName.toLowerCase().includes(search.toLowerCase()) || 
                            item.category.toLowerCase().includes(search.toLowerCase()) ||
                            (item.barcode && item.barcode.toLowerCase().includes(search.toLowerCase()))
      
      const matchesCategory = selectedCategory === "Semua" || item.category === selectedCategory
      
      let matchesRecommendation = true
      if (selectedRecommendation !== "all") {
        if (item.category === "Laptop Bekas") {
          const specs = classifyLaptop(item.itemName, item.specs || "", item.sellingPrice)
          matchesRecommendation = specs.some(c => c.id === selectedRecommendation)
        } else {
          matchesRecommendation = false
        }
      }
      
      return matchesSearch && matchesCategory && matchesRecommendation
    })
    .sort((a: any, b: any) => {
      if (sortBy === "cheapest") return a.sellingPrice - b.sellingPrice
      if (sortBy === "most-expensive") return b.sellingPrice - a.sellingPrice
      return 0 
    })

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16 transition-colors duration-300">
      {/* ======= HEADER ======= */}
      <header className="relative bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800/80 z-20 transition-colors duration-300">
        <div className="relative max-w-6xl mx-auto px-4 py-4 sm:py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Left section: Logo & Store Info */}
            <div className="flex items-center gap-3.5 min-w-0">
              {data.store.logo ? (
                <div className="h-14 w-14 bg-slate-50 dark:bg-slate-950 rounded-2xl flex items-center justify-center p-1.5 border border-slate-100 dark:border-slate-850 shrink-0 overflow-hidden">
                  <img 
                    src={data.store.logo} 
                    alt={data.store.name} 
                    className="max-h-full max-w-full object-contain filter drop-shadow-xs" 
                  />
                </div>
              ) : (
                <div className="h-14 w-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center shrink-0">
                  <Store className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                </div>
              )}
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate">{data.store.name}</h1>
                  <span className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-555 dark:text-slate-400 text-[9px] font-bold px-2 py-0.5 rounded-md shrink-0">
                    Katalog
                  </span>
                </div>
                
                {/* Minimal details: Address, Phone, Instagram */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  {data.store.address && (
                    <div className="flex items-center gap-1 min-w-0 max-w-[220px]">
                      <MapPin className="h-3 w-3 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span className="truncate" title={data.store.address}>{data.store.address}</span>
                    </div>
                  )}
                  {data.store.phone && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Phone className="h-3 w-3 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span className="font-medium">{data.store.phone}</span>
                    </div>
                  )}
                  <a 
                    href={`https://instagram.com/${data.store.slug || "hanlaptop"}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-1 hover:text-pink-500 transition-colors shrink-0"
                  >
                    <InstagramIcon className="h-3 w-3 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>@{data.store.slug || "hanlaptop"}</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Right section: Branch selector & Search */}
            <div className="flex flex-row items-center gap-2.5 w-full md:w-auto shrink-0 z-30">
              {/* Branch Selector Dropdown */}
              {data.branches && data.branches.length > 1 && (
                <div className="relative shrink-0">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-850 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl h-10 px-3 flex items-center gap-1.5 text-xs font-bold shadow-xs transition-all active:scale-95"
                    onClick={() => setIsBranchMenuOpen(!isBranchMenuOpen)}
                  >
                    <Store className="h-3.5 w-3.5 text-slate-400" /> <span className="hidden sm:inline">Cabang:</span> <span className="text-slate-900 dark:text-white font-bold">{data.store.name}</span> <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${isBranchMenuOpen ? 'rotate-180' : ''}`} />
                  </Button>
                  {isBranchMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsBranchMenuOpen(false)} />
                      <div className="absolute right-0 mt-1.5 w-60 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                        <div className="px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-900">Daftar Cabang</div>
                        <div className="max-h-52 overflow-y-auto py-1">
                          {data.branches.map((b: any) => {
                            const isCurrent = b.slug === data.store.slug
                            return (
                              <button
                                key={b.slug}
                                disabled={isCurrent}
                                className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs font-bold transition-colors cursor-pointer ${
                                  isCurrent 
                                    ? "bg-slate-50 dark:bg-slate-900/60 text-slate-850 dark:text-white cursor-default" 
                                    : "text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-805"
                                }`}
                                onClick={() => {
                                  navigate(`/catalog/${b.slug}`)
                                  setIsBranchMenuOpen(false)
                                }}
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <Store className={`h-3.5 w-3.5 ${isCurrent ? 'text-slate-800' : 'text-slate-400'}`} />
                                  <span className="truncate">{b.name}</span>
                                </div>
                                {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-slate-900 dark:bg-white" />}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Search Input */}
              <div className="relative group flex-1 md:w-60">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-450 group-focus-within:text-slate-700 transition-colors" />
                <Input 
                  type="search" 
                  placeholder="Cari laptop..." 
                  className="pl-9 pr-3 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-805 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl h-10 focus:bg-white dark:focus:bg-slate-900 focus:border-slate-350 dark:focus:border-slate-700 focus:ring-0 transition-all text-xs w-full"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
            
          </div>
        </div>
      </header>

      {/* ======= CONTENT CONTAINER ======= */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
            Produk Tersedia 
            <Badge variant="secondary" className="rounded-full bg-slate-105 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 px-3 py-1 font-bold text-xs border border-slate-200 dark:border-slate-750">
              {filteredItems.length}
            </Badge>
          </h2>

          {/* Custom Sort Dropdown */}
          <div className="relative self-start md:self-auto">
            <button
              onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
              className="text-xs font-extrabold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 shadow-sm text-slate-700 dark:text-slate-200 hover:border-slate-350 dark:hover:border-slate-700 transition-all flex items-center gap-2 cursor-pointer active:scale-95 duration-200"
            >
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Urutkan:</span>
              <span>
                {sortBy === "newest" && "Terbaru"}
                {sortBy === "cheapest" && "Harga Termurah"}
                {sortBy === "most-expensive" && "Harga Termahal"}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-200 ${isSortMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isSortMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsSortMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">Pilih Pengurutan</div>
                  {[
                    { val: "newest", label: "Terbaru" },
                    { val: "cheapest", label: "Harga Termurah" },
                    { val: "most-expensive", label: "Harga Termahal" },
                  ].map((opt) => {
                    const isSelected = sortBy === opt.val
                    return (
                      <button
                        key={opt.val}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? "bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white"
                            : "text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        }`}
                        onClick={() => {
                          setSortBy(opt.val)
                          setIsSortMenuOpen(false)
                        }}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-slate-900 dark:bg-white" />}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Category Pills horizontal scroll with count badges */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none border-b border-slate-200 dark:border-slate-800/50">
          {categories.map((cat: string) => {
            const isSelected = selectedCategory === cat
            const count = cat === "Semua" ? data.items.length : data.items.filter((item: any) => item.category === cat).length
            return (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat)
                  setSelectedRecommendation("all")
                }}
                className={`shrink-0 text-xs font-bold px-4 py-2.5 rounded-2xl transition-all border duration-300 cursor-pointer flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] ${
                  isSelected
                    ? "bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-slate-900 shadow-xs"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold transition-colors ${
                  isSelected 
                    ? "bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900" 
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Quick Filter Kebutuhan (Only show for Laptops / Semua) */}
        {(selectedCategory === "Semua" || selectedCategory === "Laptop Bekas") && (
          <div className="mb-6 p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl">
            <div className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Laptop className="h-3.5 w-3.5" />
              <span>Rekomendasi Berdasarkan Kebutuhan</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              {[
                { 
                  id: "all", 
                  name: "Semua Spek & Tipe", 
                  desc: "Tampilkan semua unit tanpa filter kebutuhan khusus.",
                  icon: Laptop, 
                  colorClass: "hover:border-slate-350 dark:hover:border-slate-700",
                  activeClass: "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs" 
                },
                { 
                  id: "student_office", 
                  name: "Student & Office", 
                  desc: "Untuk tugas, dokumen (Office), zoom, & browsing harian.",
                  icon: FileText, 
                  colorClass: "hover:border-emerald-350 dark:hover:border-emerald-800/60",
                  activeClass: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-650 dark:text-emerald-405 shadow-xs"
                },
                { 
                  id: "creative_dev", 
                  name: "Desain, Editing & Coding", 
                  desc: "Untuk grafis, pemrograman, kompilasi kode, & edit video.",
                  icon: Layers, 
                  colorClass: "hover:border-purple-350 dark:hover:border-purple-800/60",
                  activeClass: "bg-purple-50 dark:bg-purple-950/20 border-purple-300 dark:border-purple-800 text-purple-650 dark:text-purple-405 shadow-xs"
                },
                { 
                  id: "gaming_heavy", 
                  name: "Gaming & Render Berat", 
                  desc: "Untuk game 3D berat, rendering, & 3D modeling (AutoCAD).",
                  icon: Gamepad2, 
                  colorClass: "hover:border-rose-350 dark:hover:border-rose-800/60",
                  activeClass: "bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-850 text-rose-650 dark:text-rose-455 shadow-xs"
                }
              ].map((rec) => {
                const isSelected = selectedRecommendation === rec.id;
                const IconComponent = rec.icon;
                return (
                  <button
                    key={rec.id}
                    onClick={() => setSelectedRecommendation(rec.id)}
                    className={`flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all duration-300 cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
                      isSelected 
                        ? rec.activeClass 
                        : "bg-slate-50/50 dark:bg-slate-950/20 border-slate-100 dark:border-slate-850 text-slate-700 dark:text-slate-300 " + rec.colorClass
                    }`}
                  >
                    <div className="flex items-center gap-2 font-extrabold text-xs">
                      <IconComponent className={`h-3.5 w-3.5 shrink-0 ${isSelected ? '' : 'text-slate-400'}`} />
                      <span>{rec.name}</span>
                    </div>
                    <p className={`text-[10px] mt-1.5 leading-relaxed ${isSelected ? 'opacity-90' : 'text-slate-500 dark:text-slate-400'}`}>
                      {rec.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {filteredItems.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-slate-900/80 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-xs">
            <Search className="h-12 w-12 mx-auto text-slate-350 dark:text-slate-700 mb-4" />
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Tidak ada produk</h3>
            <p className="text-slate-500 text-sm mt-1">Coba gunakan kata kunci pencarian yang lain.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item: any) => {
              const specs = parseItemSpecs(item.specs || "")
              const cond = conditionLabel(item.condition)
              return (
                <Card 
                  key={item.id} 
                  className="overflow-hidden group hover:-translate-y-1.5 transition-all duration-300 border border-slate-200/80 dark:border-slate-800/80 hover:border-slate-400 dark:hover:border-slate-700 rounded-3xl bg-white dark:bg-slate-900 shadow-xs hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    {/* Image section */}
                    <div 
                      className="relative bg-slate-50/50 dark:bg-slate-950/20 cursor-pointer overflow-hidden flex items-center justify-center border-b border-slate-100/60 dark:border-slate-800/40 aspect-[4/3] group/img"
                      onClick={() => handleOpenLightbox(item)}
                    >
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.itemName} 
                          className="w-[85%] h-[85%] object-contain group-hover:scale-[1.03] transition-transform duration-500 p-2" 
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-750">
                          <Package className="h-16 w-16 stroke-[1.2]" />
                        </div>
                      )}
                      
                      {/* Condition badge */}
                      <div className="absolute top-4 left-4 z-10">
                        <span className={`inline-flex items-center text-[10px] font-extrabold px-3 py-1 rounded-xl shadow-xs ${cond.color}`}>
                          {cond.text}
                        </span>
                      </div>

                      {/* Hover action hint */}
                      {item.imageUrl && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-slate-950/10 transition-colors duration-300 flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 text-slate-900 bg-white/90 dark:text-white dark:bg-slate-950/90 backdrop-blur-md px-4 py-2.5 rounded-2xl text-[11px] font-bold shadow-sm border border-slate-200/50 dark:border-white/10">
                            Lihat Detail Foto & Spek
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card Content Info */}
                    <CardContent className="p-5 space-y-4">
                      <div>
                        {/* Category & Recommendation Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest mr-1">
                            {item.category}
                          </span>
                          {item.category === "Laptop Bekas" && classifyLaptop(item.itemName, item.specs || "", item.sellingPrice).map((rec) => (
                            <span 
                              key={rec.id} 
                              className={`inline-flex items-center text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border ${rec.color}`}
                            >
                              {rec.name}
                            </span>
                          ))}
                        </div>
                        
                        {/* Product name */}
                        <h3 className="font-extrabold text-slate-900 dark:text-slate-100 leading-snug text-base tracking-tight break-words group-hover:text-slate-650 dark:group-hover:text-slate-305 transition-colors duration-300">
                          {item.itemName}
                        </h3>
                        
                        {/* Serial number */}
                        {item.barcode && (
                          <div className="text-[10px] text-slate-500 font-mono mt-1.5 bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200/40 dark:border-slate-800/40 inline-block">SN: {item.barcode}</div>
                        )}
                      </div>

                      {/* Structured Specs Display (Clean Monochrome Slate Icons) */}
                      {item.specs && (() => {
                        const hasParsedSpecs = !!(specs.processor || specs.ram || specs.storage || specs.screen || specs.vga || specs.keyboard || specs.os || specs.condition);
                        return (
                          <div className="bg-slate-50/50 dark:bg-slate-950/20 p-3.5 rounded-2xl border border-slate-100/60 dark:border-slate-800/30 text-xs space-y-2.5 shadow-inner">
                            {hasParsedSpecs ? (
                              <div className="grid grid-cols-1 gap-2">
                                {specs.processor && (
                                  <div className="flex items-start gap-2">
                                    <Cpu className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                                    <span className="font-semibold text-slate-700 dark:text-slate-300 break-words leading-relaxed text-[11px]">{specs.processor}</span>
                                  </div>
                                )}
                                {specs.ram && (
                                  <div className="flex items-center gap-2">
                                    <MemoryStick className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                                    <span className="text-[11px] text-slate-600 dark:text-slate-400">RAM: <span className="font-bold text-slate-800 dark:text-slate-200">{specs.ram}</span></span>
                                  </div>
                                )}
                                {specs.storage && (
                                  <div className="flex items-center gap-2">
                                    <HardDrive className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                                    <span className="text-[11px] text-slate-600 dark:text-slate-400">Penyimpanan: <span className="font-bold text-slate-800 dark:text-slate-200">{specs.storage}</span></span>
                                  </div>
                                )}
                                {specs.vga && (
                                  <div className="flex items-start gap-2">
                                    <Layers className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                                    <span className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed truncate" title={specs.vga}>Grafis: <span className="font-semibold text-slate-800 dark:text-slate-200">{specs.vga}</span></span>
                                  </div>
                                )}
                                {specs.screen && (
                                  <div className="flex items-start gap-2">
                                    <Monitor className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                                    <span className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed truncate" title={specs.screen}>Layar: <span className="font-semibold text-slate-800 dark:text-slate-200">{specs.screen}</span></span>
                                  </div>
                                )}
                                {specs.condition && (
                                  <div className="flex items-center gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/40">
                                    <Info className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                                    <span className="text-[11px] text-slate-600 dark:text-slate-400">Fisik: <span className="font-bold text-slate-800 dark:text-slate-200">{specs.condition}</span>{specs.defect ? ` (${specs.defect})` : ""}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-slate-600 dark:text-slate-400 leading-relaxed break-words text-[11px] line-clamp-4">{item.specs}</p>
                            )}
                          </div>
                        );
                      })()}
                    </CardContent>
                  </div>

                  {/* Price & CTA Section */}
                  <div className="p-5 pt-0 border-t border-slate-100 dark:border-slate-800/40 mt-auto space-y-3">
                    <div className="pt-3.5 flex items-center justify-between">
                      <div>
                        <div className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest">Harga</div>
                        <div className="font-black text-slate-900 dark:text-white text-2xl tracking-tight mt-0.5 whitespace-nowrap">
                          Rp {item.sellingPrice.toLocaleString("id-ID")}
                        </div>
                      </div>
                    </div>

                    {item.waLink && (
                      <a href={getDynamicWaLink(item)} target="_blank" rel="noopener noreferrer" className="block">
                        <Button className="w-full gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-2xl transition-all duration-200 h-11 font-black text-sm active:scale-[0.98] cursor-pointer shadow-xs">
                          <MessageCircle className="h-4.5 w-4.5" />
                          Tanya via WhatsApp
                        </Button>
                      </a>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      {/* ======= FOOTER ======= */}
      <footer className="border-t border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-900 backdrop-blur-xs mt-20">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-3">
            {data.store.logo ? (
              <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center p-0.5 border border-slate-100 opacity-80 overflow-hidden shrink-0">
                <img src={data.store.logo} alt="" className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <Store className="h-5 w-5 text-slate-400" />
            )}
            <span className="font-bold text-slate-600 dark:text-slate-300">{data.store.name}</span>
          </div>
          <div className="text-xs text-slate-400">
            © {new Date().getFullYear()} {data.store.name}. Katalog Online Laptop Bekas Berkualitas.
          </div>
        </div>
      </footer>

      {/* ======= PREMIUM DETAIL MODAL / LIGHTBOX ======= */}
      {lightboxItem && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={handleCloseLightbox}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row relative overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              className="absolute top-4 right-4 p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors z-20 shadow-xs border border-slate-200/40 dark:border-slate-750 cursor-pointer"
              onClick={handleCloseLightbox}
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Left/Top Side: Large image container */}
            <div className="w-full md:w-1/2 bg-slate-50 dark:bg-slate-950 p-8 flex items-center justify-center relative min-h-[320px] md:min-h-[480px] border-r border-slate-100 dark:border-slate-800/60">
              {lightboxItem.imageUrl ? (
                <img 
                  src={lightboxItem.imageUrl} 
                  alt={lightboxItem.itemName} 
                  className="max-w-full max-h-[400px] object-contain rounded-3xl hover:scale-[1.01] transition-transform duration-500"
                />
              ) : (
                <Package className="h-20 w-20 text-slate-300 dark:text-slate-750 stroke-[1.2]" />
              )}
            </div>

            {/* Right/Bottom Side: Product details */}
            <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest">{lightboxItem.category}</span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className={`inline-flex items-center text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${conditionLabel(lightboxItem.condition).color}`}>
                    {conditionLabel(lightboxItem.condition).text}
                  </span>
                  {lightboxItem.category === "Laptop Bekas" && (
                    <>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      {classifyLaptop(lightboxItem.itemName, lightboxItem.specs || "", lightboxItem.sellingPrice).map((rec) => (
                        <span 
                          key={rec.id} 
                          className={`inline-flex items-center text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border ${rec.color}`}
                        >
                          {rec.name}
                        </span>
                      ))}
                    </>
                  )}
                </div>

                <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight tracking-tight break-words">
                  {lightboxItem.itemName}
                </h3>

                {lightboxItem.barcode && (
                  <div className="text-xs text-slate-500 font-mono bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200/40 dark:border-slate-800/40 inline-block">
                    Nomor Serial (SN): <span className="font-bold text-slate-700 dark:text-slate-350">{lightboxItem.barcode}</span>
                  </div>
                )}

                {/* Detailed Specifications Section */}
                {lightboxItem.specs && (() => {
                  const sp = parseItemSpecs(lightboxItem.specs)
                  const hasParsedSpecs = !!(sp.processor || sp.ram || sp.storage || sp.screen || sp.vga || sp.keyboard || sp.os || sp.condition);
                  return (
                    <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Spesifikasi Lengkap:</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-inner">
                        {hasParsedSpecs ? (
                          <>
                            {sp.processor && (
                              <div className="flex items-start gap-2.5 text-sm p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 hover:border-slate-400 transition-colors">
                                <Cpu className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                                <div>
                                  <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Processor</div>
                                  <div className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5">{sp.processor}</div>
                                </div>
                              </div>
                            )}
                            {sp.vga && (
                              <div className="flex items-start gap-2.5 text-sm p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 hover:border-slate-400 transition-all">
                                <Layers className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                                <div>
                                  <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">VGA / Grafis</div>
                                  <div className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5">{sp.vga}</div>
                                </div>
                              </div>
                            )}
                            {sp.ram && (
                              <div className="flex items-start gap-2.5 text-sm p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 hover:border-slate-400 transition-all">
                                <MemoryStick className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                                <div>
                                  <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">RAM</div>
                                  <div className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5">{sp.ram}</div>
                                </div>
                              </div>
                            )}
                            {sp.storage && (
                              <div className="flex items-start gap-2.5 text-sm p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 hover:border-slate-400 transition-all">
                                <HardDrive className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                                <div>
                                  <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Penyimpanan</div>
                                  <div className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5">{sp.storage}</div>
                                </div>
                              </div>
                            )}
                            {sp.screen && (
                              <div className="flex items-start gap-2.5 text-sm p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 hover:border-slate-400 transition-all">
                                <Monitor className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                                <div>
                                  <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Layar / Display</div>
                                  <div className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5">{sp.screen}</div>
                                </div>
                              </div>
                            )}
                            {sp.os && (
                              <div className="flex items-start gap-2.5 text-sm p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 hover:border-slate-400 transition-all">
                                <FileText className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                                <div>
                                  <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Sistem Operasi</div>
                                  <div className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5">{sp.os}</div>
                                </div>
                              </div>
                            )}
                            {sp.condition && (
                              <div className="flex items-start gap-3 text-sm p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 hover:border-slate-450 transition-all col-span-1 sm:col-span-2 pt-3">
                                <Info className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                                <div className="w-full">
                                  <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Kondisi Fisik</div>
                                  <div className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5 flex flex-col gap-1">
                                    <span>{sp.condition}</span>
                                    {sp.defect && (
                                      <div className="p-3 bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/30 rounded-2xl text-red-650 dark:text-red-400 text-xs flex items-start gap-2.5 mt-2">
                                        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                                        <div>
                                          <div className="font-extrabold uppercase tracking-wider text-[9px] text-red-500">Catatan Minus / Defect</div>
                                          <p className="font-medium mt-0.5">{sp.defect}</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-slate-700 dark:text-slate-350 leading-relaxed break-words col-span-1 sm:col-span-2">{lightboxItem.specs}</p>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Price & Purchase CTA */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="shrink-0">
                  <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Harga Penjualan</div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
                    Rp {lightboxItem.sellingPrice.toLocaleString("id-ID")}
                  </div>
                </div>
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1 sm:flex-none gap-2 rounded-2xl h-12 px-4 font-bold text-xs cursor-pointer border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => handleCopyLink(lightboxItem.id)}
                  >
                    {copiedId === lightboxItem.id ? (
                      <>
                        <Check className="h-4 w-4 text-green-500" />
                        Tersalin
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Salin Link
                      </>
                    )}
                  </Button>
                  {lightboxItem.waLink && (
                    <a href={getDynamicWaLink(lightboxItem)} target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-none">
                      <Button size="sm" className="w-full gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-2xl transition-all duration-300 h-12 px-6 font-extrabold text-sm active:scale-[0.98] cursor-pointer shadow-xs">
                        <MessageCircle className="h-5 w-5" />
                        Hubungi via WA
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
