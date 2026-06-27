import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import { Package, ShoppingCart, FileText, SearchX } from "lucide-react"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  actionLabel?: string
  actionTo?: string
  onAction?: () => void
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-in fade-in duration-300">
      <div className="p-4 rounded-2xl bg-muted/50 border border-border mb-4">
        {icon || <Package className="h-8 w-8 text-muted-foreground" />}
      </div>
      <h3 className="font-bold text-base mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-5">{description}</p>
      {actionLabel && (actionTo ? (
        <Button asChild size="sm">
          <Link to={actionTo}>{actionLabel}</Link>
        </Button>
      ) : onAction ? (
        <Button size="sm" onClick={onAction}>{actionLabel}</Button>
      ) : null)}
    </div>
  )
}

// Pre-built empty states for common pages
export function InventoryEmpty({ onAdd }: { onAdd: () => void }) {
  return (
    <EmptyState
      icon={<Package className="h-8 w-8 text-muted-foreground" />}
      title="Belum Ada Barang"
      description="Inventaris masih kosong. Mulai tambahkan barang laptop, sparepart, atau aksesoris pertama Anda."
      actionLabel="+ Tambah Barang Pertama"
      onAction={onAdd}
    />
  )
}

export function TransactionEmpty() {
  return (
    <EmptyState
      icon={<ShoppingCart className="h-8 w-8 text-muted-foreground" />}
      title="Belum Ada Transaksi"
      description="Belum ada riwayat transaksi yang tercatat. Buat transaksi penjualan atau pembelian untuk memulai."
      actionLabel="Buat Transaksi Baru"
      actionTo="/transactions"
    />
  )
}

export function SearchEmpty({ query }: { query: string }) {
  return (
    <EmptyState
      icon={<SearchX className="h-8 w-8 text-muted-foreground" />}
      title="Tidak Ada Hasil"
      description={`Tidak ditemukan hasil untuk "${query}". Coba kata kunci lain atau hapus filter.`}
    />
  )
}

export function ReportEmpty() {
  return (
    <EmptyState
      icon={<FileText className="h-8 w-8 text-muted-foreground" />}
      title="Belum Ada Data Laporan"
      description="Data laporan keuangan akan muncul setelah ada transaksi yang tercatat di sistem."
      actionLabel="Catat Transaksi"
      actionTo="/transactions"
    />
  )
}
