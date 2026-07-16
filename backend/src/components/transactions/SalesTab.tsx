import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Trash2, Printer, FileText, ScanLine } from "lucide-react"
import { toast } from "sonner"
import useSWR from "swr"
import { Autocomplete } from "@/components/ui/autocomplete"
import { ModernSelect } from "@/components/ui/modern-select"
import { CameraScanner } from "@/components/CameraScanner"

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value)
}

const handleCurrencyInput = (val: string, setter: (v: string) => void) => {
  const digits = val.replace(/\D/g, "")
  if (!digits) {
    setter("")
    return
  }
  setter(parseInt(digits, 10).toLocaleString('id-ID'))
}

const parseCurrencyString = (val: string) => {
  if (!val) return 0
  return parseFloat(val.replace(/\D/g, "")) || 0
}

interface SalesTabProps {
  active: boolean
  onPrint: (data: any) => void
  editingTrx: any
  onCancelEdit: () => void
  onSuccess: () => void
}

export function SalesTab({ active, onPrint, editingTrx, onCancelEdit, onSuccess }: SalesTabProps) {
  // SWR fetches
  const { data: inventoryData, mutate: mutateInventory } = useSWR('/api/inventory?fetchAll=true')
  const { data: customersData } = useSWR('/api/customers')
  const { data: storeSettings } = useSWR<any>('/api/settings')

  const inventoryItems = Array.isArray(inventoryData) 
    ? inventoryData.map((item: any) => ({
        id: item.id,
        name: item.itemName,
        price: item.sellingPrice,
        stock: item.quantity,
        category: item.category,
        barcode: item.barcode,
        tracksSerialNumber: item.tracksSerialNumber
      }))
    : []

  const customersList = Array.isArray(customersData) ? customersData : []

  // Local state
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerAddress, setCustomerAddress] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("Cash")
  const [paymentStatus, setPaymentStatus] = useState("Lunas")
  const [cart, setCart] = useState<{ 
    id: string; 
    name: string; 
    price: number; 
    qty: number; 
    discountType?: "nominal" | "percent"; 
    discountValue?: number; 
    category?: string;
    tracksSerialNumber?: boolean;
    serialNumbers?: string[];
  }[]>([])

  const [searchQuery, setSearchQuery] = useState("")
  const [dpAmount, setDpAmount] = useState("")
  const [discountAmount, setDiscountAmount] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Barcode Scanner State
  const [barcodeBuffer, setBarcodeBuffer] = useState("")
  const [lastKeystrokeTimeState, setLastKeystrokeTimeState] = useState(Date.now())
  const [showCameraScanner, setShowCameraScanner] = useState(false)

  // Load draft from localStorage on mount
  useEffect(() => {
    if (editingTrx) return;
    
    const storeId = localStorage.getItem('selectedStoreId') || 'all';
    const draftStr = localStorage.getItem(`sales_draft_${storeId}`);
    if (draftStr) {
      try {
        const draft = JSON.parse(draftStr);
        if (draft.customerName !== undefined) setCustomerName(draft.customerName);
        if (draft.customerPhone !== undefined) setCustomerPhone(draft.customerPhone);
        if (draft.customerAddress !== undefined) setCustomerAddress(draft.customerAddress);
        if (draft.paymentMethod !== undefined) setPaymentMethod(draft.paymentMethod);
        if (draft.paymentStatus !== undefined) setPaymentStatus(draft.paymentStatus);
        if (draft.cart !== undefined) setCart(draft.cart);
        if (draft.dpAmount !== undefined) setDpAmount(draft.dpAmount);
        if (draft.discountAmount !== undefined) setDiscountAmount(draft.discountAmount);
        if (draft.dueDate !== undefined) setDueDate(draft.dueDate);
      } catch (e) {
        console.error("Failed to parse sales draft", e);
      }
    }
  }, [editingTrx]);

  // Save draft to localStorage when states change
  useEffect(() => {
    if (editingTrx) return;
    
    const storeId = localStorage.getItem('selectedStoreId') || 'all';
    const draft = {
      customerName,
      customerPhone,
      customerAddress,
      paymentMethod,
      paymentStatus,
      cart,
      dpAmount,
      discountAmount,
      dueDate
    };
    
    const hasContent = cart.length > 0 || customerName || customerPhone || customerAddress || discountAmount || dpAmount || dueDate;
    if (hasContent) {
      localStorage.setItem(`sales_draft_${storeId}`, JSON.stringify(draft));
    } else {
      localStorage.removeItem(`sales_draft_${storeId}`);
    }
  }, [customerName, customerPhone, customerAddress, paymentMethod, paymentStatus, cart, dpAmount, discountAmount, dueDate, editingTrx]);

  // Re-fetch inventory when tab becomes active
  useEffect(() => {
    if (active) {
      mutateInventory()
    }
  }, [active, mutateInventory])

  // Automatically release/turn off webcam when switching tabs
  useEffect(() => {
    if (!active && showCameraScanner) {
      setShowCameraScanner(false)
    }
  }, [active, showCameraScanner])

  // Populate from editingTrx if applicable
  useEffect(() => {
    if (editingTrx && editingTrx.transactionType === "Penjualan" && active) {
      setCustomerName(editingTrx.customerName || "")
      setCustomerPhone(editingTrx.customerPhone || "")
      setCustomerAddress(editingTrx.customerAddress || "")
      setPaymentMethod(editingTrx.paymentMethod || "Cash")
      setPaymentStatus(editingTrx.paymentStatus || "Lunas")
      setDpAmount(editingTrx.dpAmount ? editingTrx.dpAmount.toString() : "")
      setDueDate(editingTrx.dueDate ? new Date(editingTrx.dueDate).toISOString().split('T')[0] : "")
      
      const savedDiscount = editingTrx.discountAmount || 0
      setDiscountAmount(savedDiscount > 0 ? savedDiscount.toLocaleString('id-ID') : "")

      if (editingTrx.items && editingTrx.items.length > 0) {
        setCart(editingTrx.items.map((it: any) => {
          let serialNumbers: string[] = []
          if (it.serialNumbers) {
            try {
              serialNumbers = typeof it.serialNumbers === 'string' 
                ? JSON.parse(it.serialNumbers) 
                : it.serialNumbers
            } catch (e) {
              serialNumbers = []
            }
          }
          return {
            id: it.inventoryId || it.id,
            name: it.inventoryItem ? it.inventoryItem.itemName : it.itemName || 'Item',
            price: it.unitPrice,
            qty: it.quantity,
            category: it.inventoryItem?.category,
            tracksSerialNumber: it.inventoryItem?.tracksSerialNumber,
            serialNumbers
          }
        }))
      }
    }
  }, [editingTrx, active])

  const processBarcodeScan = (barcode: string) => {
    const matchedItem = inventoryItems.find(i => i.barcode === barcode);
    if (matchedItem) {
      if (matchedItem.stock <= 0) {
        toast.error(`Stok habis untuk: ${matchedItem.name}`);
      } else {
        setCart(prev => {
          const existing = prev.find(item => item.id === matchedItem.id);
          if (existing) {
            if (existing.qty >= matchedItem.stock) {
              toast.error(`Stok tidak mencukupi untuk: ${matchedItem.name}`);
              return prev;
            }
            toast.success(`Ditambahkan ke keranjang: ${matchedItem.name}`);
            return prev.map(item => item.id === matchedItem.id 
              ? { 
                  ...item, 
                  qty: item.qty + 1, 
                  serialNumbers: matchedItem.tracksSerialNumber 
                    ? (item.serialNumbers ? [...item.serialNumbers, ""] : [""]) 
                    : [] 
                } 
              : item
            );
          }
          toast.success(`Ditambahkan ke keranjang: ${matchedItem.name}`);
          return [...prev, { 
            id: matchedItem.id, 
            name: matchedItem.name, 
            price: matchedItem.price, 
            qty: 1, 
            category: matchedItem.category, 
            tracksSerialNumber: matchedItem.tracksSerialNumber,
            serialNumbers: matchedItem.tracksSerialNumber ? [""] : [] 
          }];
        });
      }
    } else {
      toast.error(`Barcode tidak ditemukan: ${barcode}`);
    }
  };

  // Keyboard scanner listener
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeystrokeTimeState;

      if (e.key === 'Enter') {
        if (barcodeBuffer.length > 0) {
          processBarcodeScan(barcodeBuffer);
          setBarcodeBuffer("");
        }
      } else if (e.key.length === 1) {
        if (timeDiff > 50) {
          setBarcodeBuffer(e.key);
        } else {
          setBarcodeBuffer(prev => prev + e.key);
        }
      }
      
      setLastKeystrokeTimeState(currentTime);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [barcodeBuffer, lastKeystrokeTimeState, inventoryItems, active]);

  const addToCart = (product: { id: string; name: string; price: number; category?: string; tracksSerialNumber?: boolean }) => {
    const isTracksSN = product.tracksSerialNumber || false;
    const existing = cart.find((item) => item.id === product.id)
    if (existing) {
      setCart(cart.map((item) => (
        item.id === product.id 
          ? { 
              ...item, 
              qty: item.qty + 1, 
              serialNumbers: isTracksSN 
                ? (item.serialNumbers ? [...item.serialNumbers, ""] : [""]) 
                : [] 
            } 
          : item
      )))
    } else {
      setCart([...cart, { 
        id: product.id, 
        name: product.name, 
        price: product.price, 
        qty: 1, 
        category: product.category, 
        tracksSerialNumber: isTracksSN,
        serialNumbers: isTracksSN ? [""] : [] 
      }])
    }
  }

  const removeFromCart = (id: string) => setCart(cart.filter((item) => item.id !== id))

  const getItemDiscountPerUnit = (item: any) => {
    const type = item.discountType || 'nominal';
    const val = item.discountValue || 0;
    if (type === 'percent') {
      return item.price * (val / 100);
    }
    return val;
  };

  const grossSubtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const totalItemDiscount = cart.reduce((sum, item) => sum + getItemDiscountPerUnit(item) * item.qty, 0)
  const total = grossSubtotal - totalItemDiscount

  const handleSaleSubmit = async (shouldPrint = false) => {
    if (cart.length === 0 || submitting) return
    setSubmitting(true)
    try {
      const transactionType = "Penjualan"
      const url = editingTrx ? `/api/transactions/${editingTrx.id}` : '/api/transactions';
      const method = editingTrx ? 'PUT' : 'POST';
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionType,
          amount: total - parseCurrencyString(discountAmount || "0"),
          discountAmount: totalItemDiscount + parseCurrencyString(discountAmount || "0"),
          customerName,
          customerPhone,
          customerAddress,
          paymentMethod,
          paymentStatus,
          dpAmount: paymentStatus === "Belum Lunas" ? parseCurrencyString(dpAmount) : 0,
          dueDate: (paymentMethod === "Tempo" || paymentStatus === "Belum Lunas") && dueDate ? dueDate : undefined,
          items: cart.map(c => ({ 
            inventoryId: c.id, 
            quantity: c.qty, 
            unitPrice: c.price - getItemDiscountPerUnit(c),
            serialNumbers: c.serialNumbers
          }))
        })
      })
      if (res.ok) {
        const data = await res.json();
        const savedCart = [...cart];
        const savedTotal = total - parseCurrencyString(discountAmount || "0");
        const savedDiscount = totalItemDiscount + parseCurrencyString(discountAmount || "0");
        const savedCustomer = customerName;
        const savedPhone = customerPhone;
        const savedAddress = customerAddress;
        const savedMethod = paymentMethod;
        const savedStatus = paymentStatus;
        const savedDpAmount = paymentStatus === "Belum Lunas" ? parseCurrencyString(dpAmount) : 0;
        const savedDueDate = dueDate;

        // Reset state
        setCart([]); setCustomerName(""); setCustomerPhone(""); setCustomerAddress(""); setDpAmount(""); setDiscountAmount(""); setDueDate("");
        setPaymentMethod("Cash"); setPaymentStatus("Lunas");
        setSearchQuery("");
        
        mutateInventory();
        onSuccess();
        
        if (shouldPrint && !editingTrx) {
          onPrint({ 
            type: "Penjualan", invoiceNum: data.newTx?.invoiceNumber || data.invoiceNumber || `INV-${Date.now()}`, customer: savedCustomer || 'Pelanggan Umum', 
            customerPhone: savedPhone, customerAddress: savedAddress,
            items: savedCart, total: savedTotal, method: savedMethod, status: savedStatus,
            dpAmount: savedDpAmount, discountAmount: savedDiscount, dueDate: savedDueDate
          });
        } else {
          toast.success(editingTrx ? "Transaksi berhasil diubah!" : "Transaksi Penjualan Berhasil!");
          if (editingTrx) onCancelEdit();
        }
      } else {
        const err = await res.json()
        toast.error(`Gagal: ${err.error}`)
      }
    } catch (e) {
      toast.error("Error submitting transaction")
    } finally {
      setSubmitting(false)
    }
  }

  const handlePrintInvoice = () => {
    const now = new Date();
    const invoiceNum = `INV/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/DRAFT-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const dpVal = paymentStatus === "Belum Lunas" ? parseCurrencyString(dpAmount) : 0;
    onPrint({ 
      type: "Penjualan", invoiceNum, customer: customerName || 'Pelanggan Umum', 
      customerPhone, customerAddress,
      items: cart, total: total - parseCurrencyString(discountAmount || "0"), method: paymentMethod, status: paymentStatus,
      dpAmount: dpVal, discountAmount: totalItemDiscount + parseCurrencyString(discountAmount || "0"), dueDate
    })
  }

  return (
    <div className="grid gap-3 md:grid-cols-3 text-left">
      <div className="md:col-span-2 space-y-3">
        <Card>
          <CardHeader className="pb-2 pt-3 px-3 border-b border-border/50">
            <CardTitle className="text-sm">Pilih Barang</CardTitle>
            <CardDescription className="text-[10px]">Cari dan tambahkan barang ke transaksi</CardDescription>
          </CardHeader>
          <CardContent className="pt-2 px-3 pb-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Cari inventaris..." className="pl-8 bg-muted/30 h-8 text-[11px]" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowCameraScanner(true)}
                className="h-8 px-2.5 bg-card hover:bg-muted text-xs border-dashed border-primary/50 shrink-0"
                title="Gunakan Kamera HP sebagai Scanner"
              >
                <ScanLine className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Kamera</span>
              </Button>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border border-emerald-200 dark:border-emerald-500/20 rounded-md shrink-0" title="Scanner Fisik (USB/Bluetooth) siap digunakan">
                <ScanLine className="h-4 w-4" />
                <span className="text-[10px] font-bold hidden sm:inline-block">Scanner Ready</span>
              </div>
            </div>
            <div className="grid gap-1.5 grid-cols-2 sm:grid-cols-3">
              {inventoryItems
                .filter(p => p.stock > 0 && p.category !== "Jasa Servis" && p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .slice(0, 12)
                .map((product) => (
                <div key={product.id} className="flex items-center p-1.5 sm:p-2 rounded-lg border bg-card hover:border-primary/30 hover:bg-primary/5 transition-colors cursor-pointer" onClick={() => addToCart(product)}>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-xs truncate" title={product.name}>{product.name}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-[10px] text-muted-foreground">{formatCurrency(product.price)}</p>
                      <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 rounded">Stok: {product.stock}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4 border-b border-border/50">
            <CardTitle className="text-base">Detail Keranjang</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop: Table layout */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Harga</TableHead>
                    <TableHead className="w-[120px]">Diskon</TableHead>
                    <TableHead className="w-[80px]">Qty</TableHead>
                    <TableHead>Subtotal</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Keranjang kosong</TableCell>
                    </TableRow>
                  ) : (
                    cart.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.name}
                          {item.tracksSerialNumber && (
                            <div className="mt-2 space-y-1">
                              {Array.from({ length: item.qty }).map((_, i) => (
                                <Input 
                                  key={i} 
                                  placeholder={`Serial Number #${i+1}`} 
                                  value={(item.serialNumbers || [])[i] || ""} 
                                  onChange={(e) => {
                                    const newSn = [...(item.serialNumbers || [])];
                                    newSn[i] = e.target.value;
                                    setCart(cart.map(c => c.id === item.id ? {...c, serialNumbers: newSn} : c))
                                  }}
                                  className="h-7 text-[10px]"
                                />
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            value={item.price ? item.price.toLocaleString('id-ID') : ""}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, "")
                              setCart(cart.map((c) => c.id === item.id ? { ...c, price: digits ? parseInt(digits, 10) : 0 } : c))
                            }}
                            className="w-24 h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            placeholder="e.g. 10% / 5.000"
                            value={
                              item.discountType === 'percent'
                                ? (item.discountValue || 0) + '%'
                                : (item.discountValue ? item.discountValue.toLocaleString('id-ID') : '')
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              let discountType: 'nominal' | 'percent' = 'nominal';
                              let discountValue = 0;
                              if (val.endsWith('%')) {
                                discountType = 'percent';
                                discountValue = parseFloat(val.replace(/%/g, '')) || 0;
                              } else {
                                discountType = 'nominal';
                                const digits = val.replace(/\D/g, '');
                                discountValue = digits ? parseInt(digits, 10) : 0;
                              }
                              setCart(cart.map((c) => c.id === item.id ? { ...c, discountType, discountValue } : c));
                            }}
                            className="w-28 h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.qty}
                            onChange={(e) => setCart(cart.map((c) => c.id === item.id ? { ...c, qty: parseInt(e.target.value) || 1 } : c))}
                            className="w-16 h-8"
                            min="1"
                          />
                        </TableCell>
                        <TableCell>{formatCurrency((item.price - getItemDiscountPerUnit(item)) * item.qty)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)} className="text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {/* Mobile: Card-based cart layout */}
            <div className="sm:hidden p-3 space-y-2">
              {cart.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground text-xs">Keranjang kosong</p>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg border bg-card">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs truncate mb-1">{item.name}</p>
                      {item.tracksSerialNumber && (
                        <div className="mb-1 space-y-1">
                          {Array.from({ length: item.qty }).map((_, i) => (
                            <Input 
                              key={i} 
                              placeholder={`SN #${i+1}`} 
                              value={(item.serialNumbers || [])[i] || ""} 
                              onChange={(e) => {
                                const newSn = [...(item.serialNumbers || [])];
                                newSn[i] = e.target.value;
                                setCart(cart.map(c => c.id === item.id ? {...c, serialNumbers: newSn} : c))
                              }}
                              className="h-6 text-[10px] w-full"
                            />
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="text"
                          value={item.price ? item.price.toLocaleString('id-ID') : ""}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "")
                            setCart(cart.map((c) => c.id === item.id ? { ...c, price: digits ? parseInt(digits, 10) : 0 } : c))
                          }}
                          className="h-7 text-xs flex-1"
                        />
                        <span className="text-xs text-muted-foreground font-medium">x</span>
                        <Input
                          type="number"
                          value={item.qty}
                          onChange={(e) => setCart(cart.map((c) => c.id === item.id ? { ...c, qty: parseInt(e.target.value) || 1 } : c))}
                          className="h-7 text-xs text-center w-12 px-1"
                          min="1"
                        />
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground shrink-0">Disc:</span>
                        <Input
                          type="text"
                          placeholder="e.g. 10% / 5.000"
                          value={
                            item.discountType === 'percent'
                              ? (item.discountValue || 0) + '%'
                              : (item.discountValue ? item.discountValue.toLocaleString('id-ID') : '')
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            let discountType: 'nominal' | 'percent' = 'nominal';
                            let discountValue = 0;
                            if (val.endsWith('%')) {
                              discountType = 'percent';
                              discountValue = parseFloat(val.replace(/%/g, '')) || 0;
                            } else {
                              discountType = 'nominal';
                              const digits = val.replace(/\D/g, '');
                              discountValue = digits ? parseInt(digits, 10) : 0;
                            }
                            setCart(cart.map((c) => c.id === item.id ? { ...c, discountType, discountValue } : c));
                          }}
                          className="h-7 text-xs w-full"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-between self-stretch py-0.5 shrink-0 pl-1 border-l border-border/50 ml-1">
                      <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)} className="h-6 w-6 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <p className="text-[11px] font-bold text-primary mt-auto pt-1">{formatCurrency((item.price - getItemDiscountPerUnit(item)) * item.qty)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Panel */}
      <div>
        <Card>
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-base">Ringkasan Penjualan</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nama Customer (Opsional)</label>
              <Autocomplete 
                placeholder="e.g. Budi Santoso" 
                value={customerName} 
                onChange={(val) => {
                  setCustomerName(val)
                  const found = customersList.find((c: any) => c.name === val)
                  if (found) {
                    setCustomerPhone(found.phone || '')
                    setCustomerAddress(found.address || '')
                  }
                }} 
                options={customersList.map((c: any) => c.name)} 
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">No. WA / Telepon</label>
                <Input placeholder="e.g. 08123456789" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="h-8 text-xs" type="tel" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Alamat (Opsional)</label>
                <Input placeholder="e.g. Jl. Merdeka No.10" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Metode Bayar</label>
                <ModernSelect 
                  value={paymentMethod} 
                  onChange={(val) => setPaymentMethod(val)}
                  options={[
                    { value: "Cash", label: "Cash" },
                    { value: "Transfer Bank", label: "Transfer Bank" },
                    { value: "Qris", label: "QRIS" },
                    { value: "Tempo", label: "Tempo" }
                  ]}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Status Pembayaran</label>
                <ModernSelect 
                  value={paymentStatus} 
                  onChange={(val) => setPaymentStatus(val)}
                  options={[
                    { value: "Lunas", label: "Lunas (Paid)" },
                    { value: "Belum Lunas", label: "Belum Lunas" }
                  ]}
                />
              </div>
            </div>
            <div className="space-y-1.5 mt-3">
              <label className="text-sm font-medium">Diskon / Potongan (Rp)</label>
              <Input type="text" placeholder="Opsional (e.g. 50.000)" value={discountAmount} onChange={(e) => handleCurrencyInput(e.target.value, setDiscountAmount)} className="h-9 text-sm" />
            </div>
            {paymentStatus === "Belum Lunas" && (
              <div className="space-y-1.5 border-t pt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-amber-600">DP / Bayar Awal (Rp)</label>
                    <Input type="text" placeholder="e.g. 500.000" value={dpAmount} onChange={(e) => handleCurrencyInput(e.target.value, setDpAmount)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-amber-600">Jatuh Tempo (Opsional)</label>
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-9 text-sm text-foreground/80" />
                  </div>
                </div>
                <div className="flex justify-between text-sm pt-1">
                  <span className="text-muted-foreground">Sisa Piutang:</span>
                  <span className="font-medium text-destructive">{formatCurrency((total - parseCurrencyString(discountAmount || "0")) - parseCurrencyString(dpAmount))}</span>
                </div>
              </div>
            )}
            <div className="border-t pt-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal (Gross)</span>
                <span>{formatCurrency(grossSubtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Diskon</span>
                <span className="text-emerald-600 font-medium">-{formatCurrency(totalItemDiscount + parseCurrencyString(discountAmount || "0"))}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-1.5 border-t mt-1.5">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(total - parseCurrencyString(discountAmount || "0"))}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-2 pt-2 pb-4">
            <Button className="w-full h-9" size="sm" disabled={cart.length === 0 || submitting} onClick={() => handleSaleSubmit(false)}>
              {submitting ? "Memproses..." : "Selesaikan Transaksi"}
            </Button>
            <div className="flex gap-2 w-full">
              <Button className="flex-1 h-9 gap-1 border-primary/50 text-primary hover:bg-primary/5" variant="outline" size="sm" disabled={cart.length === 0 || submitting} onClick={() => handleSaleSubmit(true)}>
                <Printer className="h-4 w-4" />
                Invoice (A4)
              </Button>
              <Button className="flex-1 h-9 gap-1 border-pink-500/50 text-pink-600 hover:bg-pink-500/5" variant="outline" size="sm" disabled={cart.length === 0 || submitting} onClick={handlePrintInvoice}>
                <FileText className="h-4 w-4" />
                Draf A4
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* CAMERA SCANNER MODAL */}
      {showCameraScanner && (
        <CameraScanner 
          onClose={() => setShowCameraScanner(false)} 
          onScanSuccess={(decodedText) => {
            setShowCameraScanner(false);
            processBarcodeScan(decodedText);
          }} 
        />
      )}
    </div>
  )
}
export default SalesTab
