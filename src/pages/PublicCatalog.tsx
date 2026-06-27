import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { Store, MapPin, Phone, Package, Search, MessageCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function PublicCatalog() {
  const { slug } = useParams()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6 space-y-8">
        <Skeleton className="h-32 w-full max-w-4xl rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <Package className="h-16 w-16 mx-auto text-slate-300" />
          <h1 className="text-2xl font-bold text-slate-700">Katalog Tidak Ditemukan</h1>
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-card border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {data.store.logo ? (
                <img src={data.store.logo} alt={data.store.name} className="h-16 w-16 rounded-xl object-cover shadow-sm border" />
              ) : (
                <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center border shadow-sm">
                  <Store className="h-8 w-8" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{data.store.name}</h1>
                <div className="flex flex-col gap-1 mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0" /> 
                    <span className="line-clamp-1">{data.store.address || 'Alamat belum diatur'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 shrink-0" /> 
                    <span>{data.store.phone || 'Nomor telepon belum diatur'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input 
                type="search" 
                placeholder="Cari laptop, sparepart, atau SN..." 
                className="pl-9 bg-slate-100 border-none rounded-full"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Catalog Grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
          Produk Tersedia 
          <Badge variant="secondary" className="rounded-full">{filteredItems.length}</Badge>
        </h2>

        {filteredItems.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-card rounded-3xl border border-dashed">
            <Search className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Tidak ada produk</h3>
            <p className="text-slate-500 mt-1">Coba gunakan kata kunci pencarian yang lain.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filteredItems.map((item: any) => (
              <Card key={item.id} className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/50">
                <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center relative overflow-hidden">
                  {/* Placeholder for Product Image */}
                  <Package className="h-12 w-12 text-slate-300 group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute top-2 right-2">
                    <Badge variant={item.condition.startsWith('USED') ? 'secondary' : 'default'} className="backdrop-blur-md bg-white/80">
                      {item.condition === 'NEW' ? 'Baru' : 
                       item.condition === 'USED_A' ? 'Grade A ✨' : 
                       item.condition === 'USED_B' ? 'Grade B' : 
                       item.condition === 'USED_C' ? 'Grade C' : 'Lainnya'}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="text-xs text-blue-600 font-semibold mb-1 uppercase tracking-wider">{item.category}</div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 leading-tight mb-1 line-clamp-2" title={item.itemName}>
                    {item.itemName}
                  </h3>
                  
                  {item.barcode && (
                    <div className="text-[10px] text-slate-400 font-mono mb-2">SN: {item.barcode}</div>
                  )}

                  {item.specs && (
                    <p className="text-xs text-slate-500 mb-3 line-clamp-2" title={item.specs}>
                      {item.specs}
                    </p>
                  )}

                  <div className="flex items-end justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">Harga</div>
                      <div className="font-black text-green-600 text-lg">
                        Rp {item.sellingPrice.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp CTA Button - PRD requirement */}
                  {item.waLink && (
                    <a href={item.waLink} target="_blank" rel="noopener noreferrer" className="block mt-3">
                      <Button size="sm" className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-sm">
                        <MessageCircle className="h-4 w-4" />
                        Tanya via WhatsApp
                      </Button>
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
