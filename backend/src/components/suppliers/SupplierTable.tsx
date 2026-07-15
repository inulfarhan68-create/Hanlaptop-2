"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Truck, MessageCircle, MapPin, Phone, Mail, Edit2, Trash2, PlusCircle } from "lucide-react"

interface SupplierTableProps {
  suppliers: any[];
  suppliersError: any;
  isLoading: boolean;
  canWrite: boolean;
  storeId: string | null;
  openAddModal: () => void;
  openEditModal: (s: any) => void;
  handleDelete: (s: any) => void;
  mutate: () => void;
}

export function SupplierTable({
  suppliers,
  suppliersError,
  isLoading,
  canWrite,
  storeId,
  openAddModal,
  openEditModal,
  handleDelete,
  mutate
}: SupplierTableProps) {

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val)
  }

  const handleWA = (supplier: any) => {
    // In nextjs app, we can use localStorage for storeName safely since it's client-side user click event
    const storeName = typeof window !== 'undefined' ? localStorage.getItem("storeName") || "HanLaptop" : "HanLaptop";
    const text = `Halo Kak ${supplier.name}, kami dari *${storeName}*. Ingin berkoordinasi mengenai pasokan barang. Terima kasih.`;
    const encodedText = encodeURIComponent(text)
    const phoneNum = supplier.phone || ''
    let waNumber = phoneNum.replace(/\D/g, '')
    if (waNumber.startsWith('0')) waNumber = '62' + waNumber.substring(1)
    window.open(`https://wa.me/${waNumber}?text=${encodedText}`, '_blank')
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="rounded-md border bg-card">
          {suppliersError ? (
            <div className="text-center py-10">
              <p className="text-destructive font-semibold mb-2">Gagal memuat data supplier</p>
              <p className="text-muted-foreground text-sm mb-4">{suppliersError.message}</p>
              <Button onClick={() => mutate()} variant="outline" size="sm">Coba Lagi</Button>
            </div>
          ) : isLoading ? (
            <div className="text-center py-10 text-muted-foreground">Memuat data supplier...</div>
          ) : !Array.isArray(suppliers) || suppliers.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-2">
              <Truck className="h-10 w-10 text-muted-foreground/30" />
              <p>Belum ada data supplier.</p>
              {canWrite && storeId !== 'all' && (
                <Button size="sm" variant="outline" className="mt-2 gap-1" onClick={openAddModal}>
                  <PlusCircle className="h-4 w-4" /> Tambah Supplier Pertama
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="md:hidden flex flex-col divide-y">
                {suppliers.map((s: any) => (
                  <div key={s.id} className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => openEditModal(s)}>
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-sm block truncate">{s.name}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Phone className="h-3 w-3 shrink-0" /> {s.phone || <span className="italic text-amber-500">Belum diisi</span>}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {canWrite && storeId !== 'all' && (
                          <Button variant="outline" size="icon" className="h-10 w-10 text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-full" onClick={() => openEditModal(s)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="outline" size="icon" className="h-10 w-10 text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-full" onClick={() => handleWA(s)} disabled={!s.phone}>
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {s.notes && (
                      <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded border border-border/40 truncate">
                        <span className="font-bold">Catatan:</span> {s.notes}
                      </p>
                    )}
                    
                    <div className="grid grid-cols-2 gap-2 mt-1 bg-muted/40 p-2.5 rounded-xl border border-border/50">
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground font-bold font-mono">Total Transaksi</p>
                        <p className="font-bold text-xs mt-0.5">{s.totalTransactions || 0} Kali</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground font-bold font-mono">Total Pengadaan</p>
                        <p className="font-bold text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCurrency(s.totalSpent || 0)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Kontak & Alamat</TableHead>
                      <TableHead>Catatan</TableHead>
                      <TableHead className="text-center">Total Transaksi</TableHead>
                      <TableHead className="text-right">Total Belanja</TableHead>
                      <TableHead className="text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map((s: any) => (
                      <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => {
                        if (canWrite && storeId !== 'all') openEditModal(s);
                      }}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                              {s.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-sm">{s.name}</div>
                              <div className="text-[10px] text-muted-foreground">
                                Ditambahkan: {s.createdAt ? new Date(s.createdAt).toLocaleDateString('id-ID') : '-'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs">
                              <Phone className="h-3 w-3 text-muted-foreground" /> {s.phone || <span className="italic text-amber-500">Belum diisi</span>}
                            </div>
                            {s.email && (
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <Mail className="h-3 w-3" /> {s.email}
                              </div>
                            )}
                            {s.address && (
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate max-w-[200px]" title={s.address}>
                                <MapPin className="h-3 w-3" /> {s.address}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                          {s.notes || '-'}
                        </TableCell>
                        <TableCell className="text-center font-medium text-xs">
                          {s.totalTransactions || 0}x
                        </TableCell>
                        <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                          {formatCurrency(s.totalSpent || 0)}
                        </TableCell>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="outline" size="sm" className="h-8 gap-1 text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-full px-3" onClick={() => handleWA(s)} disabled={!s.phone}>
                              <MessageCircle className="h-3.5 w-3.5" /> WA
                            </Button>
                            {canWrite && storeId !== 'all' && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-full" onClick={() => handleDelete(s)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
