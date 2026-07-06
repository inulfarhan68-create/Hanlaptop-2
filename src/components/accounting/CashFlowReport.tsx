import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Wallet, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown } from "lucide-react"

interface CashFlowReportProps {
    data: any
    fmt: (v: number) => string
    isLoading: boolean
}

export function CashFlowReport({ data, fmt, isLoading }: CashFlowReportProps) {
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Wallet className="h-5 w-5" />
                        Laporan Arus Kas
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-10 text-muted-foreground">Memuat...</div>
                </CardContent>
            </Card>
        )
    }

    if (!data) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Wallet className="h-5 w-5" />
                        Laporan Arus Kas
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-10 text-muted-foreground">
                        Gagal memuat data
                    </div>
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

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Laporan Arus Kas
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    Periode: {period?.month}/{period?.year}
                </p>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-3 gap-6">
                    {/* Operating Activities */}
                    <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="h-5 w-5 text-emerald-600" />
                            <h3 className="font-semibold text-sm">Arus Kas Operasi</h3>
                        </div>
                                                    <TableBody>
                                {operating.items?.map((item: any, index: number) => (
                                    <TableRow key={index}>
                                        <TableCell className="text-xs py-1">{item.description}</TableCell>
                                        <TableCell className={`text-right py-1 ${item.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {item.amount >= 0 ? '+' : ''}{fmt(item.amount)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!operating.items?.length && (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center text-muted-foreground py-4">
                                            Tidak ada aktivitas
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
                            <span className="text-sm">Total</span>
                            <span className={operating.total >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                {operating.total >= 0 ? '+' : ''}{fmt(operating.total)}
                            </span>
                        </div>
                    </div>

                    {/* Investing Activities */}
                    <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <ArrowDownRight className="h-5 w-5 text-blue-600" />
                            <h3 className="font-semibold text-sm">Arus Kas Investasi</h3>
                        </div>
                                                    <TableBody>
                                {investing.items?.map((item: any, index: number) => (
                                    <TableRow key={index}>
                                        <TableCell className="text-xs py-1">{item.description}</TableCell>
                                        <TableCell className={`text-right py-1 ${item.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {item.amount >= 0 ? '+' : ''}{fmt(item.amount)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!investing.items?.length && (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center text-muted-foreground py-4">
                                            Tidak ada aktivitas
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
                            <span className="text-sm">Total</span>
                            <span className={investing.total >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                {investing.total >= 0 ? '+' : ''}{fmt(investing.total)}
                            </span>
                        </div>
                    </div>

                    {/* Financing Activities */}
                    <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <ArrowUpRight className="h-5 w-5 text-purple-600" />
                            <h3 className="font-semibold text-sm">Arus Kas Pendanaan</h3>
                        </div>
                                                    <TableBody>
                                {financing.items?.map((item: any, index: number) => (
                                    <TableRow key={index}>
                                        <TableCell className="text-xs py-1">{item.description}</TableCell>
                                        <TableCell className={`text-right py-1 ${item.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {item.amount >= 0 ? '+' : ''}{fmt(item.amount)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!financing.items?.length && (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center text-muted-foreground py-4">
                                            Tidak ada aktivitas
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
                            <span className="text-sm">Total</span>
                            <span className={financing.total >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                {financing.total >= 0 ? '+' : ''}{fmt(financing.total)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Summary */}
                <div className="mt-6 bg-muted/50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm">Kas dan Setara Kas Awal</span>
                        <span className="font-semibold">{fmt(openingCash)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm">Perubahan Kas Neto</span>
                        <span className={`font-semibold ${netChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {netChange >= 0 ? '+' : ''}{fmt(netChange)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-3">
                        <span className="font-bold">Kas dan Setara Kas Akhir</span>
                        <span className="font-bold text-lg text-blue-600">{fmt(closingCash)}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
