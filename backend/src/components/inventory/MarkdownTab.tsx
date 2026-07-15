import { useState } from "react"
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowDownCircle, AlertTriangle, TrendingDown } from "lucide-react"
import { toast } from "sonner"
import useSWR from "swr"

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)
}

export function MarkdownTab() {
  // Fetch items older than 60 days
  const { data: inventoryData, mutate } = useSWR<any[]>('/api/inventory?fetchAll=true')
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null)

  const items = Array.isArray(inventoryData) ? inventoryData : []
  
  // Filter for dead stock: > 60 days old (For demo, we'll just show items with low sales or old dates if available. Since we might not have 'createdAt' on all, we mock it or filter by an attribute).
  // For this implementation, we assume `createdAt` is available.
  const deadStockItems = items.filter(item => {
    if (!item.createdAt) return false
    const daysOld = (new Date().getTime() - new Date(item.createdAt).getTime()) / (1000 * 3600 * 24)
    return daysOld > 60 && item.quantity > 0
  })

  const handleApplyMarkdown = async (item: any) => {
    const newPrice = item.sellingPrice * 0.8 // 20% markdown
    const loss = item.costPrice - newPrice

    if (!window.confirm(`Terapkan Markdown 20% pada ${item.itemName}?\nHarga Jual Baru: ${formatCurrency(newPrice)}\nPotensi Rugi/Loss: ${formatCurrency(loss)}`)) {
      return
    }

    setIsSubmitting(item.id)
    try {
      const res = await apiFetch(`/api/inventory/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...item,
          sellingPrice: newPrice
        })
      })

      if (res.ok) {
        toast.success("Markdown berhasil diterapkan!")
        mutate()
      } else {
        toast.error("Gagal menerapkan markdown")
      }
    } catch (e) {
      toast.error("Terjadi kesalahan jaringan")
    } finally {
      setIsSubmitting(null)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="bg-rose-50/50 dark:bg-rose-950/20 border-b pb-4">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-rose-500" />
            <CardTitle className="text-lg">Markdown Liquidator</CardTitle>
          </div>
          <CardDescription>Rekomendasi diskon cuci gudang untuk barang "Dead Stock" (stok mati &gt; 60 hari).</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {deadStockItems.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
                <AlertTriangle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">Stok Aman</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-[300px]">Tidak ada barang berusia lebih dari 60 hari di gudang Anda saat ini.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-bold text-xs">SKU</TableHead>
                  <TableHead className="font-bold text-xs">Nama Barang</TableHead>
                  <TableHead className="font-bold text-xs text-right">Umur Stok</TableHead>
                  <TableHead className="font-bold text-xs text-right">Harga Jual Saat Ini</TableHead>
                  <TableHead className="font-bold text-xs text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deadStockItems.map(item => {
                  const daysOld = Math.floor((new Date().getTime() - new Date(item.createdAt).getTime()) / (1000 * 3600 * 24))
                  return (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs font-mono">{item.id.substring(0, 8).toUpperCase()}</TableCell>
                      <TableCell className="text-xs font-semibold">{item.itemName}</TableCell>
                      <TableCell className="text-xs text-right text-rose-600 font-bold">{daysOld} hari</TableCell>
                      <TableCell className="text-xs text-right font-mono">{formatCurrency(item.sellingPrice)}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 text-[10px] text-rose-600 border-rose-200 hover:bg-rose-50"
                          onClick={() => handleApplyMarkdown(item)}
                          disabled={isSubmitting === item.id}
                        >
                          <ArrowDownCircle className="w-3 h-3 mr-1" />
                          {isSubmitting === item.id ? "Memproses..." : "Markdown 20%"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
