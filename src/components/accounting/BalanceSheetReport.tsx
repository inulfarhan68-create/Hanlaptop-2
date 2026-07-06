import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Building2, CheckCircle, XCircle } from "lucide-react"

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

    const { assets = { current: [], fixed: [], total: 0 },
            liabilities = { current: [], longTerm: [], total: 0 },
            equity = { accounts: [], total: 0 },
            isBalanced = false,
            period } = data

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
                <div className="grid grid-cols-2 gap-8">
                    {/* ASSETS */}
                    <div>
                        <h3 className="text-lg font-bold text-blue-600 mb-3">ASET</h3>

                        {/* Current Assets */}
                        <div className="mb-4">
                            <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Aset Lancar</h4>
                            <Table>
                                <TableBody>
                                    {assets.current.map((account: any) => (
                                        <TableRow key={account.code}>
                                            <TableCell className="text-xs py-1">{account.name}</TableCell>
                                            <TableCell className="text-right font-semibold py-1">
                                                {fmt(account.amount)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Fixed Assets */}
                        <div className="mb-4">
                            <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Aset Tetap</h4>
                            <Table>
                                <TableBody>
                                    {assets.fixed.map((account: any) => (
                                        <TableRow key={account.code}>
                                            <TableCell className="text-xs py-1">{account.name}</TableCell>
                                            <TableCell className="text-right font-semibold py-1">
                                                {fmt(account.amount)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Total Assets */}
                        <div className="border-t-2 border-blue-300 pt-2 mt-4">
                            <div className="flex justify-between items-center">
                                <span className="font-bold">TOTAL ASET</span>
                                <span className="font-bold text-blue-600">{fmt(assets.total)}</span>
                            </div>
                        </div>
                    </div>

                    {/* LIABILITIES & EQUITY */}
                    <div>
                        <h3 className="text-lg font-bold text-red-600 mb-3">KEWAJIBAN</h3>

                        {/* Current Liabilities */}
                        <div className="mb-4">
                            <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Utang Lancar</h4>
                            <Table>
                                <TableBody>
                                    {liabilities.current.map((account: any) => (
                                        <TableRow key={account.code}>
                                            <TableCell className="text-xs py-1">{account.name}</TableCell>
                                            <TableCell className="text-right font-semibold py-1">
                                                {fmt(account.amount)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Long Term Liabilities */}
                        <div className="mb-4">
                            <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Utang Jangka Panjang</h4>
                            <Table>
                                <TableBody>
                                    {liabilities.longTerm.map((account: any) => (
                                        <TableRow key={account.code}>
                                            <TableCell className="text-xs py-1">{account.name}</TableCell>
                                            <TableCell className="text-right font-semibold py-1">
                                                {fmt(account.amount)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Total Liabilities */}
                        <div className="border-t-2 border-red-300 pt-2">
                            <div className="flex justify-between items-center">
                                <span className="font-bold">TOTAL KEWAJIBAN</span>
                                <span className="font-bold text-red-600">{fmt(liabilities.total)}</span>
                            </div>
                        </div>

                        {/* EQUITY */}
                        <h3 className="text-lg font-bold text-green-600 mt-6 mb-3">EKUITAS</h3>
                        <Table>
                            <TableBody>
                                {equity.accounts.map((account: any) => (
                                    <TableRow key={account.code}>
                                        <TableCell className="text-xs py-1">{account.name}</TableCell>
                                        <TableCell className="text-right font-semibold py-1">
                                            {fmt(account.amount)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        <div className="border-t-2 border-green-300 pt-2 mt-4">
                            <div className="flex justify-between items-center">
                                <span className="font-bold">TOTAL EKUITAS</span>
                                <span className="font-bold text-green-600">{fmt(equity.total)}</span>
                            </div>
                        </div>

                        {/* Total Liabilities + Equity */}
                        <div className="border-t-2 border-blue-300 pt-2 mt-4 bg-blue-50 dark:bg-blue-950/30 rounded p-2">
                            <div className="flex justify-between items-center">
                                <span className="font-bold">TOTAL KEWAJIBAN + EKUITAS</span>
                                <span className="font-bold text-blue-600">
                                    {fmt(liabilities.total + equity.total)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
