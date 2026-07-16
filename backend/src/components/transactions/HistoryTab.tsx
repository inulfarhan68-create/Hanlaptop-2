import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Printer, AlertCircle, CheckCircle, Trash2, Edit2, TrendingDown, Search, Download, Filter } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { ModernSelect } from "@/components/ui/modern-select"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import useSWR from "swr"
import { printThermalReceipt } from "@/lib/printThermal"
import { useUserRole } from "@/hooks/useUserRole"

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value)
}

const parseCurrencyString = (val: string) => {
  if (!val) return 0
  return parseFloat(val.replace(/\D/g, "")) || 0
}

const handleCurrencyInput = (val: string, setter: (v: string) => void) => {
  const digits = val.replace(/\D/g, "")
  if (!digits) {
    setter("")
    return
  }
  setter(parseInt(digits, 10).toLocaleString('id-ID'))
}

function PrintActionDropdown({ trx, onPrintA4, onWhatsApp }: { trx: any, onPrintA4: (trx: any) => void, onWhatsApp: (trx: any) => void }) {
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600 hover:bg-green-50 hover:text-green-700 rounded" title="Kirim WA" onClick={(e) => { e.stopPropagation(); onWhatsApp(trx); }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 rounded" title="Invoice A4" onClick={(e) => { e.stopPropagation(); onPrintA4(trx); }}>
        <Printer className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

interface HistoryTabProps {
  isOwner: boolean
  onPrint: (data: any) => void
  onStartEdit: (trx: any) => void
  storeSettings: any
}

export function HistoryTab({ onPrint, onStartEdit, storeSettings }: HistoryTabProps) {
  const { confirm, dialog } = useConfirmDialog()
  const { isOwner, isManager, isKasir, isInvestor } = useUserRole()

  const [historyPeriod, setHistoryPeriod] = useState("Bulan Ini")
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [historyFilter, setHistoryFilter] = useState("")
  const [historyType, setHistoryType] = useState("")

  // SWR query params
  const historyQuery = useMemo(() => {
    const params = new URLSearchParams()
    const now = new Date()
    if (historyPeriod === "Hari Ini") {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      params.append('from', today.toISOString())
    } else if (historyPeriod === "Bulan Ini") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      params.append('from', startOfMonth.toISOString())
    } else if (historyPeriod === "Tahun Ini") {
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      params.append('from', startOfYear.toISOString())
    } else {
      params.append('limit', '500')
    }
    return params.toString()
  }, [historyPeriod])

  const { data: allTransactionsData, mutate: mutateTransactions, isLoading: historyLoading } = useSWR(('') + '/api/transactions?' + historyQuery)
  const allTransactions = Array.isArray(allTransactionsData) ? allTransactionsData : []

  // Detail / Return States
  const [viewDetailTrx, setViewDetailTrx] = useState<any>(null)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [returnTrx, setReturnTrx] = useState<any>(null)
  const [returnItemsState, setReturnItemsState] = useState<any[]>([])
  const [returnRefundMethod, setReturnRefundMethod] = useState("Cash")
  const [returnRefundAmount, setReturnRefundAmount] = useState("")
  const [returnReason, setReturnReason] = useState("")
  const [returnSubmitting, setReturnSubmitting] = useState(false)

  const handleWhatsAppNota = (trx: any) => {
    const defaultTemplate = "Halo Kak {nama}, berikut adalah detail transaksi Kakak di *{toko}* untuk nota *{nota}* senilai *{total}*. Terima kasih telah berbelanja di tempat kami!";
    let template = trx.store?.waTemplateNota || storeSettings?.waTemplateNota || localStorage.getItem("waTemplateNota") || defaultTemplate;
    if (!template.includes("{link}")) {
      template += "\n\nLihat Nota Online: {link}";
    }
    
    const storeName = trx.store?.name || storeSettings?.storeName || localStorage.getItem("storeName") || "HanLaptop";
    const totalAmount = formatCurrency(trx.amount || trx.displayAmount || 0);
    const txId = trx.originalId || trx.id || '';
    const invoiceLink = `${window.location.origin}/nota/${txId}`;
    
    let text = template
      .replace(/{nama}/g, trx.customerName || trx.customer?.name || 'Pelanggan')
      .replace(/{toko}/g, storeName)
      .replace(/{nota}/g, trx.invoiceNumber || `INV-${txId.substring(0,8).toUpperCase()}`)
      .replace(/{total}/g, totalAmount)
      .replace(/{link}/g, invoiceLink);

    const encodedText = encodeURIComponent(text);
    let phone = trx.customerPhone || trx.customer?.phone || '';
    if (phone.startsWith('0')) {
      phone = '62' + phone.substring(1);
    }
    
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${encodedText}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodedText}`, '_blank');
    }
  }

  const handlePrintFromHistory = (trx: any) => {
    let items = []
    if (trx.items && trx.items.length > 0) {
      items = trx.items.map((it: any) => ({
        name: it.inventoryItem ? it.inventoryItem.itemName : it.itemName || 'Item',
        qty: it.quantity,
        price: it.unitPrice,
        discountType: it.discountType,
        discountValue: it.discountValue
      }))
    } else {
      items = [{
        name: trx.description || trx.transactionType,
        qty: 1,
        price: trx.amount
      }]
    }

    onPrint({
      type: trx.transactionType,
      invoiceNum: trx.invoiceNumber || `INV-${(trx.originalId || trx.id).substring(0,8).toUpperCase()}`,
      customer: trx.customerName || 'Pelanggan Umum',
      customerPhone: trx.customer?.phone || '',
      customerAddress: trx.customer?.address || '',
      items,
      total: trx.amount,
      method: trx.paymentMethod || 'Cash',
      status: trx.paymentStatus || 'Lunas',
      dpAmount: trx.dpAmount || 0,
      discountAmount: trx.discountAmount || 0,
      dueDate: trx.dueDate,
      store: trx.store
    })
  }

  const handleOpenDetail = async (trx: any) => {
    setViewDetailTrx(trx)
    try {
      const res = await fetch(('') + `/api/transactions/${trx.originalId || trx.id}`)
      if (res.ok) {
        const fullTrx = await res.json()
        setViewDetailTrx(fullTrx)
      }
    } catch (e) {
      console.error("Failed to load transaction details:", e)
    }
  }

  const filterTransaction = (t: any) => {
    const searchRaw = (historyFilter || "").toLowerCase()
    const matchText = !historyFilter || 
      (t.customerName || '').toLowerCase().includes(searchRaw) || 
      (t.description || '').toLowerCase().includes(searchRaw) ||
      (t.transactionType || '').toLowerCase().includes(searchRaw) ||
      (t.paymentStatus || '').toLowerCase().includes(searchRaw) ||
      (t.paymentMethod || '').toLowerCase().includes(searchRaw)
    const matchType = !historyType || t.transactionType === historyType
    
    let matchPeriod = true
    if (historyPeriod !== "Semua Waktu") {
      const txDate = new Date(t.transactionDate)
      const now = new Date()
      if (historyPeriod === "Hari Ini") {
        matchPeriod = txDate.getDate() === now.getDate() && txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear()
      } else if (historyPeriod === "Bulan Ini") {
        matchPeriod = txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear()
      } else if (historyPeriod === "Tahun Ini") {
        matchPeriod = txDate.getFullYear() === now.getFullYear()
      }
    }
    return matchText && matchType && matchPeriod
  }

  const handlePayOff = async (id: string) => {
    try {
      const res = await fetch(('') + `/api/transactions/${id}`, { method: 'PATCH' });
      if (res.ok) {
        toast.success("Transaksi berhasil dilunasi!");
        mutateTransactions();
        setViewDetailTrx(null);
      } else {
        const error = await res.json();
        toast.error(`Gagal melunasi: ${error.error}`);
      }
    } catch (e) {
      toast.error("Terjadi kesalahan jaringan.");
    }
  }

  const executeDeleteTrx = async (id: string) => {
    try {
      const res = await fetch(('') + `/api/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("Transaksi berhasil dihapus");
        mutateTransactions();
        if (viewDetailTrx?.id === id) setViewDetailTrx(null);
      } else {
        const error = await res.json();
        toast.error(`Gagal menghapus: ${error.error}`);
      }
    } catch (e) {
      toast.error("Terjadi kesalahan jaringan.");
    }
  }

  const handleDeleteTrx = async (id: string) => {
    const confirmed = await confirm({
      title: "Hapus Transaksi?",
      description: "Stok dan jurnal akan dikembalikan. Tindakan ini tidak dapat dibatalkan.",
      confirmLabel: "Hapus Permanen",
      variant: "destructive"
    });
    if (confirmed) {
      executeDeleteTrx(id);
    }
  }

  const handleOpenReturnModal = (trx: any) => {
    setReturnTrx(trx);
    
    const returnedQtyMap: Record<string, number> = {};
    allTransactions.forEach((t: any) => {
      if (t.transactionType === "Retur Penjualan" && t.originalTransactionId === trx.id) {
        t.items?.forEach((item: any) => {
          if (item.inventoryId) {
            returnedQtyMap[item.inventoryId] = (returnedQtyMap[item.inventoryId] || 0) + item.quantity;
          }
        });
      }
    });

    const itemsState = (trx.items || []).map((it: any) => {
      const invId = it.inventoryId || "";
      const name = it.inventoryItem?.itemName || it.inventoryItem?.item_name || it.itemName || it.item_name || trx.description || "Produk";
      const unitPrice = it.unitPrice || 0;
      const originalQty = it.quantity || 0;
      const alreadyReturned = returnedQtyMap[invId] || 0;
      const maxQty = Math.max(0, originalQty - alreadyReturned);
      
      let serialNumbers: string[] = [];
      if (it.serialNumbers) {
        try {
          serialNumbers = typeof it.serialNumbers === "string" ? JSON.parse(it.serialNumbers) : it.serialNumbers;
        } catch (e) {
          console.error("Failed to parse serial numbers", e);
        }
      }

      return {
        inventoryId: invId,
        itemName: name,
        unitPrice,
        maxQty,
        quantity: 0,
        serialNumbers,
        selectedSNs: []
      };
    });

    setReturnItemsState(itemsState);
    setReturnRefundMethod("Cash");
    setReturnRefundAmount("");
    setReturnReason("");
    setViewDetailTrx(null);
    setShowReturnModal(true);
  };

  const handleReturnQtyChange = (idx: number, qty: number) => {
    const updated = [...returnItemsState];
    updated[idx].quantity = qty;
    
    if (updated[idx].selectedSNs.length > qty) {
      updated[idx].selectedSNs = updated[idx].selectedSNs.slice(0, qty);
    }

    setReturnItemsState(updated);

    const totalRefund = updated.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    setReturnRefundAmount(totalRefund.toLocaleString("id-ID"));
  };

  const handleSNCheckboxChange = (itemIdx: number, sn: string, checked: boolean) => {
    const updated = [...returnItemsState];
    const item = updated[itemIdx];
    if (checked) {
      if (item.selectedSNs.length < item.quantity) {
        item.selectedSNs.push(sn);
      } else {
        toast.warning(`Jumlah SN terpilih tidak boleh melebihi jumlah retur (${item.quantity})`);
      }
    } else {
      item.selectedSNs = item.selectedSNs.filter((s: string) => s !== sn);
    }
    setReturnItemsState(updated);
  };

  const submitReturnTrx = async () => {
    const itemsToReturn = returnItemsState.filter(it => it.quantity > 0);
    if (itemsToReturn.length === 0) {
      toast.error("Silakan tentukan minimal 1 item untuk diretur");
      return;
    }

    for (const item of itemsToReturn) {
      if (item.serialNumbers.length > 0 && item.selectedSNs.length !== item.quantity) {
        toast.error(`Wajib memilih ${item.quantity} nomor seri (SN) untuk item ${item.itemName}`);
        return;
      }
    }

    const parsedAmount = parseCurrencyString(returnRefundAmount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      toast.error("Nominal refund tidak valid");
      return;
    }

    const remainingDebt = returnTrx.amount - (returnTrx.dpAmount || 0);
    if (returnRefundMethod === "Potong Piutang") {
      if (returnTrx.paymentStatus !== "Belum Lunas") {
        toast.error("Hanya transaksi Belum Lunas yang bisa menggunakan Potong Piutang");
        return;
      }
      if (parsedAmount > remainingDebt) {
        toast.error(`Nominal refund melebihi sisa piutang pelanggan (${formatCurrency(remainingDebt)})`);
        return;
      }
    }

    setReturnSubmitting(true);
    try {
      const res = await fetch(('') + `/api/transactions/${returnTrx.id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: itemsToReturn.map(it => ({
            inventoryId: it.inventoryId,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            serialNumbers: it.selectedSNs.length > 0 ? it.selectedSNs : null
          })),
          refundMethod: returnRefundMethod,
          refundAmount: parsedAmount,
          reason: returnReason
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal memproses retur");

      toast.success("Retur dan refund berhasil diproses!");
      setShowReturnModal(false);
      mutateTransactions();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Gagal memproses retur");
    } finally {
      setReturnSubmitting(false);
    }
  };

  const executeLunasiTrx = async (id: string) => {
    try {
      const res = await fetch(('') + `/api/transactions/${id}`, { method: 'PATCH' });
      if (res.ok) {
        toast.success("Transaksi berhasil dilunasi");
        mutateTransactions();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Gagal melunasi transaksi");
      }
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan sistem");
    }
  }

  const handleLunasiTrx = async (id: string) => {
    const confirmed = await confirm({
      title: "Lunasi Tagihan?",
      description: "Jurnal Kas akan bertambah sesuai sisa tagihan.",
      confirmLabel: "Lunasi",
    });
    if (confirmed) {
      executeLunasiTrx(id);
    }
  }

  const filtered = allTransactions.filter(filterTransaction);
  
  const totalIncome = filtered.filter((t: any) => ["Penjualan","Jasa Servis"].includes(t.transactionType)).reduce((s: any,t: any)=>s+t.amount,0)
  const totalOut = filtered.filter((t: any) => ["Operasional","Pembelian Stok","Retur Penjualan"].includes(t.transactionType)).reduce((s: any,t: any)=>s+t.amount,0)
  const modalIn = filtered.filter((t: any) => t.transactionType === "Modal Baru").reduce((s: any,t: any)=>s+t.amount,0)
  const modalOut = filtered.filter((t: any) => t.transactionType === "Prive").reduce((s: any,t: any)=>s+t.amount,0)
  const mutasiModal = modalIn - modalOut

  return (
    <div className="space-y-3 text-left">
      <div className="flex flex-col gap-2">
        <Card>
          <CardHeader className="pb-3 pt-4 px-4 border-b border-border/50">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Riwayat Transaksi</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Search / Filters Bar */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="Cari pelanggan, tipe, status..." 
                    value={historyFilter} 
                    onChange={e => setHistoryFilter(e.target.value)} 
                    className="pl-8 h-8 text-[11px] w-[180px] bg-muted/20"
                  />
                </div>
                
                <div className="relative">
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => setShowFilterMenu(!showFilterMenu)}>
                    <Filter className="h-3.5 w-3.5" />
                  </Button>
                  
                  {showFilterMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowFilterMenu(false)} />
                      <div className="absolute right-0 top-full mt-1 w-[220px] rounded-md border bg-popover text-popover-foreground shadow-md outline-none z-50 p-2 animate-in fade-in-80 zoom-in-95">
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-medium text-muted-foreground px-1">Periode</label>
                            <ModernSelect
                              value={historyPeriod}
                              onChange={(val) => setHistoryPeriod(val)}
                              options={[
                                { value: "Semua Waktu", label: "Semua Waktu" },
                                { value: "Hari Ini", label: "Hari Ini" },
                                { value: "Bulan Ini", label: "Bulan Ini" },
                                { value: "Tahun Ini", label: "Tahun Ini" }
                              ]}
                            />
                          </div>
                          
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-medium text-muted-foreground px-1">Kategori</label>
                            <ModernSelect
                              value={historyType}
                              onChange={(val) => setHistoryType(val)}
                              options={[
                                { value: "", label: "Semua Tipe" },
                                { value: "Penjualan", label: "Penjualan" },
                                { value: "Jasa Servis", label: "Jasa Servis" },
                                { value: "Pembelian Stok", label: "Pembelian" },
                                { value: "Operasional", label: "Pengeluaran" },
                                { value: "Modal Baru", label: "Modal Baru" },
                                { value: "Prive", label: "Prive" }
                              ]}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-medium text-muted-foreground px-1">Status Piutang</label>
                            <Button 
                              variant={historyFilter === "Belum Lunas" ? "default" : "outline"}
                              size="sm"
                              className={cn("w-full h-7 text-[10px] justify-center", historyFilter === "Belum Lunas" ? "bg-amber-500 hover:bg-amber-600 text-white" : "text-amber-600 border-amber-200 hover:bg-amber-50")}
                              onClick={() => {
                                setHistoryFilter(historyFilter === "Belum Lunas" ? "" : "Belum Lunas");
                                setShowFilterMenu(false);
                              }}
                            >
                              Piutang (Belum Lunas)
                            </Button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs gap-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 shrink-0 font-semibold" onClick={() => {
                  const headers = ["Tanggal", "Pelanggan/Keterangan", "Tipe", "Kategori", "Metode", "Status", "Jumlah", "DP", "Sisa"];
                  const rows = filtered.flatMap((trx: any) => {
                    let expanded = [{...trx, _displayCategory: trx.items?.[0]?.inventoryItem?.category, originalId: trx.id, displayAmount: trx.amount}];
                    if (trx.items && trx.items.length > 1 && ["Penjualan", "Pembelian Stok", "Retur Penjualan"].includes(trx.transactionType)) {
                      const groups = new Map();
                      trx.items.forEach((item: any) => {
                        const cat = item.inventoryItem?.category || "Lain-lain";
                        if (!groups.has(cat)) groups.set(cat, { amount: 0 });
                        groups.get(cat).amount += item.quantity * item.unitPrice;
                      });
                      if (groups.size > 1) {
                        expanded = Array.from(groups.entries()).map(([cat, data], idx) => ({
                          ...trx, id: `${trx.id}-${idx}`, originalId: trx.id, displayAmount: data.amount, _displayCategory: cat, _isSplit: true
                        }));
                      }
                    }
                    return expanded;
                  }).map((trx: any) => {
                    const isExpense = ["Operasional","Pembelian Stok", "Retur Penjualan"].includes(trx.transactionType);
                    const isModal = ["Modal Baru","Prive"].includes(trx.transactionType);
                    let sign = "";
                    if (isExpense) sign = "-";
                    else if (isModal && trx.transactionType === "Prive") sign = "-";
                    
                    const dp = trx.dpAmount || 0;
                    const sisa = trx.amount - dp;
                    return [
                      new Date(trx.transactionDate).toLocaleDateString('id-ID'),
                      `"${(trx.customerName || trx.description || '-').replace(/"/g, '""')}"`,
                      trx.transactionType,
                      trx._displayCategory || "-",
                      trx.paymentMethod || "-",
                      trx.paymentStatus || "-",
                      `${sign}${trx.displayAmount}`,
                      dp,
                      trx.paymentStatus === "Belum Lunas" || trx.paymentMethod === "Tempo" ? sisa : 0
                    ].join(";");
                  });
                  const csvString = "\uFEFF" + [headers.join(";"), ...rows].join("\n");
                  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
                  const link = document.createElement("a");
                  link.href = URL.createObjectURL(blob);
                  link.setAttribute("download", `Riwayat_Transaksi_${new Date().toISOString().split('T')[0]}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}>
                  <Download className="h-4 w-4" />
                  <span className="hidden md:inline">Export CSV</span>
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-3">
              <div className="flex-1 min-w-[70px] rounded-md border bg-emerald-500/10 px-1.5 py-1 text-center">
                <p className="text-[8px] md:text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Uang Masuk</p>
                <p className="font-bold text-[10px] md:text-xs text-emerald-600 truncate">{formatCurrency(totalIncome)}</p>
              </div>
              <div className="flex-1 min-w-[70px] rounded-md border bg-destructive/10 px-1.5 py-1 text-center">
                <p className="text-[8px] md:text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Uang Keluar</p>
                <p className="font-bold text-[10px] md:text-xs text-destructive truncate">{formatCurrency(totalOut)}</p>
              </div>
              <div className="flex-1 min-w-[70px] rounded-md border bg-indigo-500/10 px-1.5 py-1 text-center">
                <p className="text-[8px] md:text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Modal Mutasi</p>
                <p className={`font-bold text-[10px] md:text-xs truncate ${mutasiModal >= 0 ? "text-indigo-600" : "text-destructive"}`}>
                  {mutasiModal >= 0 ? "+" : ""}{formatCurrency(mutasiModal)}
                </p>
              </div>
              <div className="flex-1 min-w-[50px] rounded-md border bg-primary/10 px-1.5 py-1 text-center">
                <p className="text-[8px] md:text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Total Trx</p>
                <p className="font-bold text-[10px] md:text-xs text-primary truncate">{filtered.length}</p>
              </div>
            </div>

            {historyLoading ? (
              <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[600px]">
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="w-[110px] py-2 text-xs">Tanggal / No.</TableHead>
                      <TableHead className="py-2 text-xs">Pelanggan/Keterangan</TableHead>
                      <TableHead className="w-[125px] py-2 text-xs">Kategori/Tipe</TableHead>
                      <TableHead className="w-[95px] py-2 text-xs">Status</TableHead>
                      <TableHead className="w-[115px] py-2 text-xs text-left">Jumlah</TableHead>
                      <TableHead className="w-[85px] text-center py-2 text-xs">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs">Tidak ada transaksi ditemukan.</TableCell></TableRow>
                    ) : filtered.flatMap((trx: any) => {
                      let expanded = [{...trx, _displayCategory: trx.items?.[0]?.inventoryItem?.category, originalId: trx.id, displayAmount: trx.amount}];
                      if (trx.items && trx.items.length > 1 && ["Penjualan", "Pembelian Stok", "Retur Penjualan"].includes(trx.transactionType)) {
                        const groups = new Map();
                        trx.items.forEach((item: any) => {
                          const cat = item.inventoryItem?.category || "Lain-lain";
                          if (!groups.has(cat)) groups.set(cat, { amount: 0 });
                          groups.get(cat).amount += item.quantity * item.unitPrice;
                        });
                        if (groups.size > 1) {
                          expanded = Array.from(groups.entries()).map(([cat, data], idx) => ({
                            ...trx,
                            id: `${trx.id}-${idx}`,
                            originalId: trx.id,
                            displayAmount: data.amount,
                            _displayCategory: cat,
                            _isSplit: true
                          }));
                        }
                      }
                      return expanded;
                    }).map((trx: any) => {
                      const isIncome = ["Penjualan","Jasa Servis"].includes(trx.transactionType)
                      const isExpense = ["Operasional","Pembelian Stok", "Retur Penjualan"].includes(trx.transactionType)
                      const isModal = ["Modal Baru","Prive"].includes(trx.transactionType)
                      
                      let sign = ""
                      let colorClass = ""
                      let badgeClass = ""
                      
                      if (isIncome) {
                        sign = "+"
                        colorClass = "text-emerald-600 font-bold"
                        badgeClass = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      } else if (isExpense) {
                        sign = "-"
                        colorClass = "text-destructive font-bold"
                        badgeClass = "bg-destructive/10 text-destructive"
                      } else if (isModal) {
                        sign = trx.transactionType === "Modal Baru" ? "+" : "-"
                        colorClass = trx.transactionType === "Modal Baru" ? "text-indigo-600 font-bold" : "text-destructive font-bold"
                        badgeClass = "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                      }

                      const dp = trx.dpAmount || 0;
                      const isBelumLunas = trx.paymentStatus === "Belum Lunas";

                      return (
                        <TableRow key={trx.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => handleOpenDetail(trx)}>
                          <TableCell className="text-muted-foreground text-[11px] py-2 whitespace-nowrap">
                            <div>{new Date(trx.transactionDate).toLocaleDateString('id-ID')}</div>
                            <div className="font-mono text-[9px] text-muted-foreground/70">{trx.invoiceNumber || trx.id.substring(0,8).toUpperCase()}</div>
                          </TableCell>
                          <TableCell className="max-w-[180px] py-2 truncate font-medium text-[12px]">{trx.customerName || trx.description || '-'}</TableCell>
                          <TableCell className="py-2">
                            <div className="flex flex-col gap-1 items-start">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold whitespace-nowrap ${badgeClass}`}>
                                {trx.transactionType}
                                {trx._displayCategory && (
                                  <span className="ml-1 pl-1 border-l border-current/30 text-[9px] opacity-90 truncate max-w-[100px]">
                                    {trx._displayCategory}
                                  </span>
                                )}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-[11px] py-2 text-muted-foreground whitespace-nowrap">
                            <div className="flex flex-col gap-1 items-start">
                              <div className="flex items-center gap-1.5">
                                <span>{trx.paymentMethod || '-'}</span>
                                {isBelumLunas && (
                                  <span className="inline-flex px-1 py-0.5 rounded-sm bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[9px] font-bold uppercase tracking-wider">
                                    Belum Lunas
                                  </span>
                                )}
                              </div>
                              {isBelumLunas && trx.dueDate && (
                                <span className={cn(
                                  "inline-flex px-1 py-0.5 rounded-sm text-[9px] font-medium items-center gap-1",
                                  new Date(trx.dueDate) < new Date() 
                                    ? "bg-destructive/10 text-destructive font-bold" 
                                    : "bg-muted text-muted-foreground"
                                )}>
                                  <AlertCircle className="w-3 h-3" />
                                  Tempo: {new Date(trx.dueDate).toLocaleDateString('id-ID')}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap py-2 text-left">
                            <div className={`font-bold tabular-nums text-[12px] ${colorClass}`}>
                              {sign}{formatCurrency(trx.displayAmount)}
                            </div>
                          </TableCell>
                          <TableCell className="py-2" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                {isIncome && (
                                  <PrintActionDropdown 
                                    trx={trx} 
                                    onPrintA4={handlePrintFromHistory} 
                                    onWhatsApp={handleWhatsAppNota}
                                  />
                                )}
                                {isBelumLunas && !isInvestor && (
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 rounded" title="Lunasi Sisa Tagihan" onClick={() => handleLunasiTrx(trx.originalId)}>
                                    <CheckCircle className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {isOwner && (
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10 hover:text-destructive rounded" title="Hapus Transaksi" onClick={() => handleDeleteTrx(trx.originalId)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* DETAIL TRANSACTION MODAL */}
      {viewDetailTrx && (
        <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-3 md:p-4" onClick={() => setViewDetailTrx(null)}>
          <div className="bg-card w-full max-w-[calc(100vw-1.5rem)] md:max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-xl shadow-lg border p-4 md:p-6 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4 border-b pb-4">
              <div className="min-w-0 pr-2">
                <h3 className="text-base md:text-lg font-bold truncate">Detail Transaksi</h3>
                <p className="text-xs md:text-sm text-muted-foreground truncate">
                  {new Date(viewDetailTrx.transactionDate).toLocaleString('id-ID')}
                  <span className="mx-1 md:mx-2">•</span>
                  <span className="font-mono text-[10px] md:text-xs">{viewDetailTrx.invoiceNumber || (viewDetailTrx.originalId || viewDetailTrx.id).substring(0,8).toUpperCase()}</span>
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="inline-block px-2 py-1 rounded bg-primary/10 text-primary text-[10px] md:text-xs font-semibold">
                  {viewDetailTrx.transactionType}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6 text-xs md:text-sm">
              <div className="min-w-0">
                <p className="text-muted-foreground text-[10px] md:text-xs mb-1 truncate">Pelanggan/Keterangan</p>
                <p className="font-semibold truncate">{viewDetailTrx.customerName || viewDetailTrx.description || '-'}</p>
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-[10px] md:text-xs mb-1 truncate">Metode Pembayaran</p>
                <p className="font-semibold truncate">{viewDetailTrx.paymentMethod || '-'} ({viewDetailTrx.paymentStatus || 'Lunas'})</p>
                {viewDetailTrx.paymentStatus === "Belum Lunas" && (
                  <div className="mt-1 flex flex-col sm:flex-row sm:items-center sm:gap-2 text-[10px] md:text-xs">
                    <span className="text-muted-foreground truncate">DP: {formatCurrency(viewDetailTrx.dpAmount || 0)}</span>
                    <span className="font-semibold text-destructive truncate">Sisa: {formatCurrency((viewDetailTrx.amount || 0) - (viewDetailTrx.dpAmount || 0))}</span>
                    {viewDetailTrx.dueDate && (
                      <span className={cn(
                        "font-semibold truncate", 
                        new Date(viewDetailTrx.dueDate) < new Date() ? "text-destructive" : "text-amber-600"
                      )}>
                        Tempo: {new Date(viewDetailTrx.dueDate).toLocaleDateString('id-ID')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {viewDetailTrx.items && viewDetailTrx.items.length > 0 && (
              <div className="mb-6 w-full overflow-hidden">
                <h4 className="font-semibold text-sm mb-2">Item Transaksi</h4>
                <div className="border rounded-lg w-full overflow-x-auto scrollbar-none">
                  <Table className="min-w-max">
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="py-2 text-xs">Item</TableHead>
                        <TableHead className="py-2 text-xs text-right">Qty</TableHead>
                        <TableHead className="py-2 text-xs text-right">Harga Jual</TableHead>
                        {viewDetailTrx.transactionType === "Penjualan" && !isKasir && (
                          <>
                            <TableHead className="py-2 text-xs text-right">COGS</TableHead>
                            <TableHead className="py-2 text-xs text-right">Margin</TableHead>
                          </>
                        )}
                        <TableHead className="py-2 text-xs text-right">Total Jual</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewDetailTrx.items.map((it: any) => {
                        const cogsPerItem = it.inventoryItem?.costPrice || 0;
                        const marginPerItem = it.unitPrice - cogsPerItem;
                        return (
                          <TableRow key={it.id}>
                            <TableCell className="py-2 text-xs max-w-[200px] truncate" title={it.inventoryItem ? it.inventoryItem.itemName : 'Item'}>
                              {it.inventoryItem ? it.inventoryItem.itemName : it.itemName || 'Item'}
                            </TableCell>
                            <TableCell className="py-2 text-xs text-right">{it.quantity}</TableCell>
                            <TableCell className="py-2 text-xs text-right">{formatCurrency(it.unitPrice)}</TableCell>
                            {viewDetailTrx.transactionType === "Penjualan" && !isKasir && (
                              <>
                                <TableCell className="py-2 text-xs text-right text-destructive">{formatCurrency(cogsPerItem)}</TableCell>
                                <TableCell className="py-2 text-xs text-right text-emerald-600 font-medium">{formatCurrency(marginPerItem)}</TableCell>
                              </>
                            )}
                            <TableCell className="py-2 text-xs text-right font-semibold">{formatCurrency(it.quantity * it.unitPrice)}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="bg-muted/30 p-4 rounded-lg space-y-2 border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Transaksi</span>
                <span className="font-bold">{formatCurrency(viewDetailTrx.amount)}</span>
              </div>
              
              {viewDetailTrx.transactionType === "Penjualan" && !isKasir && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Harga Pokok Penjualan (COGS)</span>
                    <span className="font-semibold text-destructive">
                      -{formatCurrency(viewDetailTrx.journals?.find((j: any) => j.accountName === "HPP")?.debit || 0)}
                    </span>
                  </div>
                  <div className="pt-2 mt-2 border-t flex justify-between text-sm">
                    <span className="font-semibold text-foreground">Gross Margin (Laba Kotor)</span>
                    <span className="font-bold text-emerald-600">
                      {formatCurrency(viewDetailTrx.amount - (viewDetailTrx.journals?.find((j: any) => j.accountName === "HPP")?.debit || 0))}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              {viewDetailTrx.paymentStatus === "Belum Lunas" && !isInvestor && (
                <Button variant="default" className="flex-1 sm:flex-none bg-amber-500 hover:bg-amber-600 text-white px-2 sm:px-4" onClick={() => handlePayOff(viewDetailTrx.id)}>
                  <CheckCircle className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Tandai</span> Lunas
                </Button>
              )}
              {(isOwner || isManager) && (
                <Button variant="outline" className="flex-1 sm:flex-none text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 sm:px-4" onClick={() => onStartEdit(viewDetailTrx)}>
                  <Edit2 className="h-4 w-4 mr-1 sm:mr-2" />
                  Edit
                </Button>
              )}
              {viewDetailTrx.transactionType === "Penjualan" && !isInvestor && (
                <Button variant="outline" className="flex-1 sm:flex-none text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200 px-2 sm:px-4" onClick={() => handleOpenReturnModal(viewDetailTrx)}>
                  <TrendingDown className="h-4 w-4 mr-1 sm:mr-2" />
                  Retur / Refund
                </Button>
              )}
              {["Penjualan", "Jasa Servis"].includes(viewDetailTrx.transactionType) && (
                <Button variant="outline" className="flex-1 sm:flex-none text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 px-2 sm:px-4" onClick={() => handleWhatsAppNota(viewDetailTrx)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 sm:mr-2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  Kirim WA
                </Button>
              )}
              <Button variant="secondary" className="flex-1 sm:flex-none px-2 sm:px-4" onClick={() => {
                  const storeName = viewDetailTrx.store?.name || storeSettings?.storeName || localStorage.getItem("storeName") || "HanLaptop";
                  const storeAddress = viewDetailTrx.store?.address || storeSettings?.storeAddress || localStorage.getItem("storeAddress") || "Jl. Komputer Raya No.123";
                  const storePhone = viewDetailTrx.store?.phone || storeSettings?.storePhone || localStorage.getItem("storePhone") || "0812-3456-7890";
                  const storeLogo = viewDetailTrx.store?.logo || storeSettings?.storeLogo || localStorage.getItem("storeLogo") || undefined;
                  const rawFooter = viewDetailTrx.store?.footer || storeSettings?.storeFooter || localStorage.getItem("storeFooter") || undefined;
                  const storeFooter = rawFooter ? rawFooter.split("|||")[0] : undefined;
                  const storeBanks = viewDetailTrx.store?.banks || storeSettings?.storeBanks || [];
                  const enrichedTrx = {
                    ...viewDetailTrx,
                    creatorName: viewDetailTrx.creatorName || viewDetailTrx.userName || 'Kasir',
                    items: (viewDetailTrx.items || []).map((it: any) => ({
                      ...it,
                      itemName: it.inventoryItem?.itemName || it.inventoryItem?.item_name || it.itemName || it.item_name || it.name || viewDetailTrx.description || 'Produk',
                    })),
                  };
                  printThermalReceipt(enrichedTrx, { name: storeName, address: storeAddress, phone: storePhone, logo: storeLogo, footer: storeFooter, banks: storeBanks });
              }}>
                <Printer className="h-4 w-4 mr-1 sm:mr-2" />
                Cetak
              </Button>
              <Button variant="outline" className="flex-1 sm:flex-none px-2 sm:px-4" onClick={() => setViewDetailTrx(null)}>Tutup</Button>
            </div>
          </div>
        </div>
      )}

      {/* RETUR & REFUND MODAL */}
      {showReturnModal && returnTrx && (
        <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-3 md:p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl shadow-lg border p-4 md:p-6 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4 border-b pb-4">
              <div>
                <h3 className="text-base md:text-lg font-bold">Proses Retur & Refund</h3>
                <p className="text-xs text-muted-foreground">
                  Nota Asli: <span className="font-mono">{returnTrx.invoiceNumber}</span>
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setShowReturnModal(false)}>×</Button>
            </div>

            <div className="space-y-6 text-sm">
              {/* Items List */}
              <div>
                <h4 className="font-semibold text-xs md:text-sm mb-2 text-foreground">Pilih Item yang Diretur:</h4>
                <div className="space-y-3">
                  {returnItemsState.map((item, idx) => {
                    if (item.maxQty <= 0) {
                      return (
                        <div key={item.inventoryId} className="flex justify-between items-center p-3 rounded-lg border bg-muted/40 opacity-60">
                          <div>
                            <p className="font-medium text-xs md:text-sm">{item.itemName}</p>
                            <p className="text-[10px] text-muted-foreground">Semua item sudah diretur sebelumnya</p>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={item.inventoryId} className="p-3 rounded-lg border bg-muted/20 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                          <div>
                            <p className="font-medium text-xs md:text-sm">{item.itemName}</p>
                            <p className="text-[10px] text-muted-foreground">Harga Jual: {formatCurrency(item.unitPrice)} | Sisa Stok Beli: {item.maxQty}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                            <label className="text-xs font-medium text-muted-foreground">Qty Retur:</label>
                            <Input
                              type="number"
                              min="0"
                              max={item.maxQty}
                              value={item.quantity}
                              onChange={(e) => {
                                const val = Math.min(item.maxQty, Math.max(0, parseInt(e.target.value) || 0));
                                handleReturnQtyChange(idx, val);
                              }}
                              className="w-16 h-8 text-center text-xs md:text-sm"
                            />
                          </div>
                        </div>
                        
                        {item.serialNumbers.length > 0 && item.quantity > 0 && (
                          <div className="pt-2 border-t border-dashed">
                            <p className="text-[10px] font-semibold text-muted-foreground mb-1">Pilih Nomor Seri (SN) yang Diretur ({item.selectedSNs.length}/{item.quantity}):</p>
                            <div className="flex flex-wrap gap-1.5">
                              {item.serialNumbers.map((sn: string) => {
                                const isChecked = item.selectedSNs.includes(sn);
                                return (
                                  <button
                                    key={sn}
                                    type="button"
                                    onClick={() => handleSNCheckboxChange(idx, sn, !isChecked)}
                                    className={cn(
                                      "px-2 py-0.5 rounded text-[10px] border font-mono font-medium transition-colors",
                                      isChecked
                                        ? "bg-amber-500 text-white border-amber-500"
                                        : "bg-background text-muted-foreground hover:bg-muted"
                                    )}
                                  >
                                    {sn}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Refund Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Metode Refund</label>
                  <ModernSelect
                    value={returnRefundMethod}
                    onChange={(val) => setReturnRefundMethod(val)}
                    options={[
                      { value: "Cash", label: "Cash" },
                      { value: "Transfer Bank", label: "Transfer Bank" },
                      { value: "QRIS", label: "QRIS" },
                      ...(returnTrx.paymentStatus === "Belum Lunas" ? [{ value: "Potong Piutang", label: "Potong Piutang (Kurangi Tagihan)" }] : [])
                    ]}
                  />
                  {returnRefundMethod === "Potong Piutang" && (
                    <p className="text-[10px] text-amber-600 font-semibold">
                      Sisa Piutang Saat Ini: {formatCurrency(returnTrx.amount - (returnTrx.dpAmount || 0))}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Nominal Refund (IDR)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs md:text-sm font-semibold text-muted-foreground">Rp</span>
                    <Input
                      className="pl-8 h-9 text-xs md:text-sm font-bold text-emerald-600"
                      placeholder="0"
                      value={returnRefundAmount}
                      onChange={(e) => handleCurrencyInput(e.target.value, setReturnRefundAmount)}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Nominal otomatis dihitung dari item retur, tetapi dapat disesuaikan manual.</p>
                </div>
              </div>

              <div className="space-y-2 border-t pt-4">
                <label className="text-xs font-semibold text-muted-foreground">Alasan Retur</label>
                <textarea
                  className="w-full min-h-[70px] rounded-md border border-input bg-transparent px-3 py-2 text-xs md:text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Tuliskan alasan retur barang..."
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                />
              </div>

              <div className="flex gap-3 justify-end border-t pt-4">
                <Button variant="outline" size="sm" onClick={() => setShowReturnModal(false)}>Batal</Button>
                <Button 
                  onClick={submitReturnTrx} 
                  disabled={returnSubmitting}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-semibold"
                  size="sm"
                >
                  {returnSubmitting ? "Memproses..." : "Proses Retur & Refund"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {dialog}
    </div>
  )
}
export default HistoryTab

