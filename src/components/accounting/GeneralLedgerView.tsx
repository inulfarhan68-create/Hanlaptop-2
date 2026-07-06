import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import useSWR from "swr"
import { FileText, ChevronDown, ChevronRight } from "lucide-react"

interface GeneralLedgerViewProps {
    year: number
    month: number
    apiUrl: string
    fmt: (v: number) => string
}

export function GeneralLedgerView({ year, month, apiUrl, fmt }: GeneralLedgerViewProps) {
    const [selectedAccount, setSelectedAccount] = useState<string>("")
    const [expanded, setExpanded] = useState(true)

    const { data: coaData } = useSWR(
        `${apiUrl}/api/accounting/coa?active=true`,
        { keepPreviousData: true }
    )

    const { data: ledgerData, error, isLoading } = useSWR(
        selectedAccount ? `${apiUrl}/api/accounting/general-ledger?accountCode=${selectedAccount}&year=${year}&month=${month}` : null,
        { keepPreviousData: true }
    )

    const accounts = Array.isArray(coaData) ? coaData : []

    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Buku Besar (General Ledger)
                    </CardTitle>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExpanded(!expanded)}
                    >
                        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span className="ml-1">{expanded ? "Sembunyikan" : "Tampilkan"}</span>
                    </Button>
                </div>
                <div className="mt-2">
                    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                        <SelectTrigger>
                            <SelectValue placeholder="Pilih akun..." />
                        </SelectTrigger>
                        <SelectContent>
                            {accounts.map((account: any) => (
                                <SelectItem key={account.id} value={account.code}>
                                    {account.code} - {account.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="text-center py-10 text-muted-foreground">Memuat...</div>
                ) : !selectedAccount ? (
                    <div className="text-center py-10 text-muted-foreground">
                        Pilih akun untuk melihat buku besar
                    </div>
                ) : ledgerData ? (
                    <div className="space-y-4">
                        {/* Account Summary */}
                        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Akun</span>
                                <span className="font-semibold">{ledgerData.account?.code} - {ledgerData.account?.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Saldo Awal</span>
                                <span className="font-semibold">{fmt(ledgerData.openingBalance || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Saldo Akhir</span>
                                <span className="font-bold text-lg">{fmt(ledgerData.closingBalance || 0)}</span>
                            </div>
                        </div>

                        {/* Journal Entries Table */}
                        {expanded && (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="w-[150px]">Tanggal</TableHead>
                                        <TableHead className="w-[120px]">No. Transaksi</TableHead>
                                        <TableHead>Keterangan</TableHead>
                                        <TableHead className="text-right w-[120px]">Debit</TableHead>
                                        <TableHead className="text-right w-[120px]">Kredit</TableHead>
                                        <TableHead className="text-right w-[130px]">Saldo</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {/* Opening Balance Row */}
                                    <TableRow className="bg-blue-50 dark:bg-blue-950/30">
                                        <TableCell colSpan={5} className="font-medium">
                                            Saldo Awal
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">
                                            {fmt(ledgerData.openingBalance || 0)}
                                        </TableCell>
                                    </TableRow>
                                    {/* Journal Entries */}
                                    {ledgerData.entries?.map((entry: any) => (
                                        <TableRow key={entry.id}>
                                            <TableCell className="text-xs">
                                                {new Date(entry.createdAt).toLocaleDateString('id-ID')}
                                            </TableCell>
                                            <TableCell className="text-xs font-mono">
                                                {entry.transactionType || '-'}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {entry.invoiceNumber || entry.accountName}
                                            </TableCell>
                                            <TableCell className="text-right text-red-600">
                                                {entry.debit > 0 ? fmt(entry.debit) : ''}
                                            </TableCell>
                                            <TableCell className="text-right text-green-600">
                                                {entry.credit > 0 ? fmt(entry.credit) : ''}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">
                                                {fmt(entry.runningBalance || 0)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {(!ledgerData.entries || ledgerData.entries.length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                                Tidak ada transaksi dalam periode ini
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        Gagal memuat data buku besar
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
