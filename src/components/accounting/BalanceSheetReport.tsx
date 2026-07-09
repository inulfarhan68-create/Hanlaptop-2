import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Building2, CheckCircle, XCircle, Scale } from "lucide-react"

interface BalanceSheetReportProps {
    data: any
    fmt: (v: number) => string
    isLoading: boolean
}

export function BalanceSheetReport({ data, fmt, isLoading }: BalanceSheetReportProps) {
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Neraca (Balance Sheet)
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
                        <Building2 className="h-5 w-5" />
                        Neraca (Balance Sheet)
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
        assets = { current: [], fixed: [], totalCurrent: 0, totalFixed: 0, total: 0 },
        liabilities = { current: [], longTerm: [], totalCurrent: 0, totalLongTerm: 0, total: 0 },
        equity = { accounts: [], total: 0, calculated: 0 },
        isBalanced = false,
        balanceEquation,
        period
    } = data

    const totalLiabilitiesAndEquity = liabilities.total + equity.total

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Neraca (Balance Sheet)
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            Per {period?.month}/{period?.year}
                        </p>
                    </div>
                    <Badge variant={isBalanced ? "default" : "destructive"} className="gap-1">
                        {isBalanced ? (
                            <>
                                <CheckCircle className="h-3 w-3" />
                                Seimbang
                            </>
                        ) : (
                            <>
                                <XCircle className="h-3 w-3" />
                                Tidak Seimbang
                            </>
                        )}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* ASSETS */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-blue-600 mb-3 flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            ASET
                        </h3>

                        {/* Current Assets */}
                        {assets.current.length > 0 && (
                            <div className="bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-lg">
                                <h4 className="text-sm font-semibold mb-2 text-blue-700 dark:text-blue-400">Aset Lancar</h4>
                                <Table>
                                    <TableBody>
                                        {assets.current.map((account: any) => (
                                            <TableRow key={account.code}>
                                                <TableCell className="text-xs py-1 font-medium">{account.name}</TableCell>
                                                <TableCell className="text-right py-1">
                                                    {fmt(account.amount)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow className="border-t-2 border-blue-200">
                                            <TableCell className="text-xs py-1 font-semibold text-blue-600">Total Aset Lancar</TableCell>
                                            <TableCell className="text-right py-1 font-semibold text-blue-600">
                                                {fmt(assets.totalCurrent)}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {/* Fixed Assets */}
                        {assets.fixed.length > 0 && (
                            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-lg">
                                <h4 className="text-sm font-semibold mb-2 text-indigo-700 dark:text-indigo-400">Aset Tetap (Net)</h4>
                                <Table>
                                    <TableBody>
                                        {assets.fixed.map((account: any) => (
                                            <TableRow key={account.code}>
                                                <TableCell className="text-xs py-1 font-medium">{account.name}</TableCell>
                                                <TableCell className="text-right py-1">
                                                    {fmt(account.amount)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow className="border-t-2 border-indigo-200">
                                            <TableCell className="text-xs py-1 font-semibold text-indigo-600">Total Aset Tetap</TableCell>
                                            <TableCell className="text-right py-1 font-semibold text-indigo-600">
                                                {fmt(assets.totalFixed)}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {/* Total Assets */}
                        <div className="border-t-2 border-blue-400 pt-3 mt-4 bg-blue-100 dark:bg-blue-900/40 rounded-lg p-3">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-blue-700 dark:text-blue-300">TOTAL ASET</span>
                                <span className="font-bold text-xl text-blue-700 dark:text-blue-300">{fmt(assets.total)}</span>
                            </div>
                        </div>
                    </div>

                    {/* LIABILITIES & EQUITY */}
                    <div className="space-y-4">
                        {/* LIABILITIES */}
                        <h3 className="text-lg font-bold text-red-600 mb-3 flex items-center gap-2">
                            Kewajiban
                        </h3>

                        {/* Current Liabilities */}
                        {liabilities.current.length > 0 && (
                            <div className="bg-red-50/50 dark:bg-red-950/20 p-3 rounded-lg">
                                <h4 className="text-sm font-semibold mb-2 text-red-700 dark:text-red-400">Utang Lancar</h4>
                                <Table>
                                    <TableBody>
                                        {liabilities.current.map((account: any) => (
                                            <TableRow key={account.code}>
                                                <TableCell className="text-xs py-1 font-medium">{account.name}</TableCell>
                                                <TableCell className="text-right py-1">
                                                    {fmt(account.amount)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow className="border-t-2 border-red-200">
                                            <TableCell className="text-xs py-1 font-semibold text-red-600">Total Utang Lancar</TableCell>
                                            <TableCell className="text-right py-1 font-semibold text-red-600">
                                                {fmt(liabilities.totalCurrent)}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {/* Long Term Liabilities */}
                        {liabilities.longTerm.length > 0 && (
                            <div className="bg-orange-50/50 dark:bg-orange-950/20 p-3 rounded-lg">
                                <h4 className="text-sm font-semibold mb-2 text-orange-700 dark:text-orange-400">Utang Jangka Panjang</h4>
                                <Table>
                                    <TableBody>
                                        {liabilities.longTerm.map((account: any) => (
                                            <TableRow key={account.code}>
                                                <TableCell className="text-xs py-1 font-medium">{account.name}</TableCell>
                                                <TableCell className="text-right py-1">
                                                    {fmt(account.amount)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow className="border-t-2 border-orange-200">
                                            <TableCell className="text-xs py-1 font-semibold text-orange-600">Total Utang Jangka Panjang</TableCell>
                                            <TableCell className="text-right py-1 font-semibold text-orange-600">
                                                {fmt(liabilities.totalLongTerm)}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {/* Total Liabilities */}
                        <div className="border-t-2 border-red-400 pt-3 bg-red-100 dark:bg-red-900/40 rounded-lg p-3">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-red-700 dark:text-red-300">TOTAL KEWAJIBAN</span>
                                <span className="font-bold text-red-700 dark:text-red-300">{fmt(liabilities.total)}</span>
                            </div>
                        </div>

                        {/* EQUITY */}
                        <h3 className="text-lg font-bold text-green-600 mt-6 mb-3 flex items-center gap-2">
                            EKUITAS
                        </h3>

                        <div className="bg-green-50/50 dark:bg-green-950/20 p-3 rounded-lg">
                            <Table>
                                <TableBody>
                                    {equity.accounts.map((account: any) => (
                                        <TableRow key={account.code}>
                                            <TableCell className="text-xs py-1 font-medium">{account.name}</TableCell>
                                            <TableCell className="text-right py-1">
                                                {fmt(account.amount)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Total Equity */}
                        <div className="border-t-2 border-green-400 pt-3 bg-green-100 dark:bg-green-900/40 rounded-lg p-3">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-green-700 dark:text-green-300">TOTAL EKUITAS</span>
                                <span className="font-bold text-green-700 dark:text-green-300">{fmt(equity.total)}</span>
                            </div>
                        </div>

                        {/* Total Liabilities + Equity */}
                        <div className="border-t-2 border-blue-400 pt-3 mt-4 bg-blue-100 dark:bg-blue-900/40 rounded-lg p-3">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-blue-700 dark:text-blue-300">TOTAL KEWAJIBAN + EKUITAS</span>
                                <span className="font-bold text-xl text-blue-700 dark:text-blue-300">{fmt(totalLiabilitiesAndEquity)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Balance Equation Check */}
                {balanceEquation && (
                    <div className="mt-6 pt-4 border-t">
                        <div className="flex items-center justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">ASET</span>
                                <span className="font-bold">{fmt(balanceEquation.assets)}</span>
                            </div>
                            <span className="text-muted-foreground">=</span>
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">KEWAJIBAN</span>
                                <span className="font-bold">{fmt(balanceEquation.liabilities)}</span>
                            </div>
                            <span className="text-muted-foreground">+</span>
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">EKUITAS</span>
                                <span className="font-bold">{fmt(balanceEquation.equity)}</span>
                            </div>
                            <Scale className={`h-4 w-4 ${balanceEquation.isBalanced ? 'text-green-500' : 'text-red-500'}`} />
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
