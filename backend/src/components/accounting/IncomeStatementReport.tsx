"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TrendingUp, ChevronRight, ChevronDown, CheckCircle, XCircle, AlertTriangle, PieChart as PieChartIcon, Activity } from "lucide-react"
import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts'

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
                className={`${bgClass} cursor-pointer transition-colors duration-200 border-none group`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <TableCell colSpan={2} className={`font-bold py-2.5 px-4 ${colorClass}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs">
                            {isOpen ? <ChevronDown className="h-4 w-4 opacity-70" /> : <ChevronRight className="h-4 w-4 opacity-70" />}
                            <span className="uppercase tracking-wider font-extrabold">{title}</span>
                        </div>
                        <div className="text-right text-xs font-black tabular-nums tracking-tight">
                            {isNegative ? `(${fmt(Math.abs(total))})` : fmt(total)}
                        </div>
                    </div>
                </TableCell>
            </TableRow>
            <AnimatePresence>
                {isOpen && accounts.map((account: any, idx: number) => (
                    <motion.tr
                        key={account.code}
                        initial={{ opacity: 0, height: 0, y: -5 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -5 }}
                        transition={{ duration: 0.2, delay: idx * 0.02 }}
                        className="bg-transparent border-b border-slate-100/50 dark:border-slate-800/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                        <TableCell className="pl-10 py-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                            {account.name}
                        </TableCell>
                        <TableCell className="text-right py-1.5 pr-4 text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
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
            <Card className="border-none shadow-2xl bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-800 dark:text-slate-100">
                        <TrendingUp className="h-6 w-6 text-indigo-500 animate-pulse" />
                        Laporan Laba Rugi
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-20 space-y-5">
                        <div className="relative">
                            <div className="h-12 w-12 rounded-full border-4 border-indigo-100 dark:border-indigo-900/50"></div>
                            <div className="absolute top-0 left-0 h-12 w-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
                        </div>
                        <div className="text-slate-500 font-medium animate-pulse">Menghitung matriks keuangan...</div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!data) {
        return (
            <Card className="border-none shadow-md bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl">
                <CardContent>
                    <div className="text-center py-10 text-slate-500">Gagal memuat data</div>
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
    const opexRatio = revenue > 0 ? ((opex / revenue) * 100) : 0
    const cogsRatio = revenue > 0 ? ((cogs / revenue) * 100) : 0

    // Opex Data for Chart
    const opexChartData = useMemo(() => {
        const flatAccounts = opexSections.flatMap((s: any) => s.accounts);
        const sorted = flatAccounts.sort((a: any, b: any) => b.amount - a.amount);
        const top5 = sorted.slice(0, 5);
        const others = sorted.slice(5);
        
        const chartData = top5.map((acc: any) => ({
            name: acc.name.replace('Beban ', ''),
            value: acc.amount
        }));
        
        if (others.length > 0) {
            const othersTotal = others.reduce((sum: number, acc: any) => sum + acc.amount, 0);
            chartData.push({ name: 'Lainnya', value: othersTotal });
        }
        
        return chartData.filter((d: any) => d.value > 0);
    }, [opexSections]);
    
    const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#64748b'];

    // Waterfall Progress
    const totalRev = revenue > 0 ? revenue : 1; 
    const cogsPct = Math.min((cogs / totalRev) * 100, 100);
    const opexPct = Math.min((opex / totalRev) * 100, 100);
    const netIncomePct = netIncome > 0 ? ((netIncome / totalRev) * 100) : 0;

    const getSuggestions = () => {
        const list = []
        if (netMargin > 15) {
            list.push({
                type: "success",
                icon: <CheckCircle className="h-4 w-4 text-emerald-500" />,
                title: "Efisiensi Super",
                desc: "Margin bersih >15%. Bisnis Anda mencetak profit yang sangat sehat."
            })
        } else if (netMargin > 0 && netMargin < 5) {
            list.push({
                type: "warning",
                icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
                title: "Margin Menipis",
                desc: "Profitabilitas di bawah 5%. Anda mungkin perlu meninjau HPP atau memangkas Opex."
            })
        } else if (netIncome < 0) {
            list.push({
                type: "danger",
                icon: <XCircle className="h-4 w-4 text-rose-500" />,
                title: "Terjadi Defisit",
                desc: "Perusahaan merugi bulan ini. Segera evaluasi strategi penjualan dan pengeluaran."
            })
        }

        if (opexRatio > 35) {
            list.push({
                type: "warning",
                icon: <Activity className="h-4 w-4 text-amber-500" />,
                title: "Beban Operasional Tinggi",
                desc: "Lebih dari 35% omzet Anda habis untuk operasional harian. Periksa grafik Opex."
            })
        }
        return list
    }
    const suggestions = getSuggestions()

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <Card className="border border-white/20 dark:border-slate-800 shadow-2xl overflow-hidden bg-white/70 dark:bg-slate-950/70 backdrop-blur-2xl">
                <CardHeader className="border-b border-slate-200/50 dark:border-slate-800/50 pb-4 bg-gradient-to-br from-white/50 to-slate-50/50 dark:from-slate-900/50 dark:to-slate-950/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100">
                                <TrendingUp className="h-6 w-6 text-indigo-500" />
                                Laporan Laba Rugi
                            </CardTitle>
                            <p className="text-xs text-slate-500 mt-1 font-semibold flex items-center gap-1.5 uppercase tracking-widest">
                                Periode Terkonsolidasi: <Badge variant="secondary" className="font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 py-0.5 px-2">{period?.month}/{period?.year}</Badge>
                            </p>
                        </div>
                        <Badge variant={netIncome >= 0 ? "default" : "destructive"} className={`gap-1.5 px-3 py-1 shadow-sm text-xs font-bold border ${netIncome >= 0 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'}`}>
                            {netIncome >= 0 ? (
                                <>
                                    <CheckCircle className="h-4 w-4" />
                                    Profitabilitas Surplus
                                </>
                            ) : (
                                <>
                                    <XCircle className="h-4 w-4" />
                                    Defisit Operasional
                                </>
                            )}
                        </Badge>
                    </div>
                </CardHeader>
                
                <CardContent className="p-0 relative space-y-0">
                    {/* TOP SECTION: KPI Cards + Chart */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
                        {/* LEFT: KPIs */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* The Profit Waterfall (Progress Bar) */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <span className="text-[11px] uppercase font-bold tracking-wider text-slate-500">Distribusi Omzet (Profit Waterfall)</span>
                                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{fmt(revenue)}</span>
                                </div>
                                <div className="h-4 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden flex shadow-inner">
                                    {/* COGS Segment */}
                                    <motion.div 
                                        initial={{ width: 0 }} 
                                        animate={{ width: `${cogsPct}%` }} 
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className="h-full bg-rose-400 dark:bg-rose-500 relative group"
                                        title={`COGS: ${cogsPct.toFixed(1)}%`}
                                    />
                                    {/* OPEX Segment */}
                                    <motion.div 
                                        initial={{ width: 0 }} 
                                        animate={{ width: `${opexPct}%` }} 
                                        transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                                        className="h-full bg-amber-400 dark:bg-amber-500 relative group"
                                        title={`Opex: ${opexPct.toFixed(1)}%`}
                                    />
                                    {/* Net Income Segment */}
                                    {netIncomePct > 0 && (
                                        <motion.div 
                                            initial={{ width: 0 }} 
                                            animate={{ width: `${netIncomePct}%` }} 
                                            transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
                                            className="h-full bg-emerald-400 dark:bg-emerald-500 relative group"
                                            title={`Profit: ${netIncomePct.toFixed(1)}%`}
                                        />
                                    )}
                                </div>
                                <div className="flex justify-between text-[10px] font-semibold text-slate-500 pt-1">
                                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-400"></div> HPP ({cogsPct.toFixed(1)}%)</div>
                                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400"></div> Opex ({opexPct.toFixed(1)}%)</div>
                                    {netIncomePct > 0 && <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400"></div> Laba Bersih ({netIncomePct.toFixed(1)}%)</div>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { label: 'Gross Margin', value: grossMargin.toFixed(1) + '%', color: 'text-indigo-600 dark:text-indigo-400' },
                                    { label: 'Net Margin', value: netMargin.toFixed(1) + '%', color: netMargin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600' },
                                    { label: 'Opex Ratio', value: opexRatio.toFixed(1) + '%', color: opexRatio > 35 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300' },
                                    { label: 'COGS Ratio', value: cogsRatio.toFixed(1) + '%', color: 'text-rose-500' }
                                ].map((kpi, i) => (
                                    <motion.div 
                                        key={i}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="p-4 rounded-xl border border-white/40 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/40 backdrop-blur-md shadow-sm hover:shadow-md transition-shadow"
                                    >
                                        <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{kpi.label}</span>
                                        <div className={`text-xl font-black mt-1 tracking-tight ${kpi.color}`}>{kpi.value}</div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Suggestions */}
                            {suggestions.length > 0 && (
                                <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/30 dark:bg-indigo-900/10 backdrop-blur-md text-xs">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                                        <PieChartIcon className="w-3.5 h-3.5 text-indigo-500" />
                                        Insight AI Finansial
                                    </h4>
                                    <div className="space-y-2">
                                        {suggestions.map((s, idx) => (
                                            <motion.div 
                                                initial={{ x: -10, opacity: 0 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                transition={{ delay: 0.3 + (idx * 0.1) }}
                                                key={idx} 
                                                className="flex items-start gap-2 bg-white/60 dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/50 shadow-sm"
                                            >
                                                <div className="mt-0.5">{s.icon}</div>
                                                <div>
                                                    <span className="font-bold text-slate-800 dark:text-slate-200">{s.title}:</span> <span className="text-slate-600 dark:text-slate-400 font-medium">{s.desc}</span>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* RIGHT: OPEX Donut Chart */}
                        {opexChartData.length > 0 && (
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5 }}
                                className="h-[280px] lg:h-full min-h-[250px] p-4 rounded-xl border border-white/40 dark:border-slate-800/60 bg-white/30 dark:bg-slate-900/20 backdrop-blur-md shadow-sm flex flex-col"
                            >
                                <span className="text-[11px] text-slate-500 uppercase font-black tracking-widest text-center">Distribusi Beban Operasional</span>
                                <div className="flex-1 w-full min-h-0 mt-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={opexChartData}
                                                cx="50%"
                                                cy="45%"
                                                innerRadius={50}
                                                outerRadius={75}
                                                paddingAngle={3}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {opexChartData.map((_entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip 
                                                formatter={(value: any) => fmt(Number(value))}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)' }}
                                                itemStyle={{ fontWeight: 700, fontSize: '13px' }}
                                            />
                                            <Legend 
                                                verticalAlign="bottom" 
                                                height={36} 
                                                iconType="circle"
                                                wrapperStyle={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* MAIN TABLE SECTION */}
                    <div className="border-t border-slate-200/50 dark:border-slate-800/50 bg-white dark:bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent bg-slate-50/50 dark:bg-slate-900/30">
                                    <TableHead className="w-[65%] font-black text-slate-400 uppercase text-[10px] tracking-widest py-3 px-5">Rekening Akuntansi</TableHead>
                                    <TableHead className="text-right font-black text-slate-400 uppercase text-[10px] tracking-widest py-3 px-5">Nilai Moneter (IDR)</TableHead>
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
                                        colorClass="text-slate-800 dark:text-slate-100"
                                        bgClass="bg-indigo-50/30 hover:bg-indigo-50/80 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30"
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
                                        colorClass="text-rose-700 dark:text-rose-400"
                                        bgClass="bg-rose-50/30 hover:bg-rose-50/80 dark:bg-rose-950/10 dark:hover:bg-rose-900/20"
                                        isNegative={true}
                                    />
                                )}

                                {/* LABA KOTOR */}
                                <TableRow className="bg-slate-100/80 dark:bg-slate-900/80 border-l-4 border-indigo-500 shadow-sm">
                                    <TableCell className="font-black text-slate-900 dark:text-slate-100 py-3.5 pl-4 text-xs tracking-wide">
                                        LABA KOTOR (GROSS PROFIT)
                                    </TableCell>
                                    <TableCell className="text-right font-black text-sm text-indigo-700 dark:text-indigo-400 py-3.5 pr-5 tabular-nums">
                                        {fmt(grossProfit)}
                                    </TableCell>
                                </TableRow>

                                {/* BEBAN OPERASIONAL */}
                                {opexSections.length > 0 && (
                                    <CollapsibleSection 
                                        title="TOTAL BEBAN OPERASIONAL"
                                        accounts={opexSections.flatMap((s: any) => s.accounts)}
                                        total={opex}
                                        fmt={fmt}
                                        colorClass="text-amber-700 dark:text-amber-400"
                                        bgClass="bg-amber-50/30 hover:bg-amber-50/80 dark:bg-amber-950/10 dark:hover:bg-amber-900/20"
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
                                        colorClass="text-slate-700 dark:text-slate-300"
                                        bgClass="bg-slate-50/50 hover:bg-slate-100/80 dark:bg-slate-900/30 dark:hover:bg-slate-800/50"
                                    />
                                )}

                                {/* LABA OPERASIONAL */}
                                <TableRow className="bg-slate-50 dark:bg-slate-900/40">
                                    <TableCell className="font-bold text-slate-700 dark:text-slate-300 py-3 text-xs pl-5">
                                        LABA OPERASIONAL
                                    </TableCell>
                                    <TableCell className="text-right font-black text-xs text-slate-700 dark:text-slate-300 py-3 pr-5 tabular-nums">
                                        {fmt(operatingIncome)}
                                    </TableCell>
                                </TableRow>

                                {/* LABA SEBELUM PAJAK */}
                                {tax > 0 && (
                                    <TableRow className="bg-slate-100/40 dark:bg-slate-900/20">
                                        <TableCell className="font-semibold text-slate-600 dark:text-slate-400 py-3 text-xs pl-5">Laba Sebelum Pajak</TableCell>
                                        <TableCell className="text-right font-bold text-xs text-slate-600 dark:text-slate-400 py-3 pr-5 tabular-nums">
                                            {fmt(incomeBeforeTax)}
                                        </TableCell>
                                    </TableRow>
                                )}

                                {/* LABA BERSIH */}
                                <TableRow className="bg-slate-800 dark:bg-slate-950 border-none">
                                    <TableCell className="font-black text-white py-4 pl-5 rounded-bl-xl text-sm tracking-widest">
                                        LABA BERSIH (NET INCOME)
                                    </TableCell>
                                    <TableCell className={`text-right font-black text-lg py-4 pr-5 rounded-br-xl tabular-nums ${netIncome >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {fmt(netIncome)}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}
