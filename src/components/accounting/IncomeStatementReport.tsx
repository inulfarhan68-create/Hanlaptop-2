import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TrendingUp, Calculator, DollarSign, Percent } from "lucide-react"

interface IncomeStatementReportProps {
    data: any
    fmt: (v: number) => string
    isLoading: boolean
}

export function IncomeStatementReport({ data, fmt, isLoading }: IncomeStatementReportProps) {
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Laporan Laba Rugi
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
                        <TrendingUp className="h-5 w-5" />
                        Laporan Laba Rugi
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
        sections = [],
        grossProfit = 0,
        operatingIncome = 0,
        netIncome = 0,
        revenue = 0,
        cogs = 0,
        opex = 0,
        otherIncome = 0,
        otherExpense = 0,
        incomeBeforeTax = 0,
        tax = 0,
        period
    } = data

    // Group sections for SAK format
    const revenueSection = sections.find((s: any) => s.name === 'PENDAPATAN')
    const cogsSection = sections.find((s: any) => s.name === 'HARGA POKOK PENJUALAN')
    const opexSections = sections.filter((s: any) =>
        s.name.startsWith('Beban') && s.name !== 'Beban Pajak'
    )
    const otherSection = sections.find((s: any) =>
        s.name === 'PENDAPATAN DAN BEBAN LAINNYA'
    )

    const grossMargin = revenue > 0 ? ((grossProfit / revenue) * 100) : 0
    const netMargin = revenue > 0 ? ((netIncome / revenue) * 100) : 0

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Laporan Laba Rugi
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    Periode: {period?.month}/{period?.year}
                </p>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead>Keterangan</TableHead>
                            <TableHead className="text-right">Jumlah</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {/* PENDAPATAN */}
                        {revenueSection && (
                            <>
                                <TableRow className="bg-blue-50 dark:bg-blue-950/30">
                                    <TableCell colSpan={2} className="font-bold text-blue-700 dark:text-blue-400">
                                        {revenueSection.name}
                                    </TableCell>
                                </TableRow>
                                {revenueSection.accounts.map((account: any) => (
                                    <TableRow key={account.code}>
                                        <TableCell className="pl-8 text-sm">
                                            {account.name}
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">
                                            {account.amount >= 0 ? fmt(account.amount) : `(${fmt(Math.abs(account.amount))})`}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="bg-blue-50 dark:bg-blue-950/30 border-t border-blue-200">
                                    <TableCell className="font-semibold">Total Pendapatan</TableCell>
                                    <TableCell className="text-right font-semibold">
                                        {fmt(revenueSection.total)}
                                    </TableCell>
                                </TableRow>
                            </>
                        )}

                        {/* HARGA POKOK PENJUALAN */}
                        {cogsSection && (
                            <>
                                <TableRow className="bg-orange-50 dark:bg-orange-950/30">
                                    <TableCell colSpan={2} className="font-bold text-orange-700 dark:text-orange-400">
                                        {cogsSection.name}
                                    </TableCell>
                                </TableRow>
                                {cogsSection.accounts.map((account: any) => (
                                    <TableRow key={account.code}>
                                        <TableCell className="pl-8 text-sm">
                                            {account.name}
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">
                                            ({fmt(account.amount)})
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="bg-orange-50 dark:bg-orange-950/30 border-t border-orange-200">
                                    <TableCell className="font-semibold">Total HPP</TableCell>
                                    <TableCell className="text-right font-semibold text-orange-600">
                                        ({fmt(cogsSection.total)})
                                    </TableCell>
                                </TableRow>
                            </>
                        )}

                        {/* LABA KOTOR */}
                        <TableRow className="bg-green-100 dark:bg-green-900/40 border-2 border-green-300 dark:border-green-700">
                            <TableCell className="font-bold text-green-800 dark:text-green-300">
                                <div className="flex items-center gap-2">
                                    <Calculator className="h-4 w-4" />
                                    LABA KOTOR (GROSS PROFIT)
                                </div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-lg text-green-700 dark:text-green-400">
                                {fmt(grossProfit)}
                                <span className="ml-2 text-xs font-normal text-green-600">
                                    ({grossMargin.toFixed(1)}%)
                                </span>
                            </TableCell>
                        </TableRow>

                        {/* BEBAN OPERASIONAL */}
                        {opexSections.length > 0 && (
                            <>
                                <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                                    <TableCell colSpan={2} className="font-bold text-gray-700 dark:text-gray-400">
                                        BEBAN OPERASIONAL
                                    </TableCell>
                                </TableRow>
                                {opexSections.map((section: any) => (
                                    <>
                                        {section.accounts.map((account: any) => (
                                            <TableRow key={account.code}>
                                                <TableCell className="pl-8 text-sm">
                                                    {account.name}
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground">
                                                    ({fmt(account.amount)})
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </>
                                ))}
                                <TableRow className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200">
                                    <TableCell className="font-semibold">Total Beban Operasional</TableCell>
                                    <TableCell className="text-right font-semibold text-gray-600">
                                        ({fmt(opex)})
                                    </TableCell>
                                </TableRow>
                            </>
                        )}

                        {/* PENDAPATAN/BEBAN LAINNYA */}
                        {otherSection && otherSection.accounts.length > 0 && (
                            <>
                                <TableRow className="bg-purple-50 dark:bg-purple-950/30">
                                    <TableCell colSpan={2} className="font-bold text-purple-700 dark:text-purple-400">
                                        {otherSection.name}
                                    </TableCell>
                                </TableRow>
                                {otherSection.accounts.map((account: any) => (
                                    <TableRow key={account.code}>
                                        <TableCell className="pl-8 text-sm">
                                            {account.name}
                                        </TableCell>
                                        <TableCell className={`text-right ${account.amount < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                            {account.amount >= 0 ? fmt(account.amount) : `(${fmt(Math.abs(account.amount))})`}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </>
                        )}

                        {/* LABA OPERASIONAL */}
                        <TableRow className="bg-teal-100 dark:bg-teal-900/40 border-2 border-teal-300 dark:border-teal-700">
                            <TableCell className="font-bold text-teal-800 dark:text-teal-300">
                                LABA OPERASIONAL
                            </TableCell>
                            <TableCell className="text-right font-bold text-lg text-teal-700 dark:text-teal-400">
                                {fmt(operatingIncome)}
                            </TableCell>
                        </TableRow>

                        {/* LABA SEBELUM PAJAK */}
                        {tax > 0 && (
                            <TableRow className="bg-amber-50 dark:bg-amber-950/30 border-t border-amber-200">
                                <TableCell className="font-semibold text-amber-700">Laba Sebelum Pajak</TableCell>
                                <TableCell className="text-right font-semibold text-amber-600">
                                    {fmt(incomeBeforeTax)}
                                </TableCell>
                            </TableRow>
                        )}

                        {/* LABA BERSIH */}
                        <TableRow className="bg-blue-600 dark:bg-blue-800 border-2 border-blue-700 dark:border-blue-900">
                            <TableCell className="font-bold text-lg text-white">
                                <div className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5" />
                                    LABA BERSIH (NET INCOME)
                                </div>
                            </TableCell>
                            <TableCell className={`text-right font-bold text-xl ${netIncome >= 0 ? 'text-white' : 'text-red-200'}`}>
                                {fmt(netIncome)}
                                <span className="ml-2 text-xs font-normal text-blue-200">
                                    ({netMargin.toFixed(1)}% margin)
                                </span>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>

                {/* Summary KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t">
                    <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                        <p className="text-xs text-muted-foreground">Gross Margin</p>
                        <p className={`text-lg font-bold ${grossMargin >= 20 ? 'text-green-600' : grossMargin >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {grossMargin.toFixed(1)}%
                        </p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                        <p className="text-xs text-muted-foreground">Net Margin</p>
                        <p className={`text-lg font-bold ${netMargin >= 10 ? 'text-blue-600' : netMargin >= 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {netMargin.toFixed(1)}%
                        </p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                        <p className="text-xs text-muted-foreground">Beban Operasional</p>
                        <p className="text-lg font-bold text-purple-600">
                            ({fmt(opex)})
                        </p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                        <p className="text-xs text-muted-foreground">HPP</p>
                        <p className="text-lg font-bold text-orange-600">
                            ({fmt(cogs)})
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
