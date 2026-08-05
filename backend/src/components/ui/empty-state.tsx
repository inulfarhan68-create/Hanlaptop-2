import { Button } from "@/components/ui/button"
import Link from "next/link"
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
        // A plain styled Link, not <Button asChild>: this Button renders a <span>
        // rather than a Radix Slot, so only the label text would have been
        // clickable and the padding around it dead. Never noticed because until
        // now nothing used the actionTo branch.
        <Link
          href={actionTo}
          className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {actionLabel}
        </Link>
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
      description="Belum ada riwayat transaksi yang tercatat. Catat penjualan pertama untuk memulai."
      actionLabel="Catat Penjualan"
      // The sales tab, not "/transactions" — this renders ON that page, so the
      // old link pointed at the page you were already looking at.
      actionTo="/transactions?mode=Penjualan"
    />
  )
}

/** No rows for the chosen period/type — different from having no transactions at all. */
export function TransactionFilterEmpty() {
  return (
    <EmptyState
      icon={<SearchX className="h-8 w-8 text-muted-foreground" />}
      title="Tidak Ada Transaksi di Periode Ini"
      description="Coba ubah periode ke 'Semua Waktu' atau hapus filter jenis transaksi."
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
