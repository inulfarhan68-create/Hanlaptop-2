import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TrendingUp } from "lucide-react"

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

    const { sections = [], grossProfit = 0, operatingIncome = 0, netIncome = 0, period } = data

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
                        {sections.map((section: any, index: number) => (
                            <>
                                <TableRow key={`header-${index}`} className="bg-muted/30">
                                    <TableCell colSpan={2} className="font-bold text-primary">
                                        {section.name}
                                    </TableCell>
                                </TableRow>
                                {section.accounts.map((account: any) => (
                                    <TableRow key={account.code}>
                                        <TableCell className="pl-8 text-sm">
                                            {account.name}
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">
                                            {fmt(account.amount)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow key={`total-${index}`} className="bg-blue-50 dark:bg-blue-950/30">
                                    <TableCell className="font-semibold">
                                        Total {section.name}
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">
                                        {fmt(section.total)}
                                    </TableCell>
                                </TableRow>
                            </>
                        ))}

                        {/* Summary Rows */}
                        <TableRow className="bg-amber-50 dark:bg-amber-950/30 border-t-2 border-amber-200">
                            <TableCell className="font-bold">LABA KOTOR</TableCell>
                            <TableCell className="text-right font-bold text-lg">
                                {fmt(grossProfit)}
                            </TableCell>
                        </TableRow>

                        <TableRow className="bg-emerald-50 dark:bg-emerald-950/30">
                            <TableCell className="font-bold">LABA OPERASIONAL</TableCell>
                            <TableCell className="text-right font-bold text-lg">
                                {fmt(operatingIncome)}
                            </TableCell>
                        </TableRow>

                        <TableRow className="bg-blue-100 dark:bg-blue-900/50 border-t-2 border-blue-300">
                            <TableCell className="font-bold text-lg">LABA BERSIH</TableCell>
                            <TableCell className={`text-right font-bold text-xl ${netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {fmt(netIncome)}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
