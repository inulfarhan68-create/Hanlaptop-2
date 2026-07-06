import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import useSWR from "swr"
import { Calculator, Plus, Pencil, Trash2 } from "lucide-react"

interface FixedAssetsTableProps {
    apiUrl: string
    fmt: (v: number) => string
}

export function FixedAssetsTable({ apiUrl, fmt }: FixedAssetsTableProps) {
    const { data: assets, error, isLoading, mutate } = useSWR(
        `${apiUrl}/api/accounting/fixed-assets`,
        { keepPreviousData: true }
    )

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
            case 'fully_depreciated': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
            case 'disposed': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active': return 'Aktif'
            case 'fully_depreciated': return 'Sudah Disusutkan'
            case 'disposed': return 'Dihapus'
            default: return status
        }
    }

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-'
        return new Date(dateStr).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        Aset Tetap
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-10">
                        <p className="text-destructive font-semibold mb-2">Gagal memuat data</p>
                        <Button onClick={() => mutate()} variant="outline" size="sm">Coba Lagi</Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const assetList = Array.isArray(assets) ? assets : []

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        Aset Tetap (Fixed Assets)
                    </CardTitle>
                    <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-1" />
                        Tambah Aset
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="text-center py-10 text-muted-foreground">Memuat...</div>
                ) : assetList.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                        <Calculator className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p>Belum ada aset tetap yang terdaftar</p>
                        <Button className="mt-4" size="sm">
                            <Plus className="h-4 w-4 mr-1" />
                            Tambah Aset Tetap
                        </Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-[80px]">Kode</TableHead>
                                <TableHead>Nama Aset</TableHead>
                                <TableHead>Tanggal Beli</TableHead>
                                <TableHead className="text-right">Harga Perolehan</TableHead>
                                <TableHead className="text-right">Penyusutan</TableHead>
                                <TableHead className="text-right">Nilai Buku</TableHead>
                                <TableHead className="w-[100px]">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {assetList.map((asset: any) => (
                                <TableRow key={asset.id}>
                                    <TableCell className="font-mono text-xs">{asset.code}</TableCell>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{asset.name}</p>
                                            {asset.description && (
                                                <p className="text-xs text-muted-foreground">{asset.description}</p>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {formatDate(asset.purchaseDate)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {fmt(asset.purchasePrice)}
                                    </TableCell>
                                    <TableCell className="text-right text-red-600">
                                        {fmt(asset.accumulatedDepreciation || 0)}
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">
                                        {fmt(asset.netBookValue || 0)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={getStatusColor(asset.status)}>
                                            {getStatusLabel(asset.status)}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}

                {/* Summary */}
                {assetList.length > 0 && (
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground">Total Aset</p>
                                <p className="text-lg font-bold">{assetList.length}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Harga Perolehan</p>
                                <p className="text-lg font-bold">
                                    {fmt(assetList.reduce((sum: number, a: any) => sum + a.purchasePrice, 0))}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Total Penyusutan</p>
                                <p className="text-lg font-bold text-red-600">
                                    {fmt(assetList.reduce((sum: number, a: any) => sum + (a.accumulatedDepreciation || 0), 0))}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Total Nilai Buku</p>
                                <p className="text-lg font-bold text-emerald-600">
                                    {fmt(assetList.reduce((sum: number, a: any) => sum + (a.netBookValue || 0), 0))}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
