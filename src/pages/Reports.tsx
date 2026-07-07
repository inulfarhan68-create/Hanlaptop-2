import { useState } from "react"
import { Navigate } from "react-router-dom"
import { useUserRole } from "@/hooks/useUserRole"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { PeriodSelector, getInitialPeriod } from "@/components/PeriodSelector"
import { ExportDropdown } from "@/components/reports/ExportDropdown"
import { PrintReportsPortal } from "@/components/reports/PrintReportsPortal"
import { GeneralJournalTab } from "@/components/reports/GeneralJournalTab"
import { SalesAnalysisTab } from "@/components/reports/SalesAnalysisTab"
import { AgingInventoryTab } from "@/components/reports/AgingInventoryTab"
import { CashierShiftsTab } from "@/components/reports/CashierShiftsTab"
import { ProductProfitTab } from "@/components/reports/ProductProfitTab"
import { TechnicianCommissionTab } from "@/components/reports/TechnicianCommissionTab"
import { COATable } from "@/components/accounting/COATable"
import { TrialBalanceTable } from "@/components/accounting/TrialBalanceTable"
import { IncomeStatementReport } from "@/components/accounting/IncomeStatementReport"
import { BalanceSheetReport } from "@/components/accounting/BalanceSheetReport"
import { CashFlowReport } from "@/components/accounting/CashFlowReport"
import { FixedAssetsTable } from "@/components/accounting/FixedAssetsTable"
import useSWR from "swr"
import * as XLSX from "xlsx"

const fmt = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v)

export function Reports() {
  const { isOwner, isManager, isInvestor } = useUserRole()
  // Simplified tabs: 6 main tabs + 1 sub-tab for Akuntansi
  const [activeTab, setActiveTab] = useState<"labarugi" | "neraca" | "produk" | "shift" | "komisi" | "akuntansi">("labarugi")
  // Sub-tab for Akuntansi section
  const [activeSubTab, setActiveSubTab] = useState<"jurnal" | "neracasaldo" | "coa" | "asettetap">("jurnal")
  const [period, setPeriod] = useState(getInitialPeriod)
  const [printType, setPrintType] = useState<"all" | "pnl" | "balance">("all")
  const [isPrinting, setIsPrinting] = useState(false)

  // Extract year and month from period
  const selectedYear = period.from ? new Date(period.from).getFullYear() : new Date().getFullYear()
  const selectedMonth = period.from ? new Date(period.from).getMonth() + 1 : new Date().getMonth() + 1

  if (!isOwner && !isManager && !isInvestor) {
    return <Navigate to="/dashboard" replace />
  }

  const queryParams = new URLSearchParams()
  if (period.from) queryParams.append('from', period.from)
  if (period.to) queryParams.append('to', period.to)
  const q = queryParams.toString() ? `?${queryParams.toString()}` : ""

  const apiUrl = import.meta.env.VITE_API_URL || ''
  const periodQuery = `year=${selectedYear}&month=${selectedMonth}`

  const { data: res, error: reportsError, isLoading: loading, isValidating: refreshing } = useSWR<any>(
    apiUrl + `/api/reports${q}`,
    { keepPreviousData: true }
  )

  // New accounting API data - fetch all needed data upfront (lazy loading based on active tab content)
  const { data: trialBalance } = useSWR(
    (activeTab === "akuntansi" && activeSubTab === "neracasaldo") ? apiUrl + `/api/accounting/trial-balance?${periodQuery}` : null,
    { keepPreviousData: true }
  )

  const { data: incomeStatement } = useSWR(
    activeTab === "labarugi" ? apiUrl + `/api/accounting/income-statement?${periodQuery}` : null,
    { keepPreviousData: true }
  )

  const { data: balanceSheet } = useSWR(
    activeTab === "neraca" ? apiUrl + `/api/accounting/balance-sheet?${periodQuery}` : null,
    { keepPreviousData: true }
  )

  const { data: cashFlow } = useSWR(
    activeTab === "neraca" ? apiUrl + `/api/accounting/cash-flow?${periodQuery}` : null,
    { keepPreviousData: true }
  )

  const { data: equityChanges } = useSWR(
    apiUrl + `/api/accounting/equity-changes?${periodQuery}`,
    { keepPreviousData: true }
  )

  const handleExportExcel = () => {
    if (!res) return

    // Profit & Loss Data
    const pnlData = [
      { Kategori: "Pendapatan", Item: "Penjualan Laptop Bekas", Nilai: Math.round(res.revenue?.laptop || 0) },
      { Kategori: "Pendapatan", Item: "Pendapatan Servis", Nilai: Math.round(res.revenue?.servis || 0) },
      { Kategori: "Pendapatan", Item: "Total Pendapatan", Nilai: Math.round((res.revenue?.laptop || 0) + (res.revenue?.servis || 0)) },
      { Kategori: "HPP", Item: "Harga Pokok Penjualan", Nilai: Math.round(res.cogs || 0) },
      { Kategori: "Laba Kotor", Item: "Laba Kotor", Nilai: Math.round((res.revenue?.laptop || 0) + (res.revenue?.servis || 0) - (res.cogs || 0)) },
      { Kategori: "Beban Operasional", Item: "Gaji Karyawan", Nilai: Math.round(res.opex?.gaji || 0) },
      { Kategori: "Beban Operasional", Item: "Listrik & Internet", Nilai: Math.round(res.opex?.listrik || 0) },
      { Kategori: "Beban Operasional", Item: "Sewa Tempat", Nilai: Math.round(res.opex?.sewa || 0) },
      { Kategori: "Beban Operasional", Item: "Klaim Garansi", Nilai: Math.round(res.opex?.garansi || 0) },
      { Kategori: "Beban Operasional", Item: "Lainnya", Nilai: Math.round(res.opex?.lainnya || 0) },
      { Kategori: "Beban Operasional", Item: "Total Beban", Nilai: Math.round((res.opex?.gaji || 0) + (res.opex?.listrik || 0) + (res.opex?.sewa || 0) + (res.opex?.garansi || 0) + (res.opex?.lainnya || 0)) },
      { Kategori: "Laba Bersih", Item: "Laba Bersih", Nilai: Math.round((res.revenue?.laptop || 0) + (res.revenue?.servis || 0) - (res.cogs || 0) - ((res.opex?.gaji || 0) + (res.opex?.listrik || 0) + (res.opex?.sewa || 0) + (res.opex?.garansi || 0) + (res.opex?.lainnya || 0))) }
    ]

    const totalAssets = Math.round((res.assets?.kas || 0) + (res.assets?.inventory || 0) + (res.assets?.piutang || 0))
    const totalEquity = Math.round((res.equity || 0) + (res.cumulativeNetProfit || 0))
    const totalLiabEquity = Math.round((res.liabilities || 0) + totalEquity)

    // Balance Sheet Data
    const balanceData = [
      { Kategori: "Aset", Item: "Kas & Bank", Nilai: Math.round(res.assets?.kas || 0) },
      { Kategori: "Aset", Item: "Piutang Usaha", Nilai: Math.round(res.assets?.piutang || 0) },
      { Kategori: "Aset", Item: "Persediaan Barang", Nilai: Math.round(res.assets?.inventory || 0) },
      { Kategori: "Aset", Item: "Total Aset", Nilai: totalAssets },
      { Kategori: "Kewajiban", Item: "Hutang Usaha", Nilai: Math.round(res.liabilitiesDetail?.hutangUsaha || 0) },
      { Kategori: "Kewajiban", Item: "Hutang Bank/Lainnya", Nilai: Math.round(res.liabilitiesDetail?.hutangBank || 0) },
      { Kategori: "Kewajiban", Item: "Total Kewajiban", Nilai: Math.round(res.liabilities || 0) },
      { Kategori: "Ekuitas", Item: "Modal Awal", Nilai: Math.round(res.equity || 0) },
      { Kategori: "Ekuitas", Item: "Laba Ditahan", Nilai: Math.round(res.cumulativeNetProfit || 0) },
      { Kategori: "Ekuitas", Item: "Total Ekuitas", Nilai: totalEquity },
      { Kategori: "Total Liab & Ekuitas", Item: "Total Kewajiban + Ekuitas", Nilai: totalLiabEquity }
    ]

    const wb = XLSX.utils.book_new()
    const wsPnl = XLSX.utils.json_to_sheet(pnlData)
    const wsBalance = XLSX.utils.json_to_sheet(balanceData)

    XLSX.utils.book_append_sheet(wb, wsPnl, "Laba Rugi")
    XLSX.utils.book_append_sheet(wb, wsBalance, "Neraca")

    XLSX.writeFile(wb, `Laporan_Keuangan_${period.label.replace(/ /g, "_")}.xlsx`)
  }

  const handleExportPDF = () => {
    setIsPrinting(true)
    setTimeout(() => {
      window.print()
    }, 500)
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Sticky Page Header */}
      <div className="sticky top-0 z-40 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-1.5 md:gap-2 p-2 md:px-5 md:py-3 bg-white/80 light-blue:bg-white dark:bg-card backdrop-blur-xl rounded-2xl md:rounded-[2rem] border border-border shadow-sm mt-0 mb-2 print:hidden">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg md:text-xl font-bold tracking-tight leading-none">Financial Reports</h2>
            <p className="text-muted-foreground mt-1 text-[9px] md:text-xs font-medium hidden md:block">
              Laba rugi dan neraca keuangan
              {refreshing && <span className="ml-2 text-primary animate-pulse">Memperbarui...</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2 w-full md:w-auto mt-1 md:mt-0">
          <div className="flex-1 md:flex-none z-50 min-w-0">
            <PeriodSelector onSelect={setPeriod} />
          </div>
          <div className="shrink-0 z-50">
            <ExportDropdown 
              printType={printType} 
              setPrintType={setPrintType} 
              onPrint={() => setIsPrinting(true)} 
              onPdf={handleExportPDF} 
              onExcel={handleExportExcel} 
            />
          </div>
        </div>
      </div>

      {/* Tabs Navigation - Simplified to 6 essential tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-2 px-1 print:hidden scrollbar-none">
        <Button size="sm" variant={activeTab === "labarugi" ? "default" : "outline"} onClick={() => setActiveTab("labarugi")} className="rounded-full h-8 text-xs px-3">📈 Laba Rugi</Button>
        <Button size="sm" variant={activeTab === "neraca" ? "default" : "outline"} onClick={() => setActiveTab("neraca")} className="rounded-full h-8 text-xs px-3">📊 Neraca & Kas</Button>
        <Button size="sm" variant={activeTab === "produk" ? "default" : "outline"} onClick={() => setActiveTab("produk")} className="rounded-full h-8 text-xs px-3">💻 Produk</Button>
        <Button size="sm" variant={activeTab === "shift" ? "default" : "outline"} onClick={() => setActiveTab("shift")} className="rounded-full h-8 text-xs px-3">💰 Kasir</Button>
        <Button size="sm" variant={activeTab === "komisi" ? "default" : "outline"} onClick={() => setActiveTab("komisi")} className="rounded-full h-8 text-xs px-3">🔧 Teknisi</Button>
        <Button size="sm" variant={activeTab === "akuntansi" ? "default" : "outline"} onClick={() => setActiveTab("akuntansi")} className="rounded-full h-8 text-xs px-3">📒 Akuntansi</Button>
      </div>

      {/* Scrollable Body Content - Simplified tabs */}
      <div className="flex-1 overflow-x-hidden space-y-2 print:p-0 print:m-0 print:space-y-2">
        {activeTab === "labarugi" && (
          <IncomeStatementReport data={incomeStatement} fmt={fmt} isLoading={!incomeStatement} />
        )}
        {activeTab === "neraca" && (
          <>
            <BalanceSheetReport data={balanceSheet} fmt={fmt} isLoading={!balanceSheet} />
            <CashFlowReport data={cashFlow} fmt={fmt} isLoading={!cashFlow} />
          </>
        )}
        {activeTab === "produk" && (
          <>
            <ProductProfitTab period={period} fmt={fmt} />
            <AgingInventoryTab fmt={fmt} />
          </>
        )}
        {activeTab === "shift" && (
          <CashierShiftsTab fmt={fmt} />
        )}
        {activeTab === "komisi" && (
          <TechnicianCommissionTab period={period} fmt={fmt} />
        )}
        {activeTab === "akuntansi" && (
          <div className="space-y-4">
            {/* Sub-tabs for accounting features */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex gap-2 overflow-x-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveSubTab("jurnal")}
                    className={activeSubTab === "jurnal" ? "bg-primary text-primary-foreground" : ""}
                  >
                    Jurnal Umum
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveSubTab("neracasaldo")}
                    className={activeSubTab === "neracasaldo" ? "bg-primary text-primary-foreground" : ""}
                  >
                    Neraca Saldo
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveSubTab("coa")}
                    className={activeSubTab === "coa" ? "bg-primary text-primary-foreground" : ""}
                  >
                    Bagan Akun
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveSubTab("asettetap")}
                    className={activeSubTab === "asettetap" ? "bg-primary text-primary-foreground" : ""}
                  >
                    Aset Tetap
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {activeSubTab === "jurnal" && <GeneralJournalTab period={period} fmt={fmt} />}
                {activeSubTab === "neracasaldo" && <TrialBalanceTable data={trialBalance} fmt={fmt} isLoading={!trialBalance} />}
                {activeSubTab === "coa" && <COATable />}
                {activeSubTab === "asettetap" && <FixedAssetsTable apiUrl={apiUrl} fmt={fmt} />}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Print Overlay / Portal */}
      {isPrinting && res && (
        <PrintReportsPortal 
          data={res} 
          printType={printType} 
          setPrintType={setPrintType} 
          onClose={() => setIsPrinting(false)} 
          fmt={fmt} 
        />
      )}
    </div>
  )
}
