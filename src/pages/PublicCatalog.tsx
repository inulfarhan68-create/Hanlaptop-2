import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { Store, MapPin, Phone, Package, Search, MessageCircle, X, Cpu, HardDrive, Monitor, MemoryStick } from "lucide-react"
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

function conditionLabel(c: string) {
  if (c === "NEW") return { text: "Baru", color: "bg-emerald-500 text-white" }
  if (c === "USED_A") return { text: "Grade A ✨", color: "bg-blue-600 text-white" }
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50 dark:from-slate-950 dark:via-blue-950/10 dark:to-slate-950 pb-12">
      
      {/* ======= HEADER ======= */}
      <header className="relative bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white overflow-hidden shadow-md">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400 rounded-full blur-3xl -translate-y-1/2" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-cyan-400 rounded-full blur-3xl translate-y-1/2" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-8 md:py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start md:items-center gap-5">
              {data.store.logo ? (
                <div className="h-20 w-20 md:h-24 md:w-24 bg-white rounded-2xl flex items-center justify-center p-2 shadow-lg border border-white/20 ring-4 ring-white/10 shrink-0 overflow-hidden">
                  <img 
                    src={data.store.logo} 
                    alt={data.store.name} 
                    className="max-h-full max-w-full object-contain" 
                  />
                </div>
              ) : (
                <div className="h-20 w-20 md:h-24 md:w-24 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-white/20 shadow-lg ring-4 ring-white/10 shrink-0">
                  <Store className="h-10 w-10 text-white/80" />
                </div>
              )}
              <div className="space-y-2">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight">{data.store.name}</h1>
                <div className="flex flex-col gap-1.5 text-sm text-white/85">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-blue-300 mt-0.5" /> 
                    <span className="leading-relaxed">{data.store.address || 'Alamat belum diatur'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0 text-blue-300" /> 
                    <span>{data.store.phone || 'Nomor telepon belum diatur'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Search Input */}
            <div className="w-full md:w-80 shrink-0">
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-white/50" />
                <Input 
                  type="search" 
                  placeholder="Cari laptop, sparepart, SN..." 
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl h-11 focus:bg-white/15 focus:border-white/40 transition-all text-sm"
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
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2.5 mb-6">
          Produk Tersedia 
          <Badge variant="secondary" className="rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 px-3 py-1 font-bold text-xs">
            {filteredItems.length}
          </Badge>
        </h2>

        {filteredItems.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-card rounded-3xl border border-dashed shadow-sm">
            <Search className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Tidak ada produk</h3>
            <p className="text-slate-500 mt-1">Coba gunakan kata kunci pencarian yang lain.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item: any) => {
              const specs = parseItemSpecs(item.specs || "")
              const cond = conditionLabel(item.condition)
              return (
                <Card key={item.id} className="overflow-hidden group hover:shadow-xl transition-all duration-300 border-border/60 hover:border-blue-300 dark:hover:border-blue-800 rounded-2xl bg-white dark:bg-card flex flex-col justify-between">
                  <div>
                    {/* Image section */}
                    <div 
                      className="relative bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800/50 dark:to-slate-900/50 cursor-pointer overflow-hidden flex items-center justify-center"
                      onClick={() => item.imageUrl && setLightboxItem(item)}
                    >
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.itemName} 
                          className="w-full aspect-[4/3] object-contain group-hover:scale-[1.03] transition-transform duration-500 p-2" 
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full aspect-[4/3] flex items-center justify-center">
                          <Package className="h-14 w-14 text-slate-300 dark:text-slate-600" />
                        </div>
                      )}
                      
                      {/* Condition badge */}
                      <div className="absolute top-3 left-3 z-10">
                        <span className={`inline-flex items-center text-[11px] font-bold px-3 py-1 rounded-full shadow-sm ${cond.color}`}>
                          {cond.text}
                        </span>
                      </div>

                      {/* Hover action hint */}
                      {item.imageUrl && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white bg-black/60 backdrop-blur-sm px-3.5 py-2 rounded-full text-xs font-semibold shadow-md">
                            Lihat Detail Foto & Spek
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card Content Info */}
                    <CardContent className="p-5 space-y-4">
                      <div>
                        {/* Category */}
                        <div className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold uppercase tracking-widest mb-1.5">{item.category}</div>
                        
                        {/* Product name */}
                        <h3 className="font-extrabold text-slate-800 dark:text-slate-100 leading-snug text-base break-words">
                          {item.itemName}
                        </h3>
                        
                        {/* Serial number */}
                        {item.barcode && (
                          <div className="text-[10px] text-slate-400 font-mono mt-1">SN: {item.barcode}</div>
                        )}
                      </div>

                      {/* Structural Specs Display (No Truncation) */}
                      {item.specs && (() => {
                        const hasParsedSpecs = !!(specs.processor || specs.ram || specs.storage || specs.screen || specs.vga);
                        return (
                          <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-2.5 text-xs">
                            {hasParsedSpecs ? (
                              <>
                                {specs.processor && (
                                  <div className="flex items-start gap-2">
                                    <Cpu className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                                    <span className="font-medium text-slate-700 dark:text-slate-300 break-words leading-relaxed">{specs.processor}</span>
                                  </div>
                                )}
                                {specs.ram && (
                                  <div className="flex items-start gap-2">
                                    <MemoryStick className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                                    <span className="text-slate-600 dark:text-slate-400">RAM: <span className="font-bold text-slate-800 dark:text-slate-200">{specs.ram}</span></span>
                                  </div>
                                )}
                                {specs.storage && (
                                  <div className="flex items-start gap-2">
                                    <HardDrive className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                                    <span className="text-slate-600 dark:text-slate-400">SSD: <span className="font-bold text-slate-800 dark:text-slate-200">{specs.storage}</span></span>
                                  </div>
                                )}
                                {specs.screen && (
                                  <div className="flex items-start gap-2">
                                    <Monitor className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                                    <span className="text-slate-600 dark:text-slate-400">Layar: <span className="font-bold text-slate-800 dark:text-slate-200 break-words">{specs.screen}</span></span>
                                  </div>
                                )}
                              </>
                            ) : (
                              <p className="text-slate-600 dark:text-slate-400 leading-relaxed break-words">{item.specs}</p>
                            )}
                          </div>
                        );
                      })()}
                    </CardContent>
                  </div>

                  {/* Price & CTA Section */}
                  <div className="p-5 pt-0 border-t border-slate-50 dark:border-slate-800/50 mt-auto space-y-4">
                    <div className="pt-4 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Harga</div>
                        <div className="font-black text-green-600 dark:text-green-400 text-xl tracking-tight mt-0.5">
                          Rp {item.sellingPrice.toLocaleString("id-ID")}
                        </div>
                      </div>
                    </div>

                    {item.waLink && (
                      <a href={item.waLink} target="_blank" rel="noopener noreferrer" className="block">
                        <Button size="sm" className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-md h-11 font-bold text-sm transition-all hover:scale-[1.01] active:scale-[0.99]">
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
      <footer className="border-t bg-white/50 dark:bg-card/50 backdrop-blur-sm mt-12">
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
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxItem(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row relative animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors z-20"
              onClick={() => setLightboxItem(null)}
              aria-label="Tutup"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Left/Top Side: Large image container */}
            <div className="w-full md:w-1/2 bg-slate-50 dark:bg-slate-950/40 p-6 flex items-center justify-center relative min-h-[300px] md:min-h-[450px]">
              {lightboxItem.imageUrl ? (
                <img 
                  src={lightboxItem.imageUrl} 
                  alt={lightboxItem.itemName} 
                  className="max-w-full max-h-[400px] object-contain rounded-2xl"
                />
              ) : (
                <Package className="h-20 w-20 text-slate-300 dark:text-slate-700" />
              )}
            </div>

            {/* Right/Bottom Side: Product details */}
            <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold uppercase tracking-widest">{lightboxItem.category}</span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full ${conditionLabel(lightboxItem.condition).color}`}>
                    {conditionLabel(lightboxItem.condition).text}
                  </span>
                </div>

                <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight break-words">
                  {lightboxItem.itemName}
                </h3>

                {lightboxItem.barcode && (
                  <div className="text-xs text-slate-400 font-mono bg-slate-50 dark:bg-slate-950/50 px-2.5 py-1 rounded border border-slate-100 dark:border-slate-800/80 inline-block">
                    Nomor Serial (SN): <span className="font-semibold text-slate-700 dark:text-slate-300">{lightboxItem.barcode}</span>
                  </div>
                )}

                {/* Detailed Specifications Section */}
                {lightboxItem.specs && (() => {
                  const sp = parseItemSpecs(lightboxItem.specs)
                  return (
                    <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Spesifikasi Unit:</h4>
                      <div className="space-y-3 bg-slate-50 dark:bg-slate-950/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                        {sp.processor && (
                          <div className="flex items-start gap-3 text-sm">
                            <Cpu className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase">Processor</div>
                              <div className="font-semibold text-slate-800 dark:text-slate-200">{sp.processor}</div>
                            </div>
                          </div>
                        )}
                        {sp.vga && (
                          <div className="flex items-start gap-3 text-sm">
                            <Monitor className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase">VGA / Graphics</div>
                              <div className="font-semibold text-slate-800 dark:text-slate-200">{sp.vga}</div>
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          {sp.ram && (
                            <div className="flex items-start gap-3 text-sm">
                              <MemoryStick className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                              <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase">RAM</div>
                                <div className="font-semibold text-slate-800 dark:text-slate-200">{sp.ram}</div>
                              </div>
                            </div>
                          )}
                          {sp.storage && (
                            <div className="flex items-start gap-3 text-sm">
                              <HardDrive className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                              <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase">Penyimpanan (SSD)</div>
                                <div className="font-semibold text-slate-800 dark:text-slate-200">{sp.storage}</div>
                              </div>
                            </div>
                          )}
                        </div>
                        {sp.screen && (
                          <div className="flex items-start gap-3 text-sm">
                            <Monitor className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase">Layar / Display</div>
                              <div className="font-semibold text-slate-800 dark:text-slate-200">{sp.screen}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Price & Purchase CTA */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Harga Penjualan</div>
                  <div className="text-2xl font-black text-green-600 dark:text-green-400 tracking-tight">
                    Rp {lightboxItem.sellingPrice.toLocaleString("id-ID")}
                  </div>
                </div>
                {lightboxItem.waLink && (
                  <a href={lightboxItem.waLink} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="w-full sm:w-auto gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg h-12 px-6 font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]">
                      <MessageCircle className="h-5 w-5" />
                      Hubungi Seller via WA
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
