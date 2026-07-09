import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Wallet } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"

interface CashFlowReportProps {
    data: any
    fmt: (v: number) => string
    isLoading: boolean
}

export function CashFlowReport({ data, fmt, isLoading }: CashFlowReportProps) {
    if (isLoading) {
        return (
            <Card className="border-none shadow-md bg-white/50 dark:bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
                        <Wallet className="h-6 w-6 text-primary" />
                        Laporan Arus Kas
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-16 space-y-4">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        <div className="text-muted-foreground font-medium">Sinkronisasi arus kas real-time...</div>
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

    const { operating = { items: [], total: 0 },
            investing = { items: [], total: 0 },
            financing = { items: [], total: 0 },
            netChange = 0,
            openingCash = 0,
            closingCash = 0,
            period } = data

    const getSuggestions = () => {
        const list = []
        if (netChange > 0) {
            list.push({
                type: "success",
                title: "Kas Bertambah",
                desc: "Arus kas bersih positif. Likuiditas meningkat, memudahkan pembiayaan inventori baru."
            })
        } else {
            list.push({
                type: "warning",
                title: "Kas Menurun",
                desc: "Arus kas bersih negatif pada periode ini. Tinjau kembali pengeluaran non-prioritas."
            })
        }

        if (operating.total < 0) {
            list.push({
                type: "danger",
                title: "Defisit Operasi",
                desc: "Kegiatan operasional utama membakar kas. Segera evaluasi margin keuntungan produk Anda."
            })
        }
        return list
    }
    const suggestions = getSuggestions()

    return (
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-card">
            <CardHeader className="border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 relative z-10">
                    <div>
                        <CardTitle className="flex items-center gap-1.5 text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">
                            <Wallet className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                            Laporan Arus Kas
                        </CardTitle>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium flex items-center gap-1">
                            Periode: <Badge variant="outline" className="font-semibold bg-slate-50/50 text-[10px] py-0 px-1.5">{period?.month}/{period?.year}</Badge>
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 relative space-y-4">
                {/* 1. Dashboard KPI Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative z-10">
                    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-center">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Arus Kas Operasional</span>
                        <div className="text-base font-bold text-slate-800 dark:text-slate-200 mt-0.5">{fmt(operating.total)}</div>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-center">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Perubahan Kas Neto</span>
                        <div className="text-base font-bold text-slate-800 dark:text-slate-200 mt-0.5">{fmt(netChange)}</div>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-center">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Saldo Kas Akhir</span>
                        <div className="text-base font-bold text-slate-800 dark:text-slate-200 mt-0.5">{fmt(closingCash)}</div>
                    </div>
                </div>

                {/* 2. Saran & Insight Finansial */}
                {suggestions.length > 0 && (
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
                )}

                {/* 3. Main Split Grid (Operating, Investing, Financing) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 relative z-10 pt-2 border-t border-slate-200 dark:border-slate-800">
                    {/* Operating Activities */}
                    <div className="bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-none relative group overflow-hidden">
                        <div className="flex items-center gap-1.5 mb-2">
                            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">Arus Kas Operasi</h3>
                        </div>
                        <div className="min-h-[120px]">
                            <Table>
                                <TableBody>
                                    {operating.items?.map((item: any, idx: number) => (
                                        <TableRow key={idx} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-100/30">
                                            <TableCell className="text-xs py-1.5 pl-1 text-slate-500">{item.description}</TableCell>
                                            <TableCell className="text-right py-1.5 pr-1 text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                                                {item.amount >= 0 ? '+' : ''}{fmt(item.amount)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {!operating.items?.length && (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center text-xs text-slate-400 py-8">
                                                Tidak ada aktivitas
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="border-t border-slate-200 dark:border-slate-800 mt-2 pt-2 flex justify-between font-bold text-xs">
                            <span className="text-slate-500 uppercase text-[10px] tracking-wider">Total</span>
                            <span className="text-slate-800 dark:text-slate-200">
                                {operating.total >= 0 ? '+' : ''}{fmt(operating.total)}
                            </span>
                        </div>
                    </div>

                    {/* Investing Activities */}
                    <div className="bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-none relative group overflow-hidden">
                        <div className="flex items-center gap-1.5 mb-2">
                            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">Arus Kas Investasi</h3>
                        </div>
                        <div className="min-h-[120px]">
                            <Table>
                                <TableBody>
                                    {investing.items?.map((item: any, idx: number) => (
                                        <TableRow key={idx} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-100/30">
                                            <TableCell className="text-xs py-1.5 pl-1 text-slate-500">{item.description}</TableCell>
                                            <TableCell className="text-right py-1.5 pr-1 text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                                                {item.amount >= 0 ? '+' : ''}{fmt(item.amount)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {!investing.items?.length && (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center text-xs text-slate-400 py-8">
                                                Tidak ada aktivitas
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="border-t border-slate-200 dark:border-slate-800 mt-2 pt-2 flex justify-between font-bold text-xs">
                            <span className="text-slate-500 uppercase text-[10px] tracking-wider">Total</span>
                            <span className="text-slate-800 dark:text-slate-200">
                                {investing.total >= 0 ? '+' : ''}{fmt(investing.total)}
                            </span>
                        </div>
                    </div>

                    {/* Financing Activities */}
                    <div className="bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-none relative group overflow-hidden">
                        <div className="flex items-center gap-1.5 mb-2">
                            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">Arus Kas Pendanaan</h3>
                        </div>
                        <div className="min-h-[120px]">
                            <Table>
                                <TableBody>
                                    {financing.items?.map((item: any, idx: number) => (
                                        <TableRow key={idx} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-100/30">
                                            <TableCell className="text-xs py-1.5 pl-1 text-slate-500">{item.description}</TableCell>
                                            <TableCell className="text-right py-1.5 pr-1 text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                                                {item.amount >= 0 ? '+' : ''}{fmt(item.amount)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {!financing.items?.length && (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center text-xs text-slate-400 py-8">
                                                Tidak ada aktivitas
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="border-t border-slate-200 dark:border-slate-800 mt-2 pt-2 flex justify-between font-bold text-xs">
                            <span className="text-slate-500 uppercase text-[10px] tracking-wider">Total</span>
                            <span className="text-slate-800 dark:text-slate-200">
                                {financing.total >= 0 ? '+' : ''}{fmt(financing.total)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Summary */}
                <div className="mt-4 bg-slate-50 dark:bg-slate-900 rounded-lg p-3.5 space-y-2 border border-slate-200 dark:border-slate-800 relative z-10">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 uppercase text-[10px] tracking-wider font-semibold">Kas dan Setara Kas Awal</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">{fmt(openingCash)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 uppercase text-[10px] tracking-wider font-semibold">Perubahan Kas Neto</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                            {netChange >= 0 ? '+' : ''}{fmt(netChange)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-800 pt-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <span className="uppercase text-[10px] tracking-wider font-bold">Kas dan Setara Kas Akhir</span>
                        <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 tabular-nums">{fmt(closingCash)}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
