import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TrendingUp, Calculator, DollarSign, ChevronDown, ChevronRight, PieChart } from "lucide-react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface IncomeStatementReportProps {
    data: any
    fmt: (v: number) => string
    isLoading: boolean
}

const CollapsibleSection = ({ 
    title, 
    accounts, 
    total, 
    fmt, 
    colorClass, 
    bgClass, 
    defaultOpen = false,
    isNegative = false
}: { 
    title: string, 
    accounts: any[], 
    total: number, 
    fmt: any, 
    colorClass: string, 
    bgClass: string,
    defaultOpen?: boolean,
    isNegative?: boolean
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <>
            <TableRow 
                className={`${bgClass} cursor-pointer hover:opacity-90 transition-opacity`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <TableCell colSpan={2} className={`font-bold ${colorClass}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            {title}
                        </div>
                        <div className="text-right">
                            {isNegative ? `(${fmt(Math.abs(total))})` : fmt(total)}
                        </div>
                    </div>
                </TableCell>
            </TableRow>
            <AnimatePresence>
                {isOpen && accounts.map((account: any) => (
                    <motion.tr
                        key={account.code}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white dark:bg-card border-b border-border/50"
                    >
                        <TableCell className="pl-10 py-2 text-sm text-muted-foreground border-l-2 border-l-transparent">
                            {account.name}
                        </TableCell>
                        <TableCell className="text-right py-2 text-muted-foreground">
                            {isNegative || account.amount < 0 ? `(${fmt(Math.abs(account.amount))})` : fmt(account.amount)}
                        </TableCell>
                    </motion.tr>
                ))}
            </AnimatePresence>
        </>
    )
}

export function IncomeStatementReport({ data, fmt, isLoading }: IncomeStatementReportProps) {
    if (isLoading) {
        return (
            <Card className="border-none shadow-md bg-white/50 dark:bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
                        <TrendingUp className="h-6 w-6 text-primary" />
                        Laporan Laba Rugi
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-16 space-y-4">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        <div className="text-muted-foreground font-medium">Sinkronisasi data real-time...</div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!data) {
        return (
            <Card className="border-none shadow-md">
                <CardContent>
                    <div className="text-center py-10 text-muted-foreground">Gagal memuat data</div>
                </CardContent>
            </Card>
        )
    }

    const {
        sections = [],
        grossProfit = 0,
        operatingIncome = 0,
        netIncome = 0,
        revenue = 0,
        cogs = 0,
        opex = 0,
        incomeBeforeTax = 0,
        tax = 0,
        period
    } = data

    const revenueSection = sections.find((s: any) => s.name === 'PENDAPATAN')
    const cogsSection = sections.find((s: any) => s.name === 'HARGA POKOK PENJUALAN')
    const opexSections = sections.filter((s: any) => s.name.startsWith('Beban') && s.name !== 'Beban Pajak')
    const otherSection = sections.find((s: any) => s.name === 'PENDAPATAN DAN BEBAN LAINNYA')

    const grossMargin = revenue > 0 ? ((grossProfit / revenue) * 100) : 0
    const netMargin = revenue > 0 ? ((netIncome / revenue) * 100) : 0

    return (
        <Card className="border-none shadow-lg overflow-hidden bg-white/80 dark:bg-card/80 backdrop-blur-xl">
            <CardHeader className="border-b bg-muted/20 pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                            <TrendingUp className="h-6 w-6 text-primary" />
                            Laporan Laba Rugi
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            Periode Terkonsolidasi: {period?.month}/{period?.year}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
                            <PieChart className="h-3.5 w-3.5" /> Margin: {netMargin.toFixed(1)}%
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[70%] font-semibold text-muted-foreground uppercase text-xs tracking-wider">Kategori Akun</TableHead>
                            <TableHead className="text-right font-semibold text-muted-foreground uppercase text-xs tracking-wider">Nilai (IDR)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {/* PENDAPATAN */}
                        {revenueSection && (
                            <CollapsibleSection 
                                title={revenueSection.name}
                                accounts={revenueSection.accounts}
                                total={revenueSection.total}
                                fmt={fmt}
                                colorClass="text-slate-800 dark:text-slate-200"
                                bgClass="bg-slate-50 hover:bg-slate-100/70 dark:bg-slate-900/40 dark:hover:bg-slate-900/60"
                                defaultOpen={true}
                            />
                        )}

                        {/* HARGA POKOK PENJUALAN */}
                        {cogsSection && (
                            <CollapsibleSection 
                                title={cogsSection.name}
                                accounts={cogsSection.accounts}
                                total={cogsSection.total}
                                fmt={fmt}
                                colorClass="text-slate-800 dark:text-slate-200"
                                bgClass="bg-slate-50 hover:bg-slate-100/70 dark:bg-slate-900/40 dark:hover:bg-slate-900/60"
                                isNegative={true}
                            />
                        )}

                        {/* LABA KOTOR */}
                        <TableRow className="bg-slate-100/50 dark:bg-slate-900/60 border-l-4 border-slate-400 dark:border-slate-600">
                            <TableCell className="font-bold text-slate-800 dark:text-slate-200 py-4 pl-4">
                                <div className="flex items-center gap-2">
                                    <Calculator className="h-4.5 w-4.5 text-slate-500" />
                                    LABA KOTOR (GROSS PROFIT)
                                </div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-lg text-slate-900 dark:text-slate-100 py-4 pr-4 tabular-nums">
                                {fmt(grossProfit)}
                                <span className="block text-[10px] font-normal text-muted-foreground mt-0.5">
                                    Gross Margin: {grossMargin.toFixed(1)}%
                                </span>
                            </TableCell>
                        </TableRow>

                        {/* BEBAN OPERASIONAL (Merged into one collapsible for a cleaner look) */}
                        {opexSections.length > 0 && (
                            <CollapsibleSection 
                                title="TOTAL BEBAN OPERASIONAL"
                                accounts={opexSections.flatMap((s: any) => s.accounts)}
                                total={opex}
                                fmt={fmt}
                                colorClass="text-slate-800 dark:text-slate-200"
                                bgClass="bg-slate-50 hover:bg-slate-100/70 dark:bg-slate-900/40 dark:hover:bg-slate-900/60"
                                isNegative={true}
                            />
                        )}

                        {/* PENDAPATAN/BEBAN LAINNYA */}
                        {otherSection && otherSection.accounts.length > 0 && (
                            <CollapsibleSection 
                                title={otherSection.name}
                                accounts={otherSection.accounts}
                                total={otherSection.total}
                                fmt={fmt}
                                colorClass="text-slate-800 dark:text-slate-200"
                                bgClass="bg-slate-50 hover:bg-slate-100/70 dark:bg-slate-900/40 dark:hover:bg-slate-900/60"
                            />
                        )}

                        {/* LABA OPERASIONAL */}
                        <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                            <TableCell className="font-bold text-slate-700 dark:text-slate-300 py-3 pl-4">
                                LABA OPERASIONAL
                            </TableCell>
                            <TableCell className="text-right font-bold text-lg text-slate-700 dark:text-slate-300 py-3 pr-4">
                                {fmt(operatingIncome)}
                            </TableCell>
                        </TableRow>

                        {/* LABA SEBELUM PAJAK */}
                        {tax > 0 && (
                            <TableRow className="bg-amber-50/50 dark:bg-amber-900/20">
                                <TableCell className="font-semibold text-amber-700 dark:text-amber-400 py-3 pl-4">Laba Sebelum Pajak</TableCell>
                                <TableCell className="text-right font-semibold text-amber-600 py-3 pr-4">
                                    {fmt(incomeBeforeTax)}
                                </TableCell>
                            </TableRow>
                        )}

                        {/* LABA BERSIH */}
                        <TableRow className="bg-slate-900 dark:bg-slate-800 text-white border-none">
                            <TableCell className="font-bold text-base py-5 pl-4 rounded-bl-lg">
                                <div className="flex items-center gap-2">
                                    <DollarSign className="h-4.5 w-4.5 text-slate-400" />
                                    LABA BERSIH (NET INCOME)
                                </div>
                            </TableCell>
                            <TableCell className={`text-right font-bold text-lg py-5 pr-4 rounded-br-lg tabular-nums ${netIncome >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {fmt(netIncome)}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>

                {/* Micro-animations KPI Section */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 md:p-6 bg-muted/10">
                    {[
                        { label: "Gross Margin", val: grossMargin.toFixed(1) + "%", color: grossMargin >= 20 ? "text-emerald-600" : "text-amber-600" },
                        { label: "Net Margin", val: netMargin.toFixed(1) + "%", color: netMargin >= 10 ? "text-blue-600" : "text-amber-600" },
                        { label: "Rasio Beban", val: (revenue > 0 ? ((opex / revenue) * 100).toFixed(1) : "0.0") + "%", color: "text-rose-600" },
                        { label: "Rasio HPP", val: (revenue > 0 ? ((cogs / revenue) * 100).toFixed(1) : "0.0") + "%", color: "text-orange-600" }
                    ].map((kpi, i) => (
                        <motion.div 
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * i }}
                            className="text-center p-4 bg-white dark:bg-card border border-border/50 shadow-sm rounded-xl hover:shadow-md transition-shadow"
                        >
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{kpi.label}</p>
                            <p className={`text-xl font-black ${kpi.color}`}>{kpi.val}</p>
                        </motion.div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
