"use client";

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUserRole } from "@/hooks/useUserRole"
import { useSession } from "@/lib/auth-client"
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
import useSWR, { mutate } from "swr"
import * as XLSX from "xlsx"
import { syncChannel, type SyncEventPayload } from "@/lib/broadcast"
import { TrendingUp, Scale, Package, UserCheck, Wrench, BookOpen } from "lucide-react"

const fmt = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v)

export default function ReportsClient() {
  const { isOwner, isManager, isInvestor } = useUserRole()
  const { data: session, isPending } = useSession()
  const router = useRouter()
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

  // Gate on the session having loaded (a fresh Next load resolves the role
  // asynchronously; acting before it would bounce even an owner). Redirect via
  // effect, and let every hook below still run — only the final render is gated.
  const roleReady = !isPending && !!session
  const isDenied = roleReady && !isOwner && !isManager && !isInvestor
  useEffect(() => {
    if (isDenied) router.replace("/dashboard")
  }, [isDenied, router])

  const queryParams = new URLSearchParams()
  if (period.from) queryParams.append('from', period.from)
  if (period.to) queryParams.append('to', period.to)
  const q = queryParams.toString() ? `?${queryParams.toString()}` : ""

  const apiUrl = ''
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

  // Real-time synchronization for Reports
  useEffect(() => {
    const channel = syncChannel.getInstance();
    
    const handleMessage = (event: MessageEvent<SyncEventPayload>) => {
      // If a transaction, inventory, or service is updated, the reports might change
      if (event.data?.type === 'api.mutated' && 
         (event.data.route.includes('/transactions') || 
          event.data.route.includes('/inventory') || 
          event.data.route.includes('/services') ||
          event.data.route.includes('/payrolls') ||
          event.data.route.includes('/procurement'))) {
        
        // Revalidate report data
        mutate((key) => typeof key === 'string' && (
          key.includes('/api/reports') || 
          key.includes('/api/accounting/')
        ), undefined, { revalidate: true });
      }
    };
    
    channel.addEventListener('message', handleMessage);
    return () => channel.removeEventListener('message', handleMessage);
  }, []);

  const handleExportExcel = () => {
    if (!incomeStatement || !balanceSheet) return

    // 1. Profit & Loss Data (From Single Source of Truth)
    const pnlData: any[] = [];
    
    incomeStatement.sections.forEach((section: any) => {
        pnlData.push({ Kategori: section.name, Akun: "", Nilai: "" });
        section.accounts.forEach((acc: any) => {
            pnlData.push({ 
                Kategori: section.name, 
                Akun: acc.name, 
                Nilai: Math.round(acc.amount) 
            });
        });
        pnlData.push({ Kategori: `Total ${section.name}`, Akun: "", Nilai: Math.round(section.total) });
        pnlData.push({ Kategori: "", Akun: "", Nilai: "" }); // Empty row separator
    });

    pnlData.push({ Kategori: "Laba Kotor (Gross Profit)", Akun: "", Nilai: Math.round(incomeStatement.grossProfit) });
    pnlData.push({ Kategori: "Laba Operasional", Akun: "", Nilai: Math.round(incomeStatement.operatingIncome) });
    pnlData.push({ Kategori: "Laba Sebelum Pajak", Akun: "", Nilai: Math.round(incomeStatement.incomeBeforeTax) });
    pnlData.push({ Kategori: "Laba Bersih (Net Income)", Akun: "", Nilai: Math.round(incomeStatement.netIncome) });

    // 2. Balance Sheet Data (From Single Source of Truth)
    const balanceData: any[] = [];
    
    // Assets
    balanceData.push({ Kelompok: "ASET", Kategori: "Aset Lancar", Akun: "", Nilai: "" });
    balanceSheet.assets.current.forEach((acc: any) => {
        balanceData.push({ Kelompok: "ASET", Kategori: "Aset Lancar", Akun: acc.name, Nilai: Math.round(acc.amount) });
    });
    balanceData.push({ Kelompok: "ASET", Kategori: "Aset Tetap", Akun: "", Nilai: "" });
    balanceSheet.assets.fixed.forEach((acc: any) => {
        balanceData.push({ Kelompok: "ASET", Kategori: "Aset Tetap", Akun: acc.name, Nilai: Math.round(acc.amount) });
    });
    balanceData.push({ Kelompok: "TOTAL ASET", Kategori: "", Akun: "", Nilai: Math.round(balanceSheet.assets.total) });
    balanceData.push({ Kelompok: "", Kategori: "", Akun: "", Nilai: "" });

    // Liabilities
    balanceData.push({ Kelompok: "KEWAJIBAN", Kategori: "Kewajiban Lancar", Akun: "", Nilai: "" });
    balanceSheet.liabilities.current.forEach((acc: any) => {
        balanceData.push({ Kelompok: "KEWAJIBAN", Kategori: "Kewajiban Lancar", Akun: acc.name, Nilai: Math.round(acc.amount) });
    });
    balanceData.push({ Kelompok: "KEWAJIBAN", Kategori: "Kewajiban Jangka Panjang", Akun: "", Nilai: "" });
    balanceSheet.liabilities.longTerm.forEach((acc: any) => {
        balanceData.push({ Kelompok: "KEWAJIBAN", Kategori: "Kewajiban Jangka Panjang", Akun: acc.name, Nilai: Math.round(acc.amount) });
    });
    balanceData.push({ Kelompok: "TOTAL KEWAJIBAN", Kategori: "", Akun: "", Nilai: Math.round(balanceSheet.liabilities.total) });
    balanceData.push({ Kelompok: "", Kategori: "", Akun: "", Nilai: "" });

    // Equity
    balanceData.push({ Kelompok: "EKUITAS", Kategori: "Modal & Laba", Akun: "", Nilai: "" });
    balanceSheet.equity.accounts.forEach((acc: any) => {
        balanceData.push({ Kelompok: "EKUITAS", Kategori: "Modal & Laba", Akun: acc.name, Nilai: Math.round(acc.amount) });
    });
    balanceData.push({ Kelompok: "TOTAL EKUITAS", Kategori: "", Akun: "", Nilai: Math.round(balanceSheet.equity.total) });
    balanceData.push({ Kelompok: "", Kategori: "", Akun: "", Nilai: "" });

    balanceData.push({ Kelompok: "TOTAL KEWAJIBAN & EKUITAS", Kategori: "", Akun: "", Nilai: Math.round(balanceSheet.liabilities.total + balanceSheet.equity.total) });

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

  if (isDenied) {
    return null
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

      {/* Tabs Navigation - Clean Lucide icons instead of emojis */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-2 px-1 print:hidden scrollbar-none">
        <Button size="sm" variant={activeTab === "labarugi" ? "default" : "outline"} onClick={() => setActiveTab("labarugi")} className="rounded-full h-8 text-xs px-3 gap-1.5">
          <TrendingUp className="h-3.5 w-3.5" /> Laba Rugi
        </Button>
        <Button size="sm" variant={activeTab === "neraca" ? "default" : "outline"} onClick={() => setActiveTab("neraca")} className="rounded-full h-8 text-xs px-3 gap-1.5">
          <Scale className="h-3.5 w-3.5" /> Neraca & Kas
        </Button>
        <Button size="sm" variant={activeTab === "produk" ? "default" : "outline"} onClick={() => setActiveTab("produk")} className="rounded-full h-8 text-xs px-3 gap-1.5">
          <Package className="h-3.5 w-3.5" /> Produk
        </Button>
        <Button size="sm" variant={activeTab === "shift" ? "default" : "outline"} onClick={() => setActiveTab("shift")} className="rounded-full h-8 text-xs px-3 gap-1.5">
          <UserCheck className="h-3.5 w-3.5" /> Kasir
        </Button>
        <Button size="sm" variant={activeTab === "komisi" ? "default" : "outline"} onClick={() => setActiveTab("komisi")} className="rounded-full h-8 text-xs px-3 gap-1.5">
          <Wrench className="h-3.5 w-3.5" /> Teknisi
        </Button>
        <Button size="sm" variant={activeTab === "akuntansi" ? "default" : "outline"} onClick={() => setActiveTab("akuntansi")} className="rounded-full h-8 text-xs px-3 gap-1.5">
          <BookOpen className="h-3.5 w-3.5" /> Akuntansi
        </Button>
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
      {isPrinting && incomeStatement && balanceSheet && (
        <PrintReportsPortal 
          incomeStatement={incomeStatement}
          balanceSheet={balanceSheet}
          printType={printType} 
          setPrintType={setPrintType} 
          onClose={() => setIsPrinting(false)} 
          fmt={fmt} 
        />
      )}
    </div>
  )
}
