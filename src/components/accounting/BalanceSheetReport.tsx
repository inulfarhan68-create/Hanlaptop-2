import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Building2, CheckCircle, XCircle, ChevronRight, ChevronDown } from "lucide-react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface BalanceSheetReportProps {
    data: any
    fmt: (v: number) => string
    isLoading: boolean
}

const CollapsibleList = ({ 
    title, 
    accounts, 
    total, 
    fmt, 
    colorClass, 
    bgClass,
    defaultOpen = false
}: { 
    title: string, 
    accounts: any[], 
    total: number, 
    fmt: any, 
    colorClass: string, 
    bgClass: string,
    defaultOpen?: boolean
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="mb-2 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-none bg-white dark:bg-card">
            <div 
                className={`${bgClass} py-2 px-3 flex justify-between items-center cursor-pointer`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className={`font-semibold flex items-center gap-1.5 text-xs ${colorClass}`}>
                    {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    {title}
                </div>
                <div className={`font-bold text-xs ${colorClass}`}>
                    {fmt(total)}
                </div>
            </div>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        <Table>
                            <TableBody>
                                {accounts.map((account: any) => (
                                    <TableRow key={account.code} className="hover:bg-slate-50 dark:hover:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                                        <TableCell className="text-xs py-1.5 pl-6 text-slate-500">{account.name}</TableCell>
                                        <TableCell className="text-right py-1.5 pr-4 text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">{fmt(account.amount)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export function BalanceSheetReport({ data, fmt, isLoading }: BalanceSheetReportProps) {
    if (isLoading) {
        return (
            <Card className="border-none shadow-md bg-white/50 dark:bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
                        <Building2 className="h-6 w-6 text-primary" />
                        Neraca (Balance Sheet)
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
        assets = { current: [], fixed: [], totalCurrent: 0, totalFixed: 0, total: 0 },
        liabilities = { current: [], longTerm: [], totalCurrent: 0, totalLongTerm: 0, total: 0 },
        equity = { accounts: [], total: 0, calculated: 0 },
        isBalanced = false,
        balanceEquation,
        period
    } = data

    const totalLiabilitiesAndEquity = liabilities.total + equity.total

    // calculations
    const currentRatio = liabilities.totalCurrent > 0 ? (assets.totalCurrent / liabilities.totalCurrent) : (assets.totalCurrent > 0 ? 99 : 0)
    const debtToEquity = equity.total > 0 ? (liabilities.total / equity.total) : (liabilities.total > 0 ? 99 : 0)
    const workingCapital = assets.totalCurrent - liabilities.totalCurrent

    const getSuggestions = () => {
        const list = []
        if (currentRatio > 2) {
            list.push({
                type: "success",
                title: "Likuiditas Kuat",
                desc: "Kas & Aset Lancar sangat mencukupi untuk melunasi kewajiban operasional jangka pendek."
            })
        } else if (currentRatio < 1.2) {
            list.push({
                type: "warning",
                title: "Tekanan Likuiditas",
                desc: "Aset lancar tipis dibanding utang lancar. Disarankan mempercepat penagihan piutang toko."
            })
        }

        if (debtToEquity > 1.5) {
            list.push({
                type: "warning",
                title: "Struktur Utang Tinggi",
                desc: "Liabilitas cukup dominan terhadap ekuitas. Sebaiknya rem penambahan utang operasional baru."
            })
        } else {
            list.push({
                type: "success",
                title: "Solvabilitas Sehat",
                desc: "Struktur modal didominasi ekuitas mandiri, menjaga risiko kredit tetap berada di batas aman."
            })
        }
        return list
    }
    const suggestions = getSuggestions()

    return (
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-card">
            <CardHeader className="border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                        <CardTitle className="flex items-center gap-1.5 text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">
                            <Building2 className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                            Neraca Keuangan
                        </CardTitle>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium flex items-center gap-1">
                            Posisi Keuangan Per: <Badge variant="outline" className="font-semibold bg-slate-50/50 text-[10px] py-0 px-1.5">{period?.month}/{period?.year}</Badge>
                        </p>
                    </div>
                    <Badge variant={isBalanced ? "default" : "destructive"} className={`gap-1 px-2.5 py-0.5 shadow-none text-xs border ${isBalanced ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'}`}>
                        {isBalanced ? (
                            <>
                                <CheckCircle className="h-3.5 w-3.5" />
                                Neraca Seimbang
                            </>
                        ) : (
                            <>
                                <XCircle className="h-3.5 w-3.5" />
                                Tidak Seimbang (Selisih)
                            </>
                        )}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-4 relative space-y-4">
                {/* 1. Dashboard KPI Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative z-10">
                    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-center">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Rasio Lancar</span>
                        <div className="text-base font-bold text-slate-800 dark:text-slate-200 mt-0.5">{currentRatio.toFixed(2)}x</div>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-center">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Debt to Equity (D/E)</span>
                        <div className="text-base font-bold text-slate-800 dark:text-slate-200 mt-0.5">{debtToEquity.toFixed(2)}x</div>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-center">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Modal Kerja Neto</span>
                        <div className="text-base font-bold text-slate-800 dark:text-slate-200 mt-0.5">{fmt(workingCapital)}</div>
                    </div>
                </div>

                {/* 2. Saran & Insight Finansial */}
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 relative z-10 text-xs">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">Rekomendasi Analitis</h4>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5 space-y-1">
                        {suggestions.map((s, idx) => (
                            <div key={idx} className="flex items-start gap-1.5">
                                <span className="text-slate-400 font-bold">•</span>
                                <div>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">{s.title}:</span> {s.desc}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Main Tables Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4 relative z-10 pt-2 border-t border-slate-200 dark:border-slate-800">
                    {/* LEFT COLUMN - ASSETS */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 mb-2">
                            <div className="h-4 w-1 bg-slate-400 dark:bg-slate-600 rounded-full" />
                            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                ASET (AKTIVA)
                            </h3>
                        </div>

                        {assets.current.length > 0 && (
                            <CollapsibleList 
                                title="Aset Lancar"
                                accounts={assets.current}
                                total={assets.totalCurrent}
                                fmt={fmt}
                                colorClass="text-slate-800 dark:text-slate-200"
                                bgClass="bg-slate-50/70 hover:bg-slate-100/50 dark:bg-slate-900/40 dark:hover:bg-slate-900/60"
                                defaultOpen={true}
                            />
                        )}

                        {assets.fixed.length > 0 && (
                            <CollapsibleList 
                                title="Aset Tetap (Net)"
                                accounts={assets.fixed}
                                total={assets.totalFixed}
                                fmt={fmt}
                                colorClass="text-slate-800 dark:text-slate-200"
                                bgClass="bg-slate-50/70 hover:bg-slate-100/50 dark:bg-slate-900/40 dark:hover:bg-slate-900/60"
                                defaultOpen={true}
                            />
                        )}

                        <div className="mt-3 bg-slate-100 dark:bg-slate-900 rounded-lg p-3 text-slate-800 dark:text-slate-200 flex justify-between items-center border border-slate-200 dark:border-slate-800 shadow-none relative overflow-hidden group">
                            <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-xs z-10">
                                Total Aset
                            </span>
                            <span className="font-extrabold text-sm tabular-nums tracking-tight z-10">{fmt(assets.total)}</span>
                        </div>
                    </div>

                    {/* RIGHT COLUMN - LIABILITIES & EQUITY */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 mb-2">
                            <div className="h-4 w-1 bg-slate-400 dark:bg-slate-600 rounded-full" />
                            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                KEWAJIBAN & EKUITAS
                            </h3>
                        </div>

                        {liabilities.current.length > 0 && (
                            <CollapsibleList 
                                title="Utang Lancar"
                                accounts={liabilities.current}
                                total={liabilities.totalCurrent}
                                fmt={fmt}
                                colorClass="text-slate-800 dark:text-slate-200"
                                bgClass="bg-slate-50/70 hover:bg-slate-100/50 dark:bg-slate-900/40 dark:hover:bg-slate-900/60"
                                defaultOpen={true}
                            />
                        )}

                        {liabilities.longTerm.length > 0 && (
                            <CollapsibleList 
                                title="Utang Jangka Panjang"
                                accounts={liabilities.longTerm}
                                total={liabilities.totalLongTerm}
                                fmt={fmt}
                                colorClass="text-slate-800 dark:text-slate-200"
                                bgClass="bg-slate-50/70 hover:bg-slate-100/50 dark:bg-slate-900/40 dark:hover:bg-slate-900/60"
                                defaultOpen={true}
                            />
                        )}

                        {equity.accounts.length > 0 && (
                            <CollapsibleList 
                                title="Ekuitas (Modal)"
                                accounts={equity.accounts}
                                total={equity.total}
                                fmt={fmt}
                                colorClass="text-slate-800 dark:text-slate-200"
                                bgClass="bg-slate-50/70 hover:bg-slate-100/50 dark:bg-slate-900/40 dark:hover:bg-slate-900/60"
                                defaultOpen={true}
                            />
                        )}

                        <div className="mt-3 bg-slate-100 dark:bg-slate-900 rounded-lg p-3 text-slate-800 dark:text-slate-200 flex justify-between items-center border border-slate-200 dark:border-slate-800 shadow-none relative overflow-hidden group">
                            <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-xs z-10">
                                Total Kewajiban & Ekuitas
                            </span>
                            <span className="font-extrabold text-sm tabular-nums tracking-tight z-10 text-right">{fmt(totalLiabilitiesAndEquity)}</span>
                        </div>
                    </div>
                </div>

                {/* Accounting Equation Check */}
                {balanceEquation && (
                    <div 
                        className={`mt-4 p-3 rounded-lg border text-xs font-semibold bg-slate-50 dark:bg-slate-900/50 ${
                            balanceEquation.isBalanced ? 'border-slate-200' : 'border-rose-200'
                        }`}
                    >
                        <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4">
                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-500 uppercase text-[10px]">Aset:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{fmt(balanceEquation.assets)}</span>
                            </div>
                            
                            <span className="text-slate-400 hidden md:block">=</span>
                            
                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-500 uppercase text-[10px]">Kewajiban:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{fmt(balanceEquation.liabilities)}</span>
                            </div>
                            
                            <span className="text-slate-400 hidden md:block">+</span>
                            
                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-500 uppercase text-[10px]">Ekuitas:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{fmt(balanceEquation.equity)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
