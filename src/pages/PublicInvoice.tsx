import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { Printer, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PublicInvoice() {
  const { id } = useParams()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const handleResize = () => {
      // Calculate scale to fit on small screens
      const containerWidth = window.innerWidth - 32; // 32px for padding
      if (containerWidth < 794) {
        setScale(containerWidth / 794);
      } else {
        setScale(1);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/public/invoice/${id}`)
      .then(res => res.json())
      .then(res => {
        if (res.error) {
          setError(res.error)
        } else {
          setData(res)
        }
        setLoading(false)
      })
      .catch(() => {
        setError("Gagal memuat nota.")
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-slate-100 text-slate-500">Memuat Nota...</div>
  }

  if (error || !data) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-slate-100 text-slate-600">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Nota Tidak Ditemukan</h2>
        <p className="mt-2">{error}</p>
      </div>
    )
  }

  const { transaction: printData, storeSettings } = data

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val)
  }

  // Parses storeBanks safely
  let storeBanks: any[] = [];
  try {
    if (storeSettings.storeBanks) {
      storeBanks = typeof storeSettings.storeBanks === 'string' ? JSON.parse(storeSettings.storeBanks) : storeSettings.storeBanks;
    }
  } catch (e) {}

  // Fallback to empty banks if database is uninitialized
  if (!storeBanks) {
    storeBanks = [];
  }

  // Pre-calculate values
  const total = printData.amount || 0;
  const status = printData.paymentStatus || "Lunas";
  const method = printData.paymentMethod || "Cash";
  const dpAmount = printData.dpAmount || 0;
  const discountAmount = printData.discountAmount || 0;
  const isBelumLunas = status === 'Belum Lunas';
  
  // Calculate display subtotal based on items
  const subtotal = (printData.items || []).reduce((acc: number, item: any) => acc + ((item.unitPrice || 0) * (item.quantity || 1)), 0) || total;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 print:bg-white print:p-0">
      <div className="max-w-[794px] mx-auto mb-4 flex justify-end print:hidden">
        <Button size="sm" className="gap-2 rounded-lg font-bold px-5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg" onClick={() => window.print()}>
          <Printer className="w-4 h-4" />
          Cetak PDF / Print
        </Button>
      </div>

      <div className="w-full flex justify-center print:block overflow-hidden print:overflow-visible pb-12 print:pb-0">
        <div 
           className="relative print:!w-auto print:!h-auto auto-scale-wrapper"
           style={{ '--scale-factor': scale } as React.CSSProperties}
        >
          <style>{`
            @media print {
              @page { margin: 8mm 10mm; size: A4 portrait; }
              body { background: white !important; }
              .auto-scale-wrapper { display: block !important; transform: none !important; width: 100% !important; height: auto !important; position: static !important; }
              .auto-scale-content { position: static !important; transform: none !important; width: 100% !important; height: auto !important; box-shadow: none !important; border: none !important; }
            }
          `}</style>
          <div 
            className="invoice-paper absolute top-0 left-0 bg-white shadow-xl border border-slate-200 print:relative print:shadow-none print:border-none print:m-0 print:p-0 auto-scale-content"
          >

          
          {/* Header / Letterhead */}
          <div className="flex justify-between items-start border-b border-slate-900 pb-4 mb-5 gap-4">
            <div className="flex items-start gap-6">
              <div className="w-32 h-auto flex items-start justify-center shrink-0">
                {storeSettings.storeLogo ? (
                  <img src={storeSettings.storeLogo} alt="Logo" className="w-full h-auto object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                ) : (
                  <img src="/logo-print.png" alt="Logo" className="w-full h-auto object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                )}
              </div>
              <div className="flex flex-col pt-2">
                <h1 className="text-[22px] font-black tracking-tight text-slate-900 uppercase">{storeSettings.storeName || "HanLaptop"}</h1>
                <p className="text-[12px] text-slate-600 mt-1 max-w-[280px] leading-relaxed">{storeSettings.storeAddress || "Jl. Komputer Raya No.123"}</p>
                <p className="text-[12px] text-slate-600 font-medium mt-0.5">Telp: {storeSettings.storePhone || "0812-3456-7890"}</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-[28px] font-black text-slate-900 uppercase tracking-[0.1em] leading-none mb-3">INVOICE</h2>
              <div className="space-y-1 text-right">
                <p className="text-[12px] text-slate-600">
                  <span className="font-semibold text-slate-800">No. Invoice: </span>
                  <span className="font-mono text-slate-900">{printData.invoiceNumber || printData.id.substring(0,8).toUpperCase()}</span>
                </p>
                <p className="text-[12px] text-slate-600">
                  <span className="font-semibold text-slate-800">Tanggal: </span>
                  <span className="text-slate-900">{new Date(printData.transactionDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="mb-5 grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 border-b border-slate-100 pb-0.5 w-fit">Ditagihkan Kepada</h3>
              <p className="text-[14px] font-bold text-slate-900 mt-1">{printData.customerName || printData.customer?.name || "Pelanggan Umum"}</p>
              {(printData.customer?.phone) && <p className="text-[11px] text-slate-500 mt-0.5">No WA : {printData.customer.phone}</p>}
              {(printData.customer?.address) && <p className="text-[11px] text-slate-500">Alamat : {printData.customer.address}</p>}
            </div>
            <div className="text-right flex flex-col items-end">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 border-b border-slate-100 pb-0.5 w-fit">Tipe Transaksi</h3>
              <p className="text-[14px] font-bold text-slate-900 mt-1">{printData.transactionType}</p>
            </div>
          </div>

          {/* Invoice Table */}
          <div className="mb-6">
            <table className="w-full text-left border-collapse" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '45%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '25%' }} />
              </colgroup>
              <thead>
                <tr className="border-y border-slate-900">
                  <th className="py-2 px-2 font-bold text-[12px] uppercase tracking-wider text-slate-800">Deskripsi Item</th>
                  <th className="py-2 px-2 text-center font-bold text-[12px] uppercase tracking-wider text-slate-800">Qty</th>
                  <th className="py-2 px-2 text-right font-bold text-[12px] uppercase tracking-wider text-slate-800">Harga Satuan</th>
                  <th className="py-2 px-2 text-right font-bold text-[12px] uppercase tracking-wider text-slate-800">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {printData.items && printData.items.length > 0 ? (
                  printData.items.map((it: any, i: number) => {
                    let sns = [];
                    if (it.serialNumbers) {
                      try {
                        sns = typeof it.serialNumbers === 'string' ? JSON.parse(it.serialNumbers) : it.serialNumbers;
                      } catch (e) {}
                      if (Array.isArray(sns)) {
                        sns = sns.filter(Boolean);
                      } else {
                        sns = [];
                      }
                    }
                    return (
                    <tr key={i}>
                      <td className="py-2 px-2 text-[12px] text-slate-800 break-words">
                        <div className="font-medium">{it.inventoryItem?.itemName || it.description || 'Item'}</div>
                        {sns.length > 0 && (
                          <div className="text-[10px] text-slate-500 mt-0.5 italic">SN: {sns.join(', ')}</div>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center text-[12px] text-slate-800">{it.quantity || 1}</td>
                      <td className="py-2 px-2 text-right text-[12px] text-slate-800">{formatCurrency(it.unitPrice || 0)}</td>
                      <td className="py-2 px-2 text-right text-[12px] font-semibold text-slate-900">{formatCurrency((it.unitPrice || 0) * (it.quantity || 1))}</td>
                    </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td className="py-2 px-2 text-[12px] text-slate-800 break-words">{printData.description || 'Transaksi'}</td>
                    <td className="py-2 px-2 text-center text-[12px] text-slate-800">1</td>
                    <td className="py-2 px-2 text-right text-[12px] text-slate-800">{formatCurrency(printData.amount)}</td>
                    <td className="py-2 px-2 text-right text-[12px] font-semibold text-slate-900">{formatCurrency(printData.amount)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary & Totals Row */}
          <div className="flex justify-between items-start mb-8 gap-6">
            <div className="flex-1 pr-6">
              <h3 className="font-bold text-[10px] uppercase tracking-widest text-slate-800 mb-2">Syarat & Ketentuan Garansi</h3>
              <div className="text-[9px] text-slate-600 space-y-1.5 leading-relaxed text-justify">
                <div className="grid grid-cols-[100px_1fr] gap-1.5">
                  <span className="font-semibold text-slate-800">Masa Berlaku</span>
                  <span><span className="font-medium text-slate-700">Unit Laptop:</span> Garansi Hardware 1 Bulan & Garansi Software 6 Bulan sejak tanggal pembelian.<br/><span className="font-medium text-slate-700">Layanan Service:</span> Garansi 1 Minggu untuk kerusakan/gejala yang sama.</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-1.5">
                  <span className="font-semibold text-slate-800">Syarat Utama</span>
                  <span>Wajib menunjukkan Invoice Asli ini saat melakukan klaim. Garansi tidak berlaku tanpa bukti pembelian yang sah.</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-1.5">
                  <span className="font-semibold text-slate-800">Kondisi Unit</span>
                  <span>Garansi hanya berlaku jika Segel Toko utuh (tidak rusak/robek) dan unit tidak mengalami kerusakan fisik akibat kelalaian pengguna (terjatuh, terkena cairan, korsleting listrik, atau dibongkar pihak lain).</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-1.5">
                  <span className="font-semibold text-slate-800">Data Pengguna</span>
                  <span>Toko tidak bertanggung jawab atas kehilangan data selama proses perbaikan. Pelanggan diimbau untuk melakukan backup data penting terlebih dahulu.</span>
                </div>
                {storeSettings.storeFooter && (
                  <div className="mt-2 pt-1.5 border-t border-slate-200">
                    <span className="italic">{storeSettings.storeFooter.split("|||")[0]}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="w-[300px] shrink-0 border border-slate-300 rounded-md overflow-hidden print:border-slate-300">
              <div className="p-3 bg-white space-y-2">
                <div className="flex justify-between text-[12px]">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-[12px]">
                    <span className="text-slate-600">Diskon</span>
                    <span className="font-semibold text-emerald-600">-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[12px]">
                  <span className="text-slate-600">Metode Pembayaran</span>
                  <span className="font-semibold text-slate-900 text-right">{method}</span>
                </div>
                <div className="flex justify-between text-[12px] items-center">
                  <span className="text-slate-600">Status Pembayaran</span>
                  <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border print:bg-transparent print:border-none print:px-0 ${status === "Lunas" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                    {status}
                  </span>
                </div>
                {isBelumLunas && dpAmount > 0 && (
                  <>
                    <div className="border-t border-dashed border-slate-200 pt-2">
                      <div className="flex justify-between text-[12px]">
                        <span className="text-slate-600">Uang Muka (DP)</span>
                        <span className="font-semibold text-blue-600">{formatCurrency(dpAmount)}</span>
                      </div>
                      <div className="flex justify-between text-[12px] mt-1">
                        <span className="text-slate-600 font-bold">Sisa Pelunasan</span>
                        <span className="font-bold text-red-600">{formatCurrency(total - dpAmount)}</span>
                      </div>
                    </div>
                  </>
                )}
                {printData.dueDate && (
                  <div className="flex justify-between text-[12px] border-t border-dashed border-slate-200 pt-2">
                    <span className="text-slate-600">Jatuh Tempo</span>
                    <span className="font-bold text-red-600">{new Date(printData.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center bg-white text-slate-900 px-3 py-3 border-t border-slate-300">
                <span className="text-[12px] font-bold uppercase tracking-widest">{isBelumLunas && dpAmount > 0 ? 'Total Tagihan' : 'Total Bayar'}</span>
                <span className="font-black text-[14px]">{formatCurrency(total)}</span>
              </div>
              
              {/* Rekening Pembayaran */}
              {storeBanks && storeBanks.length > 0 && (
                <div className="border-t border-slate-200 px-3 py-3 bg-slate-50 text-left print:bg-white print:border-t-0 print:pt-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Informasi Rekening</p>
                  <div className="space-y-1.5">
                    {storeBanks.map((b, i) => (
                      <div key={i} className="text-[12px] flex items-center justify-start gap-3 bg-white print:border-none print:px-0 print:py-0 px-3 py-1.5 border border-slate-200 rounded-md">
                        <span className="font-bold text-slate-700 w-12">{b.bank}</span>
                        <span className="font-mono font-black text-slate-900">{b.account}</span>
                      </div>
                    ))}
                  </div>
                  {storeBanks.length > 0 && storeBanks[0].name && (
                    <p className="text-[12px] text-slate-600 mt-2.5">
                      A/n: <span className="font-bold text-[14px] text-slate-900">{storeBanks[0].name}</span>
                    </p>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Footer Signatures */}
          <div className="flex justify-between mt-8 pt-6 border-t border-slate-200 text-center px-2">
            <div className="flex flex-col justify-between w-40 h-24">
              <p className="text-[12px] text-slate-500 font-medium">Penerima / Pelanggan,</p>
              <div className="border-b border-slate-400 w-full mb-1.5 mt-auto"></div>
              <p className="text-[12px] font-bold text-slate-900">{printData.customerName || printData.customer?.name || "Pelanggan"}</p>
            </div>
            <div className="flex flex-col justify-between w-40 h-24 relative">
              <p className="text-[12px] text-slate-500 font-medium">Hormat Kami,</p>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-16 pointer-events-none flex items-center justify-center">
                <img src={storeSettings.storeSignature || "/ttd.png"} alt="" className="max-w-full max-h-full object-contain opacity-80 mix-blend-multiply" onError={(e) => e.currentTarget.style.display = 'none'} />
              </div>
              <div className="border-b border-slate-400 w-full mb-1.5 mt-auto relative z-10"></div>
              <p className="text-[12px] font-bold text-slate-900 relative z-10">{storeSettings.storeName || "HanLaptop"}</p>
            </div>
          </div>

          {/* Invoice Size Info & Footer (print only) */}
          <div className="hidden print:block mt-6 pt-3 border-t border-slate-200">
            <p className="text-[10px] font-medium text-slate-500 text-center mb-1">
              {storeSettings.storeFooter ? storeSettings.storeFooter.split("|||")[0].replace(/\n/g, ' ') : ""}
            </p>
            <p className="text-[10px] font-medium text-slate-400 text-center">Dicetak pada {new Date().toLocaleString('id-ID')}</p>
          </div>

        </div>
      </div>
    </div>
  </div>
  )
}
