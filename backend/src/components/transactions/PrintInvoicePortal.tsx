import { createPortal } from "react-dom"
import { Printer } from "lucide-react"
import { assetUrl } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import QRCode from "qrcode"

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value)
}

interface PrintInvoicePortalProps {
  printData: any
  storeSettings: any
  onClose: () => void
}

export function PrintInvoicePortal({ printData, storeSettings, onClose }: PrintInvoicePortalProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")

  useEffect(() => {
    if (printData?.id) {
      const qrLink = `${window.location.origin}/nota/${printData.originalId || printData.id}`
      QRCode.toDataURL(qrLink, { margin: 1, width: 120, errorCorrectionLevel: 'M' })
        .then((url) => setQrCodeUrl(url))
        .catch((err) => console.error("Failed to generate QR Code for A4 invoice", err))
    }
  }, [printData])

  if (!printData) return null

  return createPortal(
    <>
      <style>{`
        @media print {
          #root { display: none !important; }
          .invoice-action-bar { display: none !important; }
          @page { margin: 8mm 10mm; size: A4 portrait; }
          .print-area { position: static !important; background: white !important; overflow: visible !important; }
          .invoice-paper { box-shadow: none !important; padding: 0 !important; max-width: 100% !important; }
          .invoice-logo-box { background: #1e293b !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* Action Bar - Fixed top bar with print & back buttons (hidden when printing) */}
      <div className="invoice-action-bar fixed top-0 left-0 right-0 z-[9999999] bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm print:hidden">
        <div className="max-w-[900px] mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Kembali ke Halaman
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">Ukuran: A4 (210 × 297 mm)</span>
            <Button size="sm" className="gap-2 rounded-lg font-bold px-5" onClick={() => window.print()}>
              <Printer className="w-4 h-4" />
              Cetak Invoice
            </Button>
          </div>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="print-area fixed inset-0 z-[999999] overflow-y-auto font-sans text-slate-900 w-full bg-slate-200 print:static print:bg-white print:overflow-visible">
        <div className="invoice-paper max-w-[794px] mx-auto my-2 mt-16 print:mt-0 print:my-0 px-6 sm:px-[40px] py-6 sm:py-[30px] bg-white shadow-2xl print:shadow-none min-h-[auto] sm:min-h-[1000px] border border-slate-200 print:border-none">

          {/* Header / Letterhead */}
          <div className="flex justify-between items-start border-b border-slate-900 pb-4 mb-5 gap-4">
            <div className="flex items-start gap-4 sm:gap-6">
              <div className="w-24 sm:w-32 h-auto flex items-start justify-center shrink-0">
                <img src={assetUrl(printData.store?.logo || storeSettings?.storeLogo || localStorage.getItem("storeLogo") || "/logo-print.png")} alt="Logo" className="w-full h-auto object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
              </div>
              <div className="flex flex-col pt-1 sm:pt-2">
                <h1 className="text-[18px] sm:text-[22px] font-black tracking-tight text-slate-900 uppercase">{printData.store?.name || storeSettings?.storeName || localStorage.getItem("storeName") || "HanLaptop"}</h1>
                <p className="text-[12px] text-slate-600 mt-1 max-w-[280px] leading-relaxed">{printData.store?.address || storeSettings?.storeAddress || localStorage.getItem("storeAddress") || "Jl. Komputer Raya No.123"}</p>
                <p className="text-[12px] text-slate-600 font-medium mt-0.5">Telp: {printData.store?.phone || storeSettings?.storePhone || localStorage.getItem("storePhone") || "0812-3456-7890"}</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-[24px] sm:text-[28px] font-black text-slate-900 uppercase tracking-[0.1em] leading-none mb-3">INVOICE</h2>
              <div className="space-y-1 text-right">
                <p className="text-[12px] text-slate-600">
                  <span className="font-semibold text-slate-800">No. Invoice: </span>
                  <span className="font-mono text-slate-900">{printData.invoiceNum}</span>
                </p>
                <p className="text-[12px] text-slate-600">
                  <span className="font-semibold text-slate-800">Tanggal: </span>
                  <span className="text-slate-900">{new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="mb-5 grid grid-cols-2 gap-4 text-left">
            <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 border-b border-slate-100 pb-0.5 w-fit">Ditagihkan Kepada</h3>
              <p className="text-[14px] font-bold text-slate-900 mt-1">{printData.customer}</p>
              {printData.customerPhone && <p className="text-[11px] text-slate-500 mt-0.5">No WA : {printData.customerPhone}</p>}
              {printData.customerAddress && <p className="text-[11px] text-slate-500">Alamat : {printData.customerAddress}</p>}
            </div>
            <div className="text-right flex flex-col items-end">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 border-b border-slate-100 pb-0.5 w-fit">Tipe Transaksi</h3>
              <p className="text-[14px] font-bold text-slate-900 mt-1">{printData.type}</p>
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
                {printData.items.map((it: any, i: number) => {
                  const itemDiscountPerUnit = it.discountValue
                    ? (it.discountType === 'percent' ? it.price * (it.discountValue / 100) : it.discountValue)
                    : 0;
                  const netUnitPrice = it.price - itemDiscountPerUnit;
                  return (
                    <tr key={i}>
                      <td className="py-2 px-2 text-[12px] text-slate-800 break-words">
                        <div>{it.name}</div>
                        {itemDiscountPerUnit > 0 && (
                          <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                            {it.discountType === 'percent'
                              ? `*Diskon ${it.discountValue}% (-${formatCurrency(itemDiscountPerUnit)})`
                              : `*Diskon -${formatCurrency(itemDiscountPerUnit)}`
                            }
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center text-[12px] text-slate-800">{it.qty}</td>
                      <td className="py-2 px-2 text-right text-[12px] text-slate-800">{formatCurrency(it.price)}</td>
                      <td className="py-2 px-2 text-right text-[12px] font-semibold text-slate-900">{formatCurrency(netUnitPrice * it.qty)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary & Totals Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-6 text-left">
            {/* Terms */}
            <div className="flex-1 w-full pr-4 text-left">
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
                {(printData.store?.footer || storeSettings?.storeFooter || localStorage.getItem("storeFooter")) && (
                  <div className="mt-2 pt-1.5 border-t border-slate-200">
                    <span className="italic">{(printData.store?.footer || storeSettings?.storeFooter || localStorage.getItem("storeFooter") || "").split("|||")[0]}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Totals + Payment */}
            <div className="w-full sm:w-[300px] shrink-0 border border-slate-300 rounded-md overflow-hidden">
              <div className="p-3 bg-white space-y-2">
                <div className="flex justify-between text-[12px]">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(printData.total + (printData.discountAmount || 0))}</span>
                </div>
                {printData.discountAmount > 0 && (
                  <div className="flex justify-between text-[12px]">
                    <span className="text-slate-600">Diskon</span>
                    <span className="font-semibold text-emerald-600">-{formatCurrency(printData.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[12px]">
                  <span className="text-slate-600">Metode Pembayaran</span>
                  <span className="font-semibold text-slate-900 text-right">{printData.method}</span>
                </div>
                <div className="flex justify-between text-[12px] items-center">
                  <span className="text-slate-600">Status Pembayaran</span>
                  <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border ${printData.status === "Lunas" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                    {printData.status}
                  </span>
                </div>
                {printData.status === "Belum Lunas" && printData.dpAmount > 0 && (
                  <>
                    <div className="border-t border-dashed border-slate-200 pt-2">
                      <div className="flex justify-between text-[12px]">
                        <span className="text-slate-600">Uang Muka (DP)</span>
                        <span className="font-semibold text-blue-600">{formatCurrency(printData.dpAmount)}</span>
                      </div>
                      <div className="flex justify-between text-[12px] mt-1">
                        <span className="text-slate-600 font-bold">Sisa Pelunasan</span>
                        <span className="font-bold text-red-600">{formatCurrency(printData.total - printData.dpAmount)}</span>
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
                <span className="text-[12px] font-bold uppercase tracking-widest">{printData.status === "Belum Lunas" && printData.dpAmount > 0 ? 'Total Tagihan' : 'Total Bayar'}</span>
                <span className="font-black text-[14px]">{formatCurrency(printData.total)}</span>
              </div>
              
              {/* Rekening Pembayaran */}
              {(() => {
                const printBanks = printData.store?.banks || storeSettings?.storeBanks || [];
                if (!printBanks || printBanks.length === 0) return null;
                return (
                  <div className="border-t border-slate-200 px-3 py-3 bg-slate-50 text-left">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Informasi Rekening</p>
                    <div className="space-y-1.5">
                      {printBanks.map((b: any, i: number) => (
                        <div key={i} className="text-[12px] flex items-center justify-start gap-3 bg-white px-3 py-1.5 border border-slate-200 rounded-md">
                          <span className="font-bold text-slate-700 w-12">{b.bank}</span>
                          <span className="font-mono font-black text-slate-900">{b.account}</span>
                        </div>
                      ))}
                    </div>
                    {printBanks.length > 0 && (
                      <p className="text-[12px] text-slate-600 mt-2.5">
                        A/n: <span className="font-bold text-[14px] text-slate-900">{printBanks[0].name}</span>
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Footer Signatures */}
          <div className="flex justify-between mt-8 pt-6 border-t border-slate-200 text-center px-2">
            <div className="flex flex-col justify-between w-40 h-24">
              <p className="text-[12px] text-slate-500 font-medium">Penerima / Pelanggan,</p>
              <div className="border-b border-slate-400 w-full mb-1.5 mt-auto"></div>
              <p className="text-[12px] font-bold text-slate-900">{printData.customer}</p>
            </div>
            {qrCodeUrl && (
              <div className="flex flex-col items-center justify-center shrink-0">
                <img src={qrCodeUrl} className="w-16 h-16 border rounded p-0.5 bg-white" alt="Struk Digital" />
                <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Invoice Digital</span>
              </div>
            )}
            <div className="flex flex-col justify-between w-40 h-24 relative">
              <p className="text-[12px] text-slate-500 font-medium">Hormat Kami,</p>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-16 pointer-events-none flex items-center justify-center">
                <img src={assetUrl(printData.store?.signature || storeSettings?.storeSignature || localStorage.getItem('storeSignature') || "/ttd.png")} alt="" className="max-w-full max-h-full object-contain opacity-80 mix-blend-multiply" onError={(e) => e.currentTarget.style.display = 'none'} />
              </div>
              <div className="border-b border-slate-400 w-full mb-1.5 mt-auto relative z-10"></div>
              <p className="text-[12px] font-bold text-slate-900 relative z-10">{printData.store?.name || storeSettings?.storeName || localStorage.getItem("storeName") || "HanLaptop"}</p>
            </div>
          </div>

          {/* Invoice Size Info & Footer (print only) */}
          <div className="hidden print:block mt-6 pt-3 border-t border-slate-200 text-center">
            <p className="text-[10px] font-medium text-slate-500 text-center mb-1">
              {(printData.store?.footer || storeSettings?.storeFooter || localStorage.getItem("storeFooter") || "").split("|||")[0]}
            </p>
            <p className="text-[10px] font-medium text-slate-400 text-center">Dicetak pada {new Date().toLocaleString('id-ID')}</p>
          </div>

        </div>
      </div>
    </>
  , document.body)
}

