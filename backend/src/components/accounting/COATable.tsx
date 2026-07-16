"use client";

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import useSWR from "swr"
import { Plus, Pencil, Trash2, Search, BookOpen } from "lucide-react"

const fmt = (v: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v)

export function COATable() {
    const [searchQuery, setSearchQuery] = useState("")
    const [filterType, setFilterType] = useState<string>("all")

    const { data: accounts, error, isLoading, mutate } = useSWR(
        '/api/accounting/coa?active=true',
        { keepPreviousData: true }
    )

    const filteredAccounts = useMemo(() => {
        if (!Array.isArray(accounts)) return []

        return accounts.filter((account: any) => {
            const matchesSearch = !searchQuery ||
                account.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                account.name.toLowerCase().includes(searchQuery.toLowerCase())

            const matchesType = filterType === "all" || account.type === filterType

            return matchesSearch && matchesType
        })
    }, [accounts, searchQuery, filterType])

    // Group accounts by type
    const groupedAccounts = useMemo(() => {
        const groups: Record<string, any[]> = {
            Asset: [],
            Liability: [],
            Equity: [],
            Revenue: [],
            Expense: []
        }

        filteredAccounts.forEach((account: any) => {
            if (groups[account.type]) {
                groups[account.type].push(account)
            }
        })

        return groups
    }, [filteredAccounts])

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

    if (error) {
        return (
            <div className="text-center py-10">
                <p className="text-destructive font-semibold mb-2">Gagal memuat data</p>
                <Button onClick={() => mutate()} variant="outline" size="sm">Coba Lagi</Button>
            </div>
        )
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        Chart of Accounts (Bagan Akun)
                    </CardTitle>
                </div>
                <div className="flex gap-2 mt-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari kode atau nama akun..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                        <option value="all">Semua Tipe</option>
                        <option value="Asset">Aset</option>
                        <option value="Liability">Kewajiban</option>
                        <option value="Equity">Ekuitas</option>
                        <option value="Revenue">Pendapatan</option>
                        <option value="Expense">Beban</option>
                    </select>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="text-center py-10 text-muted-foreground">Memuat...</div>
                ) : (
                    <div className="space-y-4">
                        {Object.entries(groupedAccounts).map(([type, accounts]) => (
                            accounts.length > 0 && (
                                <div key={type}>
                                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                        <Badge variant="outline" className={getTypeColor(type)}>
                                            {type}
                                        </Badge>
                                        <span className="text-muted-foreground">({accounts.length} akun)</span>
                                    </h3>
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead className="w-[80px]">Kode</TableHead>
                                                <TableHead>Nama Akun</TableHead>
                                                <TableHead className="w-[100px]">Tipe</TableHead>
                                                <TableHead className="w-[100px]">Saldo Normal</TableHead>
                                                <TableHead className="text-right w-[120px]">Saldo Awal</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {accounts.map((account: any) => (
                                                <TableRow key={account.id} className="hover:bg-muted/50">
                                                    <TableCell className="font-mono font-semibold">
                                                        {account.code}
                                                    </TableCell>
                                                    <TableCell>
                                                        {account.name}
                                                        {account.isSystem && (
                                                            <Badge variant="outline" className="ml-2 text-[10px]">
                                                                Sistem
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={getTypeColor(account.type)}>
                                                            {account.type}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className={account.normalBalance === 'Debit' ? 'text-blue-600' : 'text-red-600'}>
                                                            {account.normalBalance}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {fmt(account.openingBalance || 0)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )
                        ))}
                        {filteredAccounts.length === 0 && (
                            <div className="text-center py-10 text-muted-foreground">
                                Tidak ada akun yang ditemukan
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// Import useMemo
import { useMemo } from "react"
