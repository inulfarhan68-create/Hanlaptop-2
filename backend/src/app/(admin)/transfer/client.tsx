"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { 
  ArrowLeftRight, 
  Plus, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Trash2, 
  Eye, 
  Calendar,
  User,
  Building2,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ModernSelect } from "@/components/ui/modern-select";
import { useUserRole } from "@/hooks/useUserRole";
import { apiFetch } from "@/lib/api";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

export default function StockTransferClient() {
  const { isOwner } = useUserRole();
  const currentStoreId = localStorage.getItem("selectedStoreId") || "all";
  
  // Tabs: 'list' | 'create'
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");
  const [itemSearchTerm, setItemSearchTerm] = useState("");
  
  // API Fetch - Use paginated search API instead of fetchAll for better performance
  const { data: transfers = [], error: transferError, isLoading: loading, mutate: mutateTransfers } = useSWR('/api/inventory/transfers');
  // 🔒 FIX: Use search API with pagination instead of fetching ALL inventory
  const { data: inventorySearchData } = useSWR(
    itemSearchTerm.trim() !== ""
      ? `/api/inventory?search=${encodeURIComponent(itemSearchTerm)}&status=instock&limit=20`
      : null
  );
  const { data: storesList = [] } = useSWR('/api/user/stores');
  
  // Create Form State
  const [targetStoreId, setTargetStoreId] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedItems, setSelectedItems] = useState<Array<{
    inventoryId: string;
    itemName: string;
    barcode: string;
    availableQty: number;
    costPrice: number;
    sellingPrice: number;
    quantity: number;
  }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail Modal State
  const [viewDetailTransfer, setViewDetailTransfer] = useState<any>(null);

  // Filter transfers list
  const [searchFilter, setSearchFilter] = useState("");
  
  // Calculate mini-kpi stats
  const stats = {
    pending: transfers.filter((t: any) => t.status === "PENDING").length,
    approved: transfers.filter((t: any) => t.status === "APPROVED").length,
    cancelled: transfers.filter((t: any) => t.status === "CANCELLED").length,
  };

  // Add Item to Transfer Selection
  const handleAddItem = (item: any) => {
    if (selectedItems.some(i => i.inventoryId === item.id)) {
      toast.warning("Barang ini sudah ditambahkan ke daftar transfer!");
      return;
    }

    if (item.quantity <= 0) {
      toast.warning("Barang dengan stok habis tidak dapat ditransfer!");
      return;
    }

    setSelectedItems([
      ...selectedItems,
      {
        inventoryId: item.id,
        itemName: item.itemName,
        barcode: item.barcode || "",
        availableQty: item.quantity,
        costPrice: item.costPrice || 0,
        sellingPrice: item.sellingPrice || 0,
        quantity: 1
      }
    ]);
    setItemSearchTerm("");
    toast.success("Barang berhasil ditambahkan.");
  };

  // Remove Item from Selection
  const handleRemoveItem = (id: string) => {
    setSelectedItems(selectedItems.filter(i => i.inventoryId !== id));
  };

  // Update Item Quantity in Selection
  const handleUpdateQty = (id: string, qty: number, maxQty: number) => {
    const validQty = Math.max(1, Math.min(maxQty, qty));
    setSelectedItems(selectedItems.map(i => i.inventoryId === id ? { ...i, quantity: validQty } : i));
  };

  // Submit Create Stock Transfer
  const handleSubmitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStoreId) {
      toast.warning("Silakan pilih cabang tujuan transfer!");
      return;
    }

    if (selectedItems.length === 0) {
      toast.warning("Harap pilih minimal 1 barang untuk ditransfer!");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch('/api/inventory/transfers', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetStoreId,
          notes,
          items: selectedItems.map(i => ({
            inventoryId: i.inventoryId,
            itemName: i.itemName,
            quantity: i.quantity
          }))
        })
      });

      if (res.ok) {
        toast.success("Permintaan transfer stok berhasil dibuat!");
        setSelectedItems([]);
        setTargetStoreId("");
        setNotes("");
        setActiveTab("list");
        mutateTransfers();
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Gagal membuat transfer stok.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Approve Transfer
  const handleApprove = async (id: string) => {
    const confirmApprove = window.confirm("Apakah Anda yakin ingin menyetujui transfer stok ini? Tindakan ini akan langsung merubah stok fisik dan pembukuan kedua cabang.");
    if (!confirmApprove) return;

    try {
      const res = await apiFetch(`/api/inventory/transfers/${id}/approve`, {
        method: "POST"
      });

      if (res.ok) {
        toast.success("Transfer stok berhasil disetujui!");
        mutateTransfers();
        if (viewDetailTransfer) setViewDetailTransfer(null);
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Gagal menyetujui transfer.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan sistem.");
    }
  };

  // Cancel Transfer
  const handleCancel = async (id: string) => {
    const confirmCancel = window.confirm("Apakah Anda yakin ingin membatalkan transfer stok ini?");
    if (!confirmCancel) return;

    try {
      const res = await apiFetch(`/api/inventory/transfers/${id}/cancel`, {
        method: "POST"
      });

      if (res.ok) {
        toast.success("Transfer stok berhasil dibatalkan!");
        mutateTransfers();
        if (viewDetailTransfer) setViewDetailTransfer(null);
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Gagal membatalkan transfer.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan sistem.");
    }
  };

  // Filter transfers to display
  const filteredTransfers = transfers.filter((t: any) => {
    if (searchFilter === "") return true;
    const term = searchFilter.toLowerCase();
    return (
      t.transferNumber.toLowerCase().includes(term) ||
      (t.sourceStore?.name || "").toLowerCase().includes(term) ||
      (t.targetStore?.name || "").toLowerCase().includes(term) ||
      (t.createdByUserName || "").toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      
      {/* Page Header */}
      <div className="sticky top-0 z-40 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-1.5 md:gap-2 p-2 md:px-5 md:py-3 bg-white/80 light-blue:bg-white dark:bg-card backdrop-blur-xl rounded-xl md:rounded-[2rem] border border-border shadow-sm mt-0 mb-2">
        <div>
          <h2 className="text-lg md:text-xl font-bold tracking-tight leading-none flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-primary shrink-0" />
            Transfer Stok Antar Cabang
          </h2>
          <p className="text-muted-foreground mt-1 text-[9px] md:text-xs font-medium hidden sm:block">
            Mutasi persediaan dan pembukuan antar cabang laphack & hanlaptop
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant={activeTab === "list" ? "default" : "outline"}
            onClick={() => setActiveTab("list")}
            className="rounded-full text-xs h-8 px-4"
          >
            Daftar Mutasi
          </Button>
          {currentStoreId !== "all" && (
            <Button 
              size="sm" 
              variant={activeTab === "create" ? "default" : "outline"}
              onClick={() => setActiveTab("create")}
              className="rounded-full text-xs h-8 px-4 gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Buat Transfer
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards (Pending, Approved, Cancelled) */}
      {activeTab === "list" && (
        <div className="grid grid-cols-3 gap-2 mb-2">
          <Card className="border border-border/50 bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-xl shadow-sm">
            <CardContent className="p-3 text-center md:text-left flex flex-col sm:flex-row sm:items-center justify-between">
              <div>
                <p className="text-[9px] md:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5 truncate">Pending</p>
                <p className="text-[14px] md:text-lg font-black text-amber-500 tabular-nums">{stats.pending}</p>
              </div>
              <div className="bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20 hidden sm:block">
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border/50 bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-xl shadow-sm">
            <CardContent className="p-3 text-center md:text-left flex flex-col sm:flex-row sm:items-center justify-between">
              <div>
                <p className="text-[9px] md:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5 truncate">Disetujui</p>
                <p className="text-[14px] md:text-lg font-black text-emerald-500 tabular-nums">{stats.approved}</p>
              </div>
              <div className="bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20 hidden sm:block">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border/50 bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-xl shadow-sm">
            <CardContent className="p-3 text-center md:text-left flex flex-col sm:flex-row sm:items-center justify-between">
              <div>
                <p className="text-[9px] md:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5 truncate">Dibatalkan</p>
                <p className="text-[14px] md:text-lg font-black text-rose-500 tabular-nums">{stats.cancelled}</p>
              </div>
              <div className="bg-rose-500/10 p-1.5 rounded-lg border border-rose-500/20 hidden sm:block">
                <XCircle className="w-4 h-4 text-rose-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tab Area */}
      <div className="flex-1 min-h-0 relative overflow-y-auto">
        
        {/* Tab 1: Transfers List */}
        {activeTab === "list" && (
          <div className="space-y-3">
            {/* Filter search */}
            <div className="relative group">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <Input
                placeholder="Cari berdasarkan nomor transfer, cabang, atau pembuat..."
                className="pl-8 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-[11px] h-8 w-full rounded-lg shadow-sm"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>

            {/* List Table Card */}
            <Card className="border-border/50 bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-xl overflow-hidden shadow-sm">
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center pl-3">No</TableHead>
                      <TableHead>No Transfer</TableHead>
                      <TableHead>Cabang Asal</TableHead>
                      <TableHead>Cabang Tujuan</TableHead>
                      <TableHead>Tanggal Kirim</TableHead>
                      <TableHead>Pembuat</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center pr-3">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center p-8">
                          <div className="flex justify-center items-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
                        </TableCell>
                      </TableRow>
                    ) : filteredTransfers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center p-8 text-muted-foreground text-xs">
                          {transferError ? "Gagal memuat data transfer stok." : "Tidak ada riwayat transfer stok."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransfers.map((t: any, idx: number) => {
                        const dateFormatted = new Date(t.createdAt).toLocaleDateString('id-ID', {
                          day: '2-digit', month: '2-digit', year: 'numeric'
                        });
                        
                        let statusColor = "text-amber-500 bg-amber-500/10 border-amber-500/20";
                        if (t.status === "APPROVED") statusColor = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
                        if (t.status === "CANCELLED") statusColor = "text-rose-500 bg-rose-500/10 border-rose-500/20";

                        return (
                          <TableRow key={t.id} className="hover:bg-muted/40 text-xs">
                            <TableCell className="text-center font-medium pl-3 text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell className="font-bold">{t.transferNumber}</TableCell>
                            <TableCell>{t.sourceStore?.name || "Utama"}</TableCell>
                            <TableCell>{t.targetStore?.name || "Tujuan"}</TableCell>
                            <TableCell>{dateFormatted}</TableCell>
                            <TableCell className="font-medium">{t.createdByUserName}</TableCell>
                            <TableCell className="text-center">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase ${statusColor}`}>
                                {t.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-center pr-3">
                              <div className="flex items-center justify-center gap-1.5">
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-7 w-7 rounded-lg text-primary hover:bg-primary/10" 
                                  onClick={() => setViewDetailTransfer(t)}
                                  title="Lihat Rincian"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                                {t.status === "PENDING" && (isOwner || currentStoreId === t.targetStoreId) && (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-7 px-2 text-[10px] font-bold border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                                    onClick={() => handleApprove(t.id)}
                                  >
                                    Terima
                                  </Button>
                                )}
                                {t.status === "PENDING" && (isOwner || currentStoreId === t.sourceStoreId) && (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-7 px-2 text-[10px] font-bold border-rose-500/30 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                    onClick={() => handleCancel(t.id)}
                                  >
                                    Batal
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab 2: Create Transfer Request Form */}
        {activeTab === "create" && (
          <div className="space-y-4 max-w-3xl mx-auto">
            <Card className="border-border/50 bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-xl shadow-sm overflow-hidden">
              <CardHeader className="p-4 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <ArrowLeftRight className="w-4 h-4 text-primary" />
                  Formulir Pengiriman Barang Antar Cabang
                </CardTitle>
                <CardDescription className="text-[10px]">Pindahkan persediaan barang dari cabang asal ke cabang tujuan</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <form onSubmit={handleSubmitTransfer} className="space-y-4">
                  {/* Target branch selection */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Cabang Tujuan (Penerima)</label>
                    <ModernSelect
                      value={targetStoreId}
                      onChange={setTargetStoreId}
                      options={[
                        { value: "", label: "Pilih Cabang Tujuan..." },
                        ...storesList
                          .filter((store: any) => store.id !== currentStoreId)
                          .map((store: any) => ({
                            value: store.id,
                            label: `${store.name} (${store.address || 'Tanpa Alamat'})`
                          }))
                      ]}
                    />
                  </div>

                  {/* Item selection auto-complete search */}
                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Cari & Pilih Barang (Stok Asal)</label>
                    <div className="relative group">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        placeholder="Ketik nama laptop / sparepart..."
                        value={itemSearchTerm}
                        onChange={(e) => setItemSearchTerm(e.target.value)}
                        className="pl-8 text-xs h-9 rounded-lg"
                      />
                    </div>

                    {/* Autocomplete dropdown suggestion */}
                    {itemSearchTerm.trim() !== "" && (
                      <div className="absolute left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-xl z-[60] max-h-48 overflow-y-auto p-1.5 space-y-0.5">
                        {(inventorySearchData?.data || [])
                          .slice(0, 10)
                          .map((item: any) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleAddItem(item)}
                              className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-muted text-foreground flex items-center justify-between"
                            >
                              <div className="min-w-0 flex-1 pr-3">
                                <p className="font-bold truncate">{item.itemName}</p>
                                <p className="text-[9px] text-muted-foreground font-mono mt-0.5">
                                  SKU/SN: {item.barcode || "-"} | HPP: {formatCurrency(item.costPrice)}
                                </p>
                              </div>
                              <span className="shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                Stok: {item.quantity}
                              </span>
                            </button>
                          ))}
                        {(inventorySearchData?.data || []).length === 0 && (
                          <div className="p-4 text-center text-xs text-muted-foreground italic">Barang tidak ditemukan atau habis.</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selected Items Table */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Daftar Barang yang Dikirim</label>
                    <div className="border border-border rounded-xl overflow-hidden divide-y divide-border bg-card">
                      {selectedItems.length === 0 ? (
                        <div className="p-6 text-center text-xs text-muted-foreground italic bg-muted/10">Belum ada barang dipilih. Silakan cari barang di atas.</div>
                      ) : (
                        selectedItems.map((item) => (
                          <div key={item.inventoryId} className="p-3 flex items-center justify-between gap-3 text-xs">
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-foreground truncate">{item.itemName}</p>
                              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                SKU/SN: {item.barcode || "-"} | Stok Cabang Asal: {item.availableQty}
                              </p>
                            </div>
                            
                            {/* Quantity Adjustment */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] text-muted-foreground mr-1">Qty Kirim:</span>
                              <input
                                type="number"
                                min={1}
                                max={item.availableQty}
                                value={item.quantity}
                                onChange={(e) => handleUpdateQty(item.inventoryId, parseInt(e.target.value) || 1, item.availableQty)}
                                className="w-12 h-7 text-center rounded-md border border-border bg-background font-bold text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                              <Button
                                size="icon"
                                type="button"
                                variant="ghost"
                                className="h-7 w-7 text-rose-500 hover:bg-rose-500/10"
                                onClick={() => handleRemoveItem(item.inventoryId)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Catatan / Alasan Transfer</label>
                    <textarea
                      placeholder="Tulis tujuan transfer atau catatan pengiriman (misal: penuhi stok laptop ramadhan)..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full min-h-[70px] p-2 text-xs rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Submit buttons */}
                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => { setSelectedItems([]); setActiveTab("list"); }}
                    >
                      Batal
                    </Button>
                    <Button 
                      type="submit" 
                      size="sm"
                      disabled={isSubmitting}
                      className="font-bold gap-1"
                    >
                      {isSubmitting ? "Mengirim..." : "Kirim Permintaan Transfer"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

      </div>

      {/* ── DETAIL TRANSFER DIALOG (MODAL) ── */}
      {viewDetailTransfer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 overflow-hidden animate-in fade-in duration-200">
          <div className="bg-background border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 text-left">
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-extrabold text-sm md:text-base text-foreground leading-tight">Detail Transfer Stok</h3>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">ID: {viewDetailTransfer.transferNumber}</p>
                </div>
              </div>
              <button 
                onClick={() => setViewDetailTransfer(null)} 
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-full hover:bg-muted transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded-xl border text-xs">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Cabang Pengirim</p>
                    <p className="font-bold">{viewDetailTransfer.sourceStore?.name || "Utama"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Cabang Penerima</p>
                    <p className="font-bold">{viewDetailTransfer.targetStore?.name || "Tujuan"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Tanggal Kirim</p>
                    <p className="font-bold">
                      {new Date(viewDetailTransfer.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Dibuat Oleh</p>
                    <p className="font-bold">{viewDetailTransfer.createdByUserName}</p>
                  </div>
                </div>
                {viewDetailTransfer.status === "APPROVED" && (
                  <div className="col-span-2 flex items-center gap-2 border-t pt-2 border-border/50">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Disetujui Oleh</p>
                      <p className="font-bold text-emerald-600 dark:text-emerald-400">
                        {viewDetailTransfer.approvedByUserName || "Sistem"} per {new Date(viewDetailTransfer.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                )}
                {viewDetailTransfer.notes && (
                  <div className="col-span-2 flex items-start gap-2 border-t pt-2 border-border/50">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Catatan Pengiriman</p>
                      <p className="italic text-foreground">{viewDetailTransfer.notes}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Barang yang Ditransfer</h4>
                <div className="border rounded-xl overflow-hidden text-xs">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-muted/50 text-muted-foreground border-b text-left">
                        <th className="p-2.5 pl-4 font-bold">Nama Barang</th>
                        <th className="p-2.5 text-center font-bold">Kuantitas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {viewDetailTransfer.items?.map((item: any) => (
                        <tr key={item.id} className="hover:bg-muted/20">
                          <td className="p-2.5 pl-4 font-bold text-foreground">{item.itemName}</td>
                          <td className="p-2.5 text-center font-black text-primary">{item.quantity} unit</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-border bg-muted/20 flex justify-end gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setViewDetailTransfer(null)}
              >
                Tutup
              </Button>
              {viewDetailTransfer.status === "PENDING" && (isOwner || currentStoreId === viewDetailTransfer.targetStoreId) && (
                <Button 
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 font-bold"
                  onClick={() => handleApprove(viewDetailTransfer.id)}
                >
                  Setujui Penerimaan
                </Button>
              )}
              {viewDetailTransfer.status === "PENDING" && (isOwner || currentStoreId === viewDetailTransfer.sourceStoreId) && (
                <Button 
                  size="sm"
                  variant="destructive"
                  className="font-bold"
                  onClick={() => handleCancel(viewDetailTransfer.id)}
                >
                  Batalkan Pengiriman
                </Button>
              )}
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}
