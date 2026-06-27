import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Wrench, Printer, FileText } from "lucide-react"
import { toast } from "sonner"
import useSWR from "swr"
import { Autocomplete } from "@/components/ui/autocomplete"
import { ModernSelect } from "@/components/ui/modern-select"
import { technicianTerms } from "@/lib/technician-data"
import { LAPTOP_MODELS } from "@/data/laptop-models"

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

const commonServices = [
  { desc: "Instal Ulang Windows + Office", price: 150000 },
  { desc: "Cleaning Debu + Ganti Thermal Paste", price: 100000 },
  { desc: "Pemasangan Sparepart (Keyboard/LCD/Baterai)", price: 50000 },
  { desc: "Pengecekan Total / Diagnosa Kerusakan", price: 50000 },
]

interface ServiceTabProps {
  active: boolean
  onPrint: (data: any) => void
  editingTrx: any
  onCancelEdit: () => void
  onSuccess: () => void
}

export function ServiceTab({ active, onPrint, editingTrx, onCancelEdit, onSuccess }: ServiceTabProps) {
  // SWR fetches
  const { data: customersData } = useSWR((import.meta.env.VITE_API_URL || '') + '/api/customers')
  const customersList = Array.isArray(customersData) ? customersData : []
  const { data: suggestionsData, mutate: mutateSuggestions } = useSWR<any>((import.meta.env.VITE_API_URL || '') + '/api/suggestions')
  
  const mergedLaptopModels = Array.from(new Set([
    ...LAPTOP_MODELS,
    ...(Array.isArray(suggestionsData?.laptopModels) ? suggestionsData.laptopModels : [])
  ]))

  // Service form state
  const [serviceCustomer, setServiceCustomer] = useState("")
  const [servicePhone, setServicePhone] = useState("")
  const [serviceAddress, setServiceAddress] = useState("")
  const [serviceLaptop, setServiceLaptop] = useState("")
  const [serviceDesc, setServiceDesc] = useState("")
  const [serviceAmount, setServiceAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("Cash")
  const [paymentStatus, setPaymentStatus] = useState("Lunas")
  const [discountAmount, setDiscountAmount] = useState("")
  const [dpAmount, setDpAmount] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Load draft from localStorage on mount
  useEffect(() => {
    if (editingTrx) return;
    
    const storeId = localStorage.getItem('selectedStoreId') || 'all';
    const draftStr = localStorage.getItem(`service_draft_${storeId}`);
    if (draftStr) {
      try {
        const draft = JSON.parse(draftStr);
        if (draft.serviceCustomer !== undefined) setServiceCustomer(draft.serviceCustomer);
        if (draft.servicePhone !== undefined) setServicePhone(draft.servicePhone);
        if (draft.serviceAddress !== undefined) setServiceAddress(draft.serviceAddress);
        if (draft.serviceLaptop !== undefined) setServiceLaptop(draft.serviceLaptop);
        if (draft.serviceDesc !== undefined) setServiceDesc(draft.serviceDesc);
        if (draft.serviceAmount !== undefined) setServiceAmount(draft.serviceAmount);
        if (draft.paymentMethod !== undefined) setPaymentMethod(draft.paymentMethod);
        if (draft.paymentStatus !== undefined) setPaymentStatus(draft.paymentStatus);
        if (draft.discountAmount !== undefined) setDiscountAmount(draft.discountAmount);
        if (draft.dpAmount !== undefined) setDpAmount(draft.dpAmount);
        if (draft.dueDate !== undefined) setDueDate(draft.dueDate);
      } catch (e) {
        console.error("Failed to parse service draft", e);
      }
    }
  }, [editingTrx]);

  // Save draft to localStorage when states change
  useEffect(() => {
    if (editingTrx) return;
    
    const storeId = localStorage.getItem('selectedStoreId') || 'all';
    const draft = {
      serviceCustomer,
      servicePhone,
      serviceAddress,
      serviceLaptop,
      serviceDesc,
      serviceAmount,
      paymentMethod,
      paymentStatus,
      discountAmount,
      dpAmount,
      dueDate
    };
    
    const hasContent = serviceCustomer || servicePhone || serviceAddress || serviceLaptop || serviceDesc || serviceAmount || discountAmount || dpAmount || dueDate;
    if (hasContent) {
      localStorage.setItem(`service_draft_${storeId}`, JSON.stringify(draft));
    } else {
      localStorage.removeItem(`service_draft_${storeId}`);
    }
  }, [serviceCustomer, servicePhone, serviceAddress, serviceLaptop, serviceDesc, serviceAmount, paymentMethod, paymentStatus, discountAmount, dpAmount, dueDate, editingTrx]);

  // Populate from edit
  useEffect(() => {
    if (editingTrx && editingTrx.transactionType === "Jasa Servis" && active) {
      setServiceCustomer(editingTrx.customerName || "")
      setServicePhone(editingTrx.customerPhone || "")
      setServiceAddress(editingTrx.customerAddress || "")
      
      const desc = editingTrx.description || ""
      const match = desc.match(/^\[(.*?)\] (.*)$/)
      if (match) {
        setServiceLaptop(match[1])
        setServiceDesc(match[2])
      } else {
        setServiceLaptop("")
        setServiceDesc(desc)
      }

      setServiceAmount(editingTrx.amount ? editingTrx.amount.toLocaleString('id-ID') : "")
      setPaymentMethod(editingTrx.paymentMethod || "Cash")
      setPaymentStatus(editingTrx.paymentStatus || "Lunas")
      setDpAmount(editingTrx.dpAmount ? editingTrx.dpAmount.toLocaleString('id-ID') : "")
      setDueDate(editingTrx.dueDate ? new Date(editingTrx.dueDate).toISOString().split('T')[0] : "")
      
      const savedDiscount = editingTrx.discountAmount || 0
      setDiscountAmount(savedDiscount > 0 ? savedDiscount.toLocaleString('id-ID') : "")
    }
  }, [editingTrx, active])

  const handleServiceSubmit = async (shouldPrint = false) => {
    if (!serviceAmount || !serviceDesc || submitting) return
    setSubmitting(true)
    try {
      const url = editingTrx ? `/api/transactions/${editingTrx.id}` : '/api/transactions';
      const method = editingTrx ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionType: "Jasa Servis",
          amount: parseCurrencyString(serviceAmount) - parseCurrencyString(discountAmount || "0"),
          discountAmount: parseCurrencyString(discountAmount || "0"),
          description: serviceLaptop ? `[${serviceLaptop}] ${serviceDesc}` : serviceDesc,
          customerName: serviceCustomer,
          customerPhone: servicePhone,
          customerAddress: serviceAddress,
          paymentMethod,
          paymentStatus,
          dpAmount: paymentStatus === "Belum Lunas" ? parseCurrencyString(dpAmount) : 0,
          dueDate: (paymentMethod === "Tempo" || paymentStatus === "Belum Lunas") && dueDate ? dueDate : undefined,
        })
      })
      if (res.ok) {
        const data = await res.json();
        const savedCustomer = serviceCustomer;
        const matchedCust = customersList.find((c: any) => c.name === serviceCustomer);
        const savedPhone = servicePhone || matchedCust?.phone || '';
        const savedAddress = serviceAddress || matchedCust?.address || '';
        const savedDesc = serviceDesc;
        const savedAmount = serviceAmount;
        const savedDiscount = parseCurrencyString(discountAmount || "0");
        const savedMethod = paymentMethod;
        const savedStatus = paymentStatus;
        const savedDpAmount = paymentStatus === "Belum Lunas" ? parseCurrencyString(dpAmount) : 0;
        const savedDueDate = dueDate;

        // Reset state
        setServiceCustomer(""); setServicePhone(""); setServiceAddress(""); setServiceLaptop(""); setServiceDesc(""); setServiceAmount(""); setDpAmount(""); setDiscountAmount(""); setDueDate("");
        setPaymentMethod("Cash"); setPaymentStatus("Lunas");
        
        onSuccess();
        mutateSuggestions();

        if (shouldPrint && !editingTrx) {
          onPrint({ 
            type: "Servis", invoiceNum: data.newTx?.invoiceNumber || data.invoiceNumber || `INV-${Date.now()}`, customer: savedCustomer || 'Pelanggan Umum', 
            customerPhone: savedPhone, customerAddress: savedAddress,
            items: [{name: savedDesc, qty: 1, price: parseCurrencyString(savedAmount)}], 
            total: parseCurrencyString(savedAmount) - savedDiscount, method: savedMethod, status: savedStatus,
            dpAmount: savedDpAmount, discountAmount: savedDiscount, dueDate: savedDueDate
          });
        } else {
          toast.success(editingTrx ? "Servis berhasil diubah!" : "Pendapatan Servis Berhasil Dicatat!");
          if (editingTrx) onCancelEdit();
        }
      } else {
        toast.error("Gagal mencatat servis")
      }
    } catch (e) {
      toast.error("Error submitting service data")
    } finally {
      setSubmitting(false)
    }
  }

  const handlePrintDraft = () => {
    const now = new Date();
    const invoiceNum = `INV/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/DRAFT-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const matchedCust = customersList.find((c: any) => c.name === serviceCustomer);
    const dpVal = paymentStatus === "Belum Lunas" ? parseCurrencyString(dpAmount) : 0;
    onPrint({ 
      type: "Servis", invoiceNum, customer: serviceCustomer || 'Pelanggan Umum', 
      customerPhone: servicePhone || matchedCust?.phone || '', customerAddress: serviceAddress || matchedCust?.address || '',
      items: [{name: serviceDesc, qty: 1, price: parseCurrencyString(serviceAmount)}], 
      total: parseCurrencyString(serviceAmount) - parseCurrencyString(discountAmount || "0"), method: paymentMethod, status: paymentStatus,
      dpAmount: dpVal, discountAmount: parseCurrencyString(discountAmount || "0"), dueDate
    })
  }

  return (
    <div className="max-w-4xl mx-auto w-full text-left">
      <Card>
        <CardHeader className="p-3 md:p-4 pb-2 border-b border-border/50">
          <CardTitle className="text-sm md:text-base flex items-center gap-2 text-primary">
            <Wrench className="h-4 w-4 md:h-5 md:w-5" />
            Catat Jasa Servis
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-4 pt-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Nama Pelanggan</label>
              <Autocomplete 
                placeholder="e.g. Budi" 
                value={serviceCustomer} 
                onChange={(val) => {
                  setServiceCustomer(val)
                  const found = customersList.find((c: any) => c.name === val)
                  if (found) {
                    setServicePhone(found.phone || '')
                    setServiceAddress(found.address || '')
                  }
                }} 
                options={customersList.map((c: any) => c.name)} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Nama Laptop / Perangkat</label>
              <Autocomplete 
                placeholder="e.g. ASUS VivoBook 14 E1404FA" 
                value={serviceLaptop} 
                onChange={setServiceLaptop} 
                options={mergedLaptopModels} 
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">No. WA / Telepon</label>
              <Input className="h-8 text-xs" placeholder="e.g. 08123456789" value={servicePhone} onChange={(e) => setServicePhone(e.target.value)} type="tel" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Keterangan Servis (Ketik untuk cari)</label>
              <Autocomplete 
                placeholder="e.g. Ganti Pasta + Instal Ulang" 
                value={serviceDesc} 
                onChange={(val) => {
                  setServiceDesc(val);
                  const foundService = commonServices.find(s => s.desc === val);
                  if (foundService) {
                    setServiceAmount(foundService.price.toLocaleString('id-ID'));
                  }
                }} 
                options={[...commonServices.map(s => s.desc), ...technicianTerms]} 
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Alamat Pelanggan (Opsional)</label>
              <Input className="h-8 text-xs" placeholder="e.g. Jl. Merdeka No. 10" value={serviceAddress} onChange={(e) => setServiceAddress(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Nominal / Biaya Jasa (Rp)</label>
              <Input type="text" placeholder="e.g. 150.000" value={serviceAmount} onChange={(e) => handleCurrencyInput(e.target.value, setServiceAmount)} className="h-8 text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Metode Pembayaran</label>
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
            <div className="space-y-1">
              <label className="text-xs font-medium">Status Pembayaran</label>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Diskon / Potongan (Rp)</label>
              <Input type="text" placeholder="Opsional (e.g. 10.000)" value={discountAmount} onChange={(e) => handleCurrencyInput(e.target.value, setDiscountAmount)} className="h-8 text-xs" />
            </div>
            {paymentStatus === "Belum Lunas" && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-amber-600">DP / Bayar Awal (Rp)</label>
                <Input type="text" placeholder="e.g. 50.000" value={dpAmount} onChange={(e) => handleCurrencyInput(e.target.value, setDpAmount)} className="h-8 text-xs" />
              </div>
            )}
          </div>
          
          {paymentStatus === "Belum Lunas" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-amber-600">Jatuh Tempo (Opsional)</label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-8 text-xs text-foreground/80" />
              </div>
              <div className="flex justify-between items-end pb-2 px-2 text-xs">
                <span className="text-muted-foreground">Sisa Piutang:</span>
                <span className="font-bold text-destructive">
                  {formatCurrency((parseCurrencyString(serviceAmount) - parseCurrencyString(discountAmount || "0")) - parseCurrencyString(dpAmount))}
                </span>
              </div>
            </div>
          )}

          <div className="border-t pt-3 mt-4 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Biaya Servis</span>
              <span>{formatCurrency(parseCurrencyString(serviceAmount))}</span>
            </div>
            {parseCurrencyString(discountAmount) > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Diskon</span>
                <span className="text-emerald-600 font-medium">-{formatCurrency(parseCurrencyString(discountAmount))}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
              <span>Total Akhir</span>
              <span className="text-primary">
                {formatCurrency(parseCurrencyString(serviceAmount) - parseCurrencyString(discountAmount || "0"))}
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex-col sm:flex-row gap-2 pt-2 pb-4 border-t px-4">
          <Button className="w-full sm:flex-1 h-9 font-semibold" size="sm" onClick={() => handleServiceSubmit(false)} disabled={!serviceAmount || !serviceDesc || submitting}>
            {submitting ? "Memproses..." : "Selesaikan Transaksi"}
          </Button>
          <div className="flex gap-2 w-full sm:w-auto sm:flex-1">
            <Button className="flex-1 h-9 gap-1 border-primary/50 text-primary hover:bg-primary/5 font-semibold" variant="outline" size="sm" onClick={() => handleServiceSubmit(true)} disabled={!serviceAmount || !serviceDesc || submitting}>
              <Printer className="h-4 w-4" />
              Invoice (A4)
            </Button>
            <Button className="flex-1 h-9 gap-1 border-pink-500/50 text-pink-600 hover:bg-pink-500/5 font-semibold" variant="outline" size="sm" onClick={handlePrintDraft} disabled={!serviceAmount || !serviceDesc || submitting}>
              <FileText className="h-4 w-4" />
              Draf A4
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
export default ServiceTab
