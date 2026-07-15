import { Database, Percent, Search, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useUserRole } from "@/hooks/useUserRole"
import { useEffect, useState } from "react"

interface CustomerToolbarProps {
  mainTab: "database" | "crm"
  setMainTab: (tab: "database" | "crm") => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  openAddModal: () => void
}

export function CustomerToolbar({
  mainTab,
  setMainTab,
  searchQuery,
  setSearchQuery,
  openAddModal
}: CustomerToolbarProps) {
  const { isInvestor } = useUserRole()
  // Hydration safety for localStorage
  const [storeId, setStoreId] = useState<string | null>(null)
  
  useEffect(() => {
    setStoreId(localStorage.getItem('selectedStoreId') || 'all')
  }, [])

  return (
    <>
      <div className="sticky top-0 z-40 shrink-0 flex flex-col gap-3 p-3 md:px-5 md:py-3 bg-white/80 light-blue:bg-white dark:bg-card backdrop-blur-xl rounded-xl md:rounded-[2rem] border border-border shadow-sm mt-0 mb-4">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">Pelanggan & CRM</h2>
            <p className="text-muted-foreground text-xs md:text-sm">Kelola database, riwayat belanja, dan program loyalitas pelanggan.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex p-1 bg-muted/40 rounded-xl border">
              <Button 
                size="sm" 
                variant={mainTab === "database" ? "default" : "ghost"}
                onClick={() => setMainTab("database")}
                className="rounded-lg text-xs flex-1 sm:flex-none"
              >
                <Database className="w-3.5 h-3.5 mr-1.5" />
                Database
              </Button>
              <Button 
                size="sm" 
                variant={mainTab === "crm" ? "default" : "ghost"}
                onClick={() => setMainTab("crm")}
                className="rounded-lg text-xs flex-1 sm:flex-none"
              >
                <Percent className="w-3.5 h-3.5 mr-1.5" />
                CRM & Loyalitas
              </Button>
            </div>
            {mainTab === "database" && !isInvestor && storeId !== 'all' && storeId !== null && (
              <Button size="sm" className="gap-1 rounded-xl" onClick={openAddModal}>
                <UserPlus className="h-4 w-4" /> <span className="hidden sm:inline">Tambah Manual</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {mainTab === "database" && (
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Cari nama atau nomor WA..." 
              className="pl-8 bg-card"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      )}
    </>
  )
}
