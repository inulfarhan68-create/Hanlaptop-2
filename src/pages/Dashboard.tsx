import { useState } from "react"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PeriodSelector, getInitialPeriod } from "@/components/PeriodSelector"
import { OverviewTab } from "@/components/dashboard/OverviewTab"
import { AnalyticsTab } from "@/components/dashboard/AnalyticsTab"
import { DashboardSkeleton } from "@/components/ui/skeleton"
import { ApprovalBoard } from "@/components/ApprovalBoard"
import useSWR from "swr"

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)
}

export function Dashboard() {
  const [period, setPeriod] = useState(getInitialPeriod)
  const [activeTab, setActiveTab] = useState<"overview" | "analytics">("overview")

  const queryParams = new URLSearchParams()
  if (period.from) queryParams.append('from', period.from)
  if (period.to) queryParams.append('to', period.to)
  const q = queryParams.toString() ? `?${queryParams.toString()}` : ""

  const { data, error: dashboardError, isLoading: loading, isValidating: refreshing } = useSWR<any>(
    `/api/dashboard${q}`,
    { keepPreviousData: true }
  )

  // 🔒 FIX: Use KPI aggregation API instead of fetching ALL inventory
  // This prevents loading thousands of inventory items into memory
  const { data: inventoryKpi } = useSWR<any>(
    '/api/inventory/kpi'
  )

  if (loading && !data) {
    return <DashboardSkeleton />
  }

  if (dashboardError || !data) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground p-6 text-center animate-in fade-in">
        <div>
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <p className="font-semibold text-lg">{dashboardError?.message || "Gagal memuat data dashboard"}</p>
          <p className="text-sm mt-1">Silakan coba muat ulang halaman atau hubungi administrator.</p>
          <Button onClick={() => window.location.reload()} className="mt-4" variant="outline">Muat Ulang</Button>
        </div>
      </div>
    )
  }

  const userRole = data.userRole || "kasir"
  const isOwner = userRole === "owner" || userRole === "manager" || userRole === "investor"

  // Transform KPI data to match expected format for OverviewTab
  const inventoryStats = inventoryKpi ? {
    laptop: {
      qty: inventoryKpi.laptop?.qty || 0,
      value: inventoryKpi.laptop?.value || 0
    },
    sparepart: {
      qty: inventoryKpi.sparepart?.qty || 0,
      value: inventoryKpi.sparepart?.value || 0
    },
    aksesoris: {
      qty: inventoryKpi.aksesoris?.qty || 0,
      value: inventoryKpi.aksesoris?.value || 0
    },
    total: {
      qty: inventoryKpi.total?.qty || 0,
      value: inventoryKpi.total?.value || 0
    }
  } : {
    laptop: { qty: 0, value: 0 },
    sparepart: { qty: 0, value: 0 },
    aksesoris: { qty: 0, value: 0 },
    total: { qty: 0, value: 0 }
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Sticky Page Header */}
      <div className="sticky top-0 z-40 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-1.5 md:gap-2 p-2 md:px-5 md:py-3 bg-white/80 light-blue:bg-white dark:bg-card backdrop-blur-xl rounded-2xl md:rounded-[2rem] border border-border shadow-sm mt-0 mb-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base md:text-2xl font-bold tracking-tight leading-none">Dashboard</h2>
            <p className="text-muted-foreground mt-1 text-[9px] md:text-xs font-medium hidden md:block">
              Ringkasan keuangan dan analitik.
              {refreshing && <span className="ml-2 text-primary animate-pulse">Memperbarui...</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 w-full md:w-auto">
          <div className="flex bg-muted/30 dark:bg-muted p-1 rounded-full border border-border shadow-inner shrink-0 w-1/2 md:w-auto">
            <button
              className={`flex-1 md:flex-none px-2 md:px-4 py-1 md:py-1.5 text-[10px] md:text-xs font-bold rounded-full transition-all duration-300 ${activeTab === "overview" ? "bg-white dark:bg-accent text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setActiveTab("overview")}
            >Overview</button>
            {isOwner && (
              <button
                className={`flex-1 md:flex-none px-2 md:px-4 py-1 md:py-1.5 text-[10px] md:text-xs font-bold rounded-full transition-all duration-300 ${activeTab === "analytics" ? "bg-white dark:bg-accent text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setActiveTab("analytics")}
              >Analytics</button>
            )}
          </div>
          <div className="w-1/2 md:w-auto z-50">
             <PeriodSelector onSelect={setPeriod} />
          </div>
        </div>
      </div>

      {/* Scrollable Body Content */}
      <div className="flex-1 overflow-x-hidden space-y-2">
        <div className="px-2">
          <ApprovalBoard isOwner={isOwner} />
        </div>
        {activeTab === "overview" && (
          <OverviewTab
            data={data}
            inventoryStats={inventoryStats}
            inventoryKpi={inventoryKpi}
            isOwner={isOwner}
            formatCurrency={formatCurrency}
          />
        )}
        {activeTab === "analytics" && isOwner && (
          <AnalyticsTab
            data={data}
            formatCurrency={formatCurrency}
          />
        )}
      </div>
    </div>
  )
}
