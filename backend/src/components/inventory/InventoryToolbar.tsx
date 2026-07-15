import { useState, useEffect } from "react"
import { Search, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ModernSelect } from "@/components/ui/modern-select"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

interface InventoryToolbarProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  filterCategory: string;
  setFilterCategory: (val: string) => void;
  filterStatus: string;
  setFilterStatus: (val: string) => void;
  setCurrentPage: (val: number) => void;
}

export function InventoryToolbar({
  searchTerm,
  setSearchTerm,
  filterCategory,
  setFilterCategory,
  filterStatus,
  setFilterStatus,
  setCurrentPage
}: InventoryToolbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [localSearch, setLocalSearch] = useState(searchTerm)

  // Sync local state when external URL changes (e.g. back/forward button)
  useEffect(() => {
    setLocalSearch(searchTerm)
  }, [searchTerm])

  // Debounce the local search to update URL
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchTerm) {
        setSearchTerm(localSearch)
      }
    }, 500)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearch, searchTerm])

  return (
    <div className="flex gap-2 w-full mt-1">
      <div className="relative flex-1 group">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
        <Input
          placeholder="Cari SKU/Nama..."
          className="pl-8 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-[11px] h-8 w-full rounded-lg shadow-sm focus-visible:ring-1 focus-visible:ring-blue-500/50 transition-all"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
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
  )
}
