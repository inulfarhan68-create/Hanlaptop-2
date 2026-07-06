import { useState, useMemo } from "react"
import { Navigate } from "react-router-dom"
import { useUserRole } from "@/hooks/useUserRole"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import useSWR from "swr"
import { cn } from "@/lib/utils"
import {
    Wallet, BookOpen, Scale, TrendingUp, TrendingDown, Building2,
    FileText, BarChart3, ChevronDown, ChevronRight,
    Calculator, Lock, Unlock, RefreshCw
} from "lucide-react"
import { COATable } from "@/components/accounting/COATable"
import { TrialBalanceTable } from "@/components/accounting/TrialBalanceTable"
import { IncomeStatementReport } from "@/components/accounting/IncomeStatementReport"
import { BalanceSheetReport } from "@/components/accounting/BalanceSheetReport"
import { CashFlowReport } from "@/components/accounting/CashFlowReport"
import { EquityChangesReport } from "@/components/accounting/EquityChangesReport"
import { FixedAssetsTable } from "@/components/accounting/FixedAssetsTable"
import { GeneralLedgerView } from "@/components/accounting/GeneralLedgerView"
import { DashboardKPIs } from "@/components/accounting/DashboardKPIs"

const fmt = (v: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v)

type TabType = "dashboard" | "coa" | "ledger" | "trial" | "income" | "balance" | "cashflow" | "equity" | "assets"

const TABS: { key: TabType; label: string; icon: any }[] = [
    { key: "dashboard", label: "Dashboard", icon: BarChart3 },
    { key: "coa", label: "Bagan Akun", icon: BookOpen },
    { key: "ledger", label: "Buku Besar", icon: FileText },
    { key: "trial", label: "Neraca Saldo", icon: Scale },
    { key: "income", label: "Laba Rugi", icon: TrendingUp },
    { key: "balance", label: "Neraca", icon: Building2 },
    { key: "cashflow", label: "Arus Kas", icon: Wallet },
    { key: "equity", label: "Perubahan Ekuitas", icon: TrendingDown },
    { key: "assets", label: "Aset Tetap", icon: Calculator },
]

export function FinancialManagement() {
    const { isOwner, isManager, isInvestor } = useUserRole()
    const [activeTab, setActiveTab] = useState<TabType>("dashboard")
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)

    if (!isOwner && !isManager && !isInvestor) {
        return <Navigate to="/dashboard" replace />
    }

    const apiUrl = import.meta.env.VITE_API_URL || ''
    const queryParams = `year=${selectedYear}&month=${selectedMonth}`

    // Fetch data based on active tab
    const { data: trialBalance } = useSWR(
        activeTab === "trial" ? `${apiUrl}/api/accounting/trial-balance?${queryParams}` : null,
        { keepPreviousData: true }
    )

    const { data: incomeStatement } = useSWR(
        activeTab === "income" ? `${apiUrl}/api/accounting/income-statement?${queryParams}` : null,
        { keepPreviousData: true }
    )

    const { data: balanceSheet } = useSWR(
        activeTab === "balance" ? `${apiUrl}/api/accounting/balance-sheet?${queryParams}` : null,
        { keepPreviousData: true }
    )

    const { data: cashFlow } = useSWR(
        activeTab === "cashflow" ? `${apiUrl}/api/accounting/cash-flow?${queryParams}` : null,
        { keepPreviousData: true }
    )

    const { data: equityChanges } = useSWR(
        activeTab === "equity" ? `${apiUrl}/api/accounting/equity-changes?${queryParams}` : null,
        { keepPreviousData: true }
    )

    return (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Sticky Page Header */}
            <div className="sticky top-0 z-40 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-1.5 md:gap-2 p-2 md:px-5 md:py-3 bg-white/80 dark:bg-card backdrop-blur-xl rounded-2xl md:rounded-[2rem] border border-border shadow-sm mt-0 mb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg md:text-xl font-bold tracking-tight leading-none">
                            Manajemen Keuangan
                        </h2>
                        <p className="text-muted-foreground mt-1 text-[9px] md:text-xs font-medium hidden md:block">
                            Chart of Accounts, Buku Besar, Laporan Keuangan
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto mt-1 md:mt-0">
                    {/* Period Selector */}
                    <div className="flex gap-1">
                        <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                            <SelectTrigger className="w-[100px] h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {["Januari", "Februari", "Maret", "April", "Mei", "Juni",
                                  "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((m, i) => (
                                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                            <SelectTrigger className="w-[90px] h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {[2024, 2025, 2026, 2027].map((y) => (
                                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <span className="text-xs text-muted-foreground">
                        {selectedMonth}/{selectedYear}
                    </span>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex gap-1 overflow-x-auto pb-1 mb-2 px-1 scrollbar-none">
                {TABS.map(({ key, label, icon: Icon }) => (
                    <Button
                        key={key}
                        size="sm"
                        variant={activeTab === key ? "default" : "outline"}
                        onClick={() => setActiveTab(key)}
                        className={cn(
                            "rounded-full h-8 text-xs px-3 whitespace-nowrap",
                            activeTab === key ? "bg-primary" : ""
                        )}
                    >
                        <Icon className="h-3 w-3 mr-1" />
                        <span className="hidden sm:inline">{label}</span>
                        <span className="sm:hidden">{label.split(" ")[0]}</span>
                    </Button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto space-y-3 px-1 pb-20 md:pb-4">
                {activeTab === "dashboard" && (
                    <DashboardKPIs
                        year={selectedYear}
                        month={selectedMonth}
                        apiUrl={apiUrl}
                        fmt={fmt}
                    />
                )}
                {activeTab === "coa" && (
                    <COATable />
                )}
                {activeTab === "ledger" && (
                    <GeneralLedgerView
                        year={selectedYear}
                        month={selectedMonth}
                        apiUrl={apiUrl}
                        fmt={fmt}
                    />
                )}
                {activeTab === "trial" && (
                    <TrialBalanceTable
                        data={trialBalance}
                        fmt={fmt}
                        isLoading={!trialBalance}
                    />
                )}
                {activeTab === "income" && (
                    <IncomeStatementReport
                        data={incomeStatement}
                        fmt={fmt}
                        isLoading={!incomeStatement}
                    />
                )}
                {activeTab === "balance" && (
                    <BalanceSheetReport
                        data={balanceSheet}
                        fmt={fmt}
                        isLoading={!balanceSheet}
                    />
                )}
                {activeTab === "cashflow" && (
                    <CashFlowReport
                        data={cashFlow}
                        fmt={fmt}
                        isLoading={!cashFlow}
                    />
                )}
                {activeTab === "equity" && (
                    <EquityChangesReport
                        data={equityChanges}
                        fmt={fmt}
                        isLoading={!equityChanges}
                    />
                )}
                {activeTab === "assets" && (
                    <FixedAssetsTable apiUrl={apiUrl} fmt={fmt} />
                )}
            </div>
        </div>
    )
}
