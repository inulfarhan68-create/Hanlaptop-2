import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { Store, MapPin, Phone, Package, Search, MessageCircle, X, Cpu, HardDrive, Monitor, MemoryStick, ChevronLeft, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

function parseItemSpecs(specs: string) {
  const result: { processor?: string; vga?: string; ram?: string; storage?: string; screen?: string } = {}
  if (!specs) return result
  const parts = specs.split(" | ")
  parts.forEach(part => {
    if (part.startsWith("Processor: ")) result.processor = part.replace("Processor: ", "")
    else if (part.startsWith("VGA: ")) result.vga = part.replace("VGA: ", "")
    else if (part.startsWith("RAM: ")) result.ram = part.replace("RAM: ", "")
    else if (part.startsWith("Storage: ")) result.storage = part.replace("Storage: ", "")
    else if (part.startsWith("Layar: ")) result.screen = part.replace("Layar: ", "")
  })
  return result
}

function SpecChip({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-full px-2.5 py-1">
      <Icon className="w-3 h-3 shrink-0 text-blue-500" />
      <span className="truncate">{label}</span>
    </div>
  )
}

function conditionLabel(c: string) {
  if (c === "NEW") return { text: "Baru", color: "bg-emerald-500 text-white" }
  if (c === "USED_A") return { text: "Grade A ✨", color: "bg-blue-500 text-white" }
  if (c === "USED_B") return { text: "Grade B", color: "bg-amber-500 text-white" }
  if (c === "USED_C") return { text: "Grade C", color: "bg-orange-500 text-white" }
  return { text: "Lainnya", color: "bg-slate-400 text-white" }
}

export function PublicCatalog() {
  const { slug } = useParams()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [lightboxItem, setLightboxItem] = useState<any>(null)

  useEffect(() => {
    fetchCatalog()
  }, [slug])

  const fetchCatalog = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/public/catalog/${slug}`)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-950 flex flex-col items-center p-6 space-y-8">
        <Skeleton className="h-40 w-full max-w-5xl rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-80 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950">
        <div className="text-center space-y-3">
          <Package className="h-16 w-16 mx-auto text-slate-300" />
          <h1 className="text-2xl font-bold text-slate-700 dark:text-slate-200">Katalog Tidak Ditemukan</h1>
          <p className="text-slate-500">Silakan periksa kembali tautan yang Anda buka.</p>
        </div>
      </div>
    )
  }

  const filteredItems = data.items.filter((item: any) => 
    item.itemName.toLowerCase().includes(search.toLowerCase()) || 
    item.category.toLowerCase().includes(search.toLowerCase()) ||
    (item.barcode && item.barcode.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50 dark:from-slate-950 dark:via-blue-950/10 dark:to-slate-950">
      
      {/* ======= HEADER ======= */}
      <header className="relative bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400 rounded-full blur-3xl -translate-y-1/2" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-cyan-400 rounded-full blur-3xl translate-y-1/2" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-8 md:py-12">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Logo & Store info */}
            <div className="flex items-center gap-5">
              {data.store.logo ? (
                <img 
                  src={data.store.logo} 
                  alt={data.store.name} 
                  className="h-20 w-20 md:h-24 md:w-24 rounded-2xl object-cover shadow-lg border-2 border-white/20 ring-4 ring-white/10" 
                />
              ) : (
                <div className="h-20 w-20 md:h-24 md:w-24 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-white/20 shadow-lg ring-4 ring-white/10">
                  <Store className="h-10 w-10 text-white/80" />
                </div>
              )}
              <div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight">{data.store.name}</h1>
                <div className="flex flex-col gap-1 mt-2 text-sm text-white/70">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-300" /> 
                    <span className="line-clamp-1">{data.store.address || 'Alamat belum diatur'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-blue-300" /> 
                    <span>{data.store.phone || 'Nomor telepon belum diatur'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="md:ml-auto w-full md:w-80">
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-white/40" />
                <Input 
                  type="search" 
                  placeholder="Cari laptop, sparepart, SN..." 
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl h-11 focus:bg-white/15 focus:border-white/40 transition-all"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ======= PRODUCT COUNT ======= */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            Produk Tersedia 
            <span className="inline-flex items-center justify-center h-6 min-w-6 px-2 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold">
              {filteredItems.length}
            </span>
          </h2>
        </div>
      </div>

      {/* ======= CATALOG GRID ======= */}
      <div className="max-w-6xl mx-auto px-4 pb-12">
        {filteredItems.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-card rounded-3xl border border-dashed shadow-sm">
            <Search className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Tidak ada produk</h3>
            <p className="text-slate-500 mt-1">Coba gunakan kata kunci pencarian yang lain.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredItems.map((item: any) => {
              const specs = parseItemSpecs(item.specs || "")
              const cond = conditionLabel(item.condition)
              return (
                <Card key={item.id} className="overflow-hidden group hover:shadow-xl transition-all duration-300 border-border/50 hover:border-blue-200 dark:hover:border-blue-800 rounded-2xl bg-white dark:bg-card">
                  {/* Image section */}
                  <div 
                    className="relative bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 cursor-pointer overflow-hidden"
                    onClick={() => item.imageUrl && setLightboxItem(item)}
                  >
                    {item.imageUrl ? (
                      <img 
                        src={item.imageUrl} 
                        alt={item.itemName} 
                        className="w-full aspect-[4/3] object-contain group-hover:scale-[1.03] transition-transform duration-500" 
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full aspect-[4/3] flex items-center justify-center">
                        <Package className="h-14 w-14 text-slate-300 dark:text-slate-600" />
                      </div>
                    )}
                    {/* Condition badge */}
                    <div className="absolute top-3 left-3">
                      <span className={`inline-flex items-center text-xs font-bold px-3 py-1.5 rounded-full shadow-md ${cond.color}`}>
                        {cond.text}
                      </span>
                    </div>
                    {/* Tap to view overlay hint */}
                    {item.imageUrl && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium">
                          Klik untuk lihat detail
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info section */}
                  <CardContent className="p-4 space-y-3">
                    {/* Category */}
                    <div className="text-[11px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest">{item.category}</div>
                    
                    {/* Product name */}
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 leading-snug text-[15px]" title={item.itemName}>
                      {item.itemName}
                    </h3>
                    
                    {/* Serial number */}
                    {item.barcode && (
                      <div className="text-[10px] text-slate-400 font-mono">SN: {item.barcode}</div>
                    )}

                    {/* Spec chips */}
                    {item.specs && (
                      <div className="flex flex-wrap gap-1.5">
                        {specs.processor && <SpecChip icon={Cpu} label={specs.processor} />}
                        {specs.ram && <SpecChip icon={MemoryStick} label={specs.ram} />}
                        {specs.storage && <SpecChip icon={HardDrive} label={specs.storage} />}
                        {specs.screen && <SpecChip icon={Monitor} label={specs.screen} />}
                      </div>
                    )}

                    {/* Price */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Harga</div>
                      <div className="font-black text-green-600 dark:text-green-400 text-xl tracking-tight">
                        Rp {item.sellingPrice.toLocaleString("id-ID")}
                      </div>
                    </div>

                    {/* WhatsApp CTA */}
                    {item.waLink && (
                      <a href={item.waLink} target="_blank" rel="noopener noreferrer" className="block">
                        <Button size="sm" className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-sm h-10 font-semibold">
                          <MessageCircle className="h-4 w-4" />
                          Tanya via WhatsApp
                        </Button>
                      </a>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* ======= FOOTER ======= */}
      <footer className="border-t bg-white/50 dark:bg-card/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-slate-500">
          <div className="flex items-center gap-3">
            {data.store.logo ? (
              <img src={data.store.logo} alt="" className="h-8 w-8 rounded-lg object-cover opacity-60" />
            ) : (
              <Store className="h-5 w-5 text-slate-400" />
            )}
            <span className="font-semibold text-slate-600 dark:text-slate-300">{data.store.name}</span>
          </div>
          <div className="text-xs text-slate-400">
            © {new Date().getFullYear()} {data.store.name}. Katalog online.
          </div>
        </div>
      </footer>

      {/* ======= LIGHTBOX ======= */}
      {lightboxItem && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxItem(null)}
        >
          <button 
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
            onClick={() => setLightboxItem(null)}
          >
            <X className="h-6 w-6" />
          </button>
          
          <div 
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center gap-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Full-size image */}
            {lightboxItem.imageUrl && (
              <img 
                src={lightboxItem.imageUrl} 
                alt={lightboxItem.itemName} 
                className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl"
              />
            )}
            
            {/* Info panel */}
            <div className="w-full max-w-lg bg-white/10 backdrop-blur-md rounded-2xl p-5 text-white space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-blue-300 font-bold uppercase tracking-widest mb-1">{lightboxItem.category}</div>
                  <h3 className="text-lg font-bold">{lightboxItem.itemName}</h3>
                  {lightboxItem.barcode && (
                    <div className="text-xs text-white/50 font-mono mt-0.5">SN: {lightboxItem.barcode}</div>
                  )}
                </div>
                <div>
                  <span className={`inline-flex items-center text-xs font-bold px-3 py-1.5 rounded-full ${conditionLabel(lightboxItem.condition).color}`}>
                    {conditionLabel(lightboxItem.condition).text}
                  </span>
                </div>
              </div>

              {/* Specs */}
              {lightboxItem.specs && (() => {
                const sp = parseItemSpecs(lightboxItem.specs)
                return (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
                    {sp.processor && (
                      <div className="flex items-center gap-1.5 text-xs bg-white/10 rounded-full px-3 py-1.5">
                        <Cpu className="w-3 h-3 text-blue-300" />{sp.processor}
                      </div>
                    )}
                    {sp.ram && (
                      <div className="flex items-center gap-1.5 text-xs bg-white/10 rounded-full px-3 py-1.5">
                        <MemoryStick className="w-3 h-3 text-blue-300" />{sp.ram}
                      </div>
                    )}
                    {sp.storage && (
                      <div className="flex items-center gap-1.5 text-xs bg-white/10 rounded-full px-3 py-1.5">
                        <HardDrive className="w-3 h-3 text-blue-300" />{sp.storage}
                      </div>
                    )}
                    {sp.screen && (
                      <div className="flex items-center gap-1.5 text-xs bg-white/10 rounded-full px-3 py-1.5">
                        <Monitor className="w-3 h-3 text-blue-300" />{sp.screen}
                      </div>
                    )}
                    {sp.vga && (
                      <div className="flex items-center gap-1.5 text-xs bg-white/10 rounded-full px-3 py-1.5">
                        <Monitor className="w-3 h-3 text-blue-300" />{sp.vga}
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Price + WA */}
              <div className="flex items-end justify-between pt-2 border-t border-white/10">
                <div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider font-medium">Harga</div>
                  <div className="text-2xl font-black text-green-400">
                    Rp {lightboxItem.sellingPrice.toLocaleString("id-ID")}
                  </div>
                </div>
                {lightboxItem.waLink && (
                  <a href={lightboxItem.waLink} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow font-semibold">
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
