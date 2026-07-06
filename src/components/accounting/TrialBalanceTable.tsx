import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Scale, CheckCircle, XCircle } from "lucide-react"

interface TrialBalanceTableProps {
    data: any
    fmt: (v: number) => string
    isLoading: boolean
}

export function TrialBalanceTable({ data, fmt, isLoading }: TrialBalanceTableProps) {
    const getTypeColor = (type: string) => {
        switch (type) {
            case 'Asset': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
            case 'Liability': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            case 'Equity': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            case 'Revenue': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
            case 'Expense': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Scale className="h-5 w-5" />
                        Neraca Saldo (Trial Balance)
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
                        <Scale className="h-5 w-5" />
                        Neraca Saldo (Trial Balance)
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

    const { accounts = [], totalDebit = 0, totalCredit = 0, isBalanced = false } = data

    // Separate debit and credit accounts
    const debitAccounts = accounts.filter((a: any) => a.debit > 0)
    const creditAccounts = accounts.filter((a: any) => a.credit > 0)

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Scale className="h-5 w-5" />
                        Neraca Saldo (Trial Balance)
                    </CardTitle>
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
                    {/* Debit Column */}
                    <div>
                        <h3 className="text-sm font-semibold mb-2 text-red-600">DEBIT</h3>
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-red-50 dark:bg-red-950/30">
                                    <TableHead>Kode</TableHead>
                                    <TableHead>Nama Akun</TableHead>
                                    <TableHead className="text-right">Jumlah</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {debitAccounts.map((account: any) => (
                                    <TableRow key={account.accountCode}>
                                        <TableCell className="font-mono text-xs">{account.accountCode}</TableCell>
                                        <TableCell className="text-sm">{account.accountName}</TableCell>
                                        <TableCell className="text-right text-red-600 font-semibold">
                                            {fmt(account.debit)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="bg-red-100 dark:bg-red-900/30 font-bold">
                                    <TableCell colSpan={2}>TOTAL DEBIT</TableCell>
                                    <TableCell className="text-right">{fmt(totalDebit)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>

                    {/* Credit Column */}
                    <div>
                        <h3 className="text-sm font-semibold mb-2 text-green-600">KREDIT</h3>
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-green-50 dark:bg-green-950/30">
                                    <TableHead>Kode</TableHead>
                                    <TableHead>Nama Akun</TableHead>
                                    <TableHead className="text-right">Jumlah</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {creditAccounts.map((account: any) => (
                                    <TableRow key={account.accountCode}>
                                        <TableCell className="font-mono text-xs">{account.accountCode}</TableCell>
                                        <TableCell className="text-sm">{account.accountName}</TableCell>
                                        <TableCell className="text-right text-green-600 font-semibold">
                                            {fmt(account.credit)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="bg-green-100 dark:bg-green-900/30 font-bold">
                                    <TableCell colSpan={2}>TOTAL KREDIT</TableCell>
                                    <TableCell className="text-right">{fmt(totalCredit)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* Difference */}
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex justify-between items-center">
                        <span className="text-sm">Selisih (Debit - Kredit):</span>
                        <span className={`font-bold ${Math.abs(totalDebit - totalCredit) < 1 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {fmt(Math.abs(totalDebit - totalCredit))}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
