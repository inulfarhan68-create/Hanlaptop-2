import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react"

interface EquityChangesReportProps {
    data: any
    fmt: (v: number) => string
    isLoading: boolean
}

export function EquityChangesReport({ data, fmt, isLoading }: EquityChangesReportProps) {
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Laporan Perubahan Ekuitas
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
                        <DollarSign className="h-5 w-5" />
                        Laporan Perubahan Ekuitas
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

    const {
        openingEquity = 0,
        contributions = 0,
        withdrawals = 0,
        netIncome = 0,
        closingEquity = 0,
        period
    } = data

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Laporan Perubahan Ekuitas
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    Periode: {period?.month}/{period?.year}
                </p>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {/* Opening Equity */}
                    <div className="border-b pb-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm text-muted-foreground">Modal Awal</p>
                                <p className="text-xs text-muted-foreground">Saldo ekuitas awal periode</p>
                            </div>
                            <p className="text-lg font-semibold">{fmt(openingEquity)}</p>
                        </div>
                    </div>

                    {/* Add: Net Income */}
                    <div className="border-b pb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-4 w-4 text-emerald-600" />
                            <span className="text-sm font-medium text-emerald-600">Penambah:</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm">Laba Tahun Berjalan</p>
                                <p className="text-xs text-muted-foreground">Laba bersih periode ini</p>
                            </div>
                            <p className="text-lg font-semibold text-emerald-600">+{fmt(netIncome)}</p>
                        </div>
                        {contributions > 0 && (
                            <div className="flex justify-between items-center mt-2">
                                <div>
                                    <p className="text-sm">Setoran Modal</p>
                                    <p className="text-xs text-muted-foreground">Setoran pemilik</p>
                                </div>
                                <p className="text-lg font-semibold text-emerald-600">+{fmt(contributions)}</p>
                            </div>
                        )}
                    </div>

                    {/* Less: Withdrawals */}
                    {withdrawals > 0 && (
                        <div className="border-b pb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingDown className="h-4 w-4 text-red-600" />
                                <span className="text-sm font-medium text-red-600">Pengurang:</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-sm">Prive / Penarikan</p>
                                    <p className="text-xs text-muted-foreground">Penarikan oleh pemilik</p>
                                </div>
                                <p className="text-lg font-semibold text-red-600">-{fmt(withdrawals)}</p>
                            </div>
                        </div>
                    )}

                    {/* Closing Equity */}
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-bold">Modal Akhir</p>
                                <p className="text-xs text-muted-foreground">Saldo ekuitas akhir periode</p>
                            </div>
                            <p className="text-2xl font-bold text-blue-600">{fmt(closingEquity)}</p>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="text-center text-sm text-muted-foreground">
                        <p>Modal Awal + Laba - Prive = Modal Akhir</p>
                        <p className="font-mono mt-1">
                            {fmt(openingEquity)} + {fmt(netIncome)} - {fmt(withdrawals)} = {fmt(closingEquity)}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
