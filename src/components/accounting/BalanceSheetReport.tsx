import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Building2, CheckCircle, XCircle, Scale, ChevronDown, ChevronRight } from "lucide-react"
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
        <div className="mb-4 rounded-xl border border-border/50 overflow-hidden shadow-sm bg-white dark:bg-card">
            <div 
                className={`${bgClass} p-3 flex justify-between items-center cursor-pointer hover:opacity-90 transition-opacity`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className={`font-semibold flex items-center gap-2 ${colorClass}`}>
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    {title}
                </div>
                <div className={`font-bold ${colorClass}`}>
                    {fmt(total)}
                </div>
            </div>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Table>
                            <TableBody>
                                {accounts.map((account: any) => (
                                    <TableRow key={account.code} className="hover:bg-muted/30 border-b-border/30">
                                        <TableCell className="text-sm py-2 pl-4 text-muted-foreground">{account.name}</TableCell>
                                        <TableCell className="text-right py-2 pr-4 font-medium">{fmt(account.amount)}</TableCell>
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

    return (
        <Card className="border-none shadow-lg overflow-hidden bg-white/80 dark:bg-card/80 backdrop-blur-xl">
            <CardHeader className="border-b bg-muted/20 pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                            <Building2 className="h-6 w-6 text-primary" />
                            Neraca Keuangan
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            Posisi Keuangan Per: {period?.month}/{period?.year}
                        </p>
                    </div>
                    <Badge variant={isBalanced ? "default" : "destructive"} className={`gap-1.5 px-3 py-1 shadow-sm ${isBalanced ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 border-emerald-500/20' : ''}`}>
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
            <CardContent className="p-4 md:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
                    {/* LEFT COLUMN - ASSETS */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-5 w-1 bg-slate-400 dark:bg-slate-600 rounded-full" />
                            <h3 className="text-base font-bold tracking-tight text-slate-800 dark:text-slate-100">
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
                                bgClass="bg-slate-50 hover:bg-slate-100/70 dark:bg-slate-900/40 dark:hover:bg-slate-900/60"
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
                                bgClass="bg-slate-50 hover:bg-slate-100/70 dark:bg-slate-900/40 dark:hover:bg-slate-900/60"
                                defaultOpen={true}
                            />
                        )}

                        <div className="mt-6 bg-slate-900 dark:bg-slate-800 rounded-xl p-4 text-white flex justify-between items-center border border-slate-800 shadow-sm">
                            <span className="font-semibold text-slate-300 uppercase tracking-wider text-xs">Total Aset</span>
                            <span className="font-bold text-lg tabular-nums">{fmt(assets.total)}</span>
                        </div>
                    </div>

                    {/* RIGHT COLUMN - LIABILITIES & EQUITY */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-5 w-1 bg-slate-400 dark:bg-slate-600 rounded-full" />
                            <h3 className="text-base font-bold tracking-tight text-slate-800 dark:text-slate-100">
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
                                bgClass="bg-slate-50 hover:bg-slate-100/70 dark:bg-slate-900/40 dark:hover:bg-slate-900/60"
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
                                bgClass="bg-slate-50 hover:bg-slate-100/70 dark:bg-slate-900/40 dark:hover:bg-slate-900/60"
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
                                bgClass="bg-slate-50 hover:bg-slate-100/70 dark:bg-slate-900/40 dark:hover:bg-slate-900/60"
                                defaultOpen={true}
                            />
                        )}

                        <div className="mt-6 bg-slate-950 dark:bg-black rounded-xl p-4 text-white flex justify-between items-center border border-slate-900 shadow-sm">
                            <span className="font-semibold text-slate-300 uppercase tracking-wider text-xs w-1/2">Total Kewajiban & Ekuitas</span>
                            <span className="font-bold text-lg text-right tabular-nums">{fmt(totalLiabilitiesAndEquity)}</span>
                        </div>
                    </div>
                </div>

                {/* Accounting Equation Check */}
                {balanceEquation && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`mt-8 p-4 rounded-xl border ${balanceEquation.isBalanced ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50' : 'bg-rose-50/50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/50'}`}
                    >
                        <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6 text-sm font-medium">
                            <div className="flex flex-col items-center">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Aset</span>
                                <span className="font-bold text-lg">{fmt(balanceEquation.assets)}</span>
                            </div>
                            
                            <span className="text-2xl text-muted-foreground/50 font-light">=</span>
                            
                            <div className="flex flex-col items-center">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Kewajiban</span>
                                <span className="font-bold text-lg">{fmt(balanceEquation.liabilities)}</span>
                            </div>
                            
                            <span className="text-xl text-muted-foreground/50 font-light">+</span>
                            
                            <div className="flex flex-col items-center">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Ekuitas</span>
                                <span className="font-bold text-lg">{fmt(balanceEquation.equity)}</span>
                            </div>

                            <div className="hidden md:block ml-4 pl-6 border-l border-border/50">
                                <Scale className={`h-8 w-8 ${balanceEquation.isBalanced ? 'text-emerald-500' : 'text-rose-500'}`} />
                            </div>
                        </div>
                    </motion.div>
                )}
            </CardContent>
        </Card>
    )
}
