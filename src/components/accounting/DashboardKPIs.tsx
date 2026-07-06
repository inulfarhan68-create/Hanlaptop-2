import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Wallet, Receipt, FileText, Calculator } from "lucide-react"
import useSWR from "swr"

interface DashboardKPIsProps {
    year: number
    month: number
    apiUrl: string
    fmt: (v: number) => string
}

export function DashboardKPIs({ year, month, apiUrl, fmt }: DashboardKPIsProps) {
    const queryParams = `year=${year}&month=${month}`

    const { data: trialBalance } = useSWR(
        `${apiUrl}/api/accounting/trial-balance?${queryParams}`,
        { keepPreviousData: true }
    )

    const { data: incomeStatement } = useSWR(
        `${apiUrl}/api/accounting/income-statement?${queryParams}`,
        { keepPreviousData: true }
    )

    const { data: balanceSheet } = useSWR(
        `${apiUrl}/api/accounting/balance-sheet?${queryParams}`,
        { keepPreviousData: true }
    )

    const { data: cashFlow } = useSWR(
        `${apiUrl}/api/accounting/cash-flow?${queryParams}`,
        { keepPreviousData: true }
    )

    const netIncome = incomeStatement?.netIncome || 0
    const totalRevenue = incomeStatement?.sections
        ?.find((s: any) => s.name === 'Pendapatan')?.total || 0
    const totalExpenses = incomeStatement?.sections
        ?.reduce((sum: number, s: any) => sum + (s.total || 0), 0) || 0
    const totalAssets = balanceSheet?.assets?.total || 0
    const totalLiabilities = balanceSheet?.liabilities?.total || 0
    const totalEquity = balanceSheet?.equity?.total || 0
    const cashPosition = cashFlow?.closingCash || 0

    const kpis = [
        {
            title: "Total Pendapatan",
            value: fmt(totalRevenue),
            change: "+12%",
            positive: true,
            icon: TrendingUp,
            color: "text-emerald-600"
        },
        {
            title: "Total Beban",
            value: fmt(totalExpenses),
            change: "-5%",
            positive: false,
            icon: TrendingDown,
            color: "text-red-600"
        },
        {
            title: "Laba Bersih",
            value: fmt(netIncome),
            change: netIncome >= 0 ? "+8%" : "-15%",
            positive: netIncome >= 0,
            icon: FileText,
            color: netIncome >= 0 ? "text-emerald-600" : "text-red-600"
        },
        {
            title: "Posisi Kas",
            value: fmt(cashPosition),
            change: "+3%",
            positive: true,
            icon: Wallet,
            color: "text-blue-600"
        },
        {
            title: "Total Aset",
            value: fmt(totalAssets),
            change: "+2%",
            positive: true,
            icon: Calculator,
            color: "text-purple-600"
        },
        {
            title: "Total Liabilitas",
            value: fmt(totalLiabilities),
            change: "-1%",
            positive: false,
            icon: Receipt,
            color: "text-amber-600"
        }
    ]

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {kpis.map((kpi, index) => (
                    <Card key={index} className="border border-border/50 bg-white/60 dark:bg-card/60 backdrop-blur-md">
                        <CardContent className="p-3">
                            <div className="flex items-center justify-between mb-2">
                                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                                <span className={`text-[10px] font-medium ${kpi.positive ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {kpi.change}
                                </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mb-1">{kpi.title}</p>
                            <p className={`text-sm font-bold truncate ${kpi.color}`}>{kpi.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Ringkasan Neraca</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between items-center py-1 border-b">
                            <span className="text-xs text-muted-foreground">Total Aset</span>
                            <span className="text-sm font-semibold text-emerald-600">{fmt(totalAssets)}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b">
                            <span className="text-xs text-muted-foreground">Total Kewajiban</span>
                            <span className="text-sm font-semibold text-amber-600">{fmt(totalLiabilities)}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                            <span className="text-xs text-muted-foreground">Total Ekuitas</span>
                            <span className="text-sm font-semibold text-blue-600">{fmt(totalEquity)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                            <span className="text-xs font-medium">Status Neraca</span>
                            <span className={`text-xs font-bold ${balanceSheet?.isBalanced ? 'text-emerald-600' : 'text-red-600'}`}>
                                {balanceSheet?.isBalanced ? '✅ Seimbang' : '❌ Tidak Seimbang'}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Arus Kas Ringkasan</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between items-center py-1 border-b">
                            <span className="text-xs text-muted-foreground">Kas Awal</span>
                            <span className="text-sm font-semibold">{fmt(cashFlow?.openingCash || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b">
                            <span className="text-xs text-muted-foreground">Arus Masuk</span>
                            <span className="text-sm font-semibold text-emerald-600">
                                +{fmt(cashFlow?.operating?.total || 0)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b">
                            <span className="text-xs text-muted-foreground">Arus Keluar</span>
                            <span className="text-sm font-semibold text-red-600">
                                -{fmt(Math.abs(cashFlow?.operating?.total || 0) - (cashFlow?.netChange || 0))}
                            </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                            <span className="text-xs text-muted-foreground">Kas Akhir</span>
                            <span className="text-sm font-bold text-blue-600">{fmt(cashFlow?.closingCash || 0)}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
