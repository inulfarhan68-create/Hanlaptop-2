import { createPortal } from "react-dom"
import { Printer, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PrintReportsPortalProps {
  data: {
    label: string;
    revenue: { laptop: number; servis: number };
    cogs: number;
    opex: { gaji: number; listrik: number; sewa: number; lainnya: number };
    assets: { kas: number; inventory: number; piutang: number };
    liabilities: number;
    liabilitiesDetail: { hutangUsaha: number; hutangBank: number };
    equity: number;
    cumulativeNetProfit: number;
  };
  printType: "all" | "pnl" | "balance";
  setPrintType: (val: "all" | "pnl" | "balance") => void;
  onClose: () => void;
  fmt: (v: number) => string;
}

export function PrintReportsPortal({ data, printType, setPrintType, onClose, fmt }: PrintReportsPortalProps) {
  const totalRevenue = Math.round(data.revenue.laptop + data.revenue.servis)
  const grossProfit = Math.round(totalRevenue - data.cogs)
  const totalOpex = Math.round(data.opex.gaji + data.opex.listrik + data.opex.sewa + (data.opex.lainnya || 0))
  const netProfit = Math.round(grossProfit - totalOpex)
  const totalAssets = Math.round(data.assets.kas + data.assets.inventory + (data.assets.piutang || 0))
  const retainedEarnings = Math.round(data.cumulativeNetProfit || 0)
  const totalEquity = Math.round(data.equity + retainedEarnings)
  const totalLiabEquity = Math.round(data.liabilities + totalEquity)
  const grossMargin = totalRevenue === 0 ? "0.0" : ((grossProfit / totalRevenue) * 100).toFixed(1)

  return createPortal(
    <>
      <style>{`
        @media print {
          #root { display: none !important; }
          .invoice-action-bar { display: none !important; }
          @page { margin: 12mm 15mm; size: A4 portrait; }
          .print-area { position: static !important; background: white !important; overflow: visible !important; }
          .invoice-paper { box-shadow: none !important; padding: 0 !important; max-width: 100% !important; margin: 0 !important; border: none !important; }
          .invoice-logo-box { background: #1e293b !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-card-header { background: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-th { background: #1e293b !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-td-bg { background: #f1f5f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-td-bg-light { background: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
      
      <div className="invoice-action-bar fixed top-0 left-0 right-0 z-[9999999] bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm print:hidden">
        <div className="max-w-[900px] mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Kembali ke Laporan
          </button>
          <div className="flex w-full sm:w-auto items-center gap-3">
            <select
              className="w-full sm:w-auto h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-medium shadow-sm outline-none focus:ring-2 focus:ring-primary"
              value={printType}
              onChange={(e) => setPrintType(e.target.value as any)}
            >
              <option value="all">Cetak Keduanya</option>
              <option value="pnl">Laba Rugi Saja</option>
              <option value="balance">Neraca Saja</option>
            </select>
            <Button size="sm" className="w-full sm:w-auto gap-2 rounded-lg font-bold px-5 h-9 cursor-pointer" onClick={() => window.print()}>
              <Printer className="w-4 h-4" />
              Cetak Sekarang
            </Button>
          </div>
        </div>
      </div>

      <div className="print-area fixed inset-0 z-[999999] overflow-y-auto font-sans text-slate-900 w-full bg-slate-200 print:static print:bg-white print:overflow-visible">
        <div className="invoice-paper max-w-[794px] mx-auto my-2 mt-16 print:mt-0 print:my-0 px-6 sm:px-[40px] py-6 sm:py-[30px] bg-white shadow-2xl print:shadow-none border border-slate-200 rounded-xl min-h-[auto] sm:min-h-[1000px]">
          
          {/* HEADER / KOP SURAT */}
          <div className="flex justify-between items-start border-b border-slate-900 pb-4 mb-5 gap-4">
            <div className="flex items-start gap-4 sm:gap-6">
              <div className="w-24 sm:w-32 h-auto flex items-start justify-center shrink-0">
                <img src={localStorage.getItem("storeLogo") || "/logo-print.png"} alt="Logo" className="w-full h-auto object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
              </div>
              <div className="flex flex-col pt-1 sm:pt-2">
                <h1 className="text-[18px] sm:text-[22px] font-black tracking-tight text-slate-900 uppercase leading-none mb-1">{localStorage.getItem("storeName") || "HanLaptop"}</h1>
                <p className="text-[12px] text-slate-600 font-medium max-w-[280px] leading-relaxed mt-1">{localStorage.getItem("storeAddress") || "Jl. Komputer Raya No.123"}</p>
                <p className="text-[12px] text-slate-600 font-medium mt-0.5">Telp: {localStorage.getItem("storePhone") || "0812-3456-7890"}</p>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <h2 className="text-[20px] sm:text-[24px] font-black text-slate-300 uppercase tracking-[0.1em] leading-none mb-2">LAPORAN KEUANGAN</h2>
              <div className="inline-block bg-slate-100 border border-slate-200 px-3 py-1 rounded text-slate-800 font-bold text-[12px]">
                {data.label}
              </div>
            </div>
          </div>

          {/* REPORT SECTIONS */}
          <div className="space-y-6">
            
            {/* PNL SECTION */}
            {(printType === "all" || printType === "pnl") && (
              <div className="rounded-xl border border-slate-200 overflow-hidden print:border-none print:rounded-none">
                <div className="print-card-header bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center print:border-b-2 print:border-slate-800 print:bg-transparent print:px-0 print:py-2">
                  <h3 className="text-[14px] font-black uppercase tracking-wide flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400 print:hidden" />
                    Laporan Laba Rugi
                  </h3>
                  <div className="text-right">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Gross Margin</span>
                    <span className="font-black text-[12px] text-slate-800">{grossMargin}%</span>
                  </div>
                </div>
                
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left min-w-[500px]">
                    <thead>
                      <tr>
                        <th className="print-th bg-slate-800 text-white font-semibold py-1.5 px-3 sm:px-4 uppercase tracking-wider text-[10px] w-[65%]">Akun / Keterangan</th>
                        <th className="print-th bg-slate-800 text-white font-semibold py-1.5 px-3 sm:px-4 uppercase tracking-wider text-[10px] text-right">Jumlah (Rp)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Revenue */}
                      <tr><td colSpan={2} className="print-td-bg bg-slate-100 font-bold text-[10px] uppercase tracking-wider px-4 py-2 text-slate-700">Pendapatan (Revenue)</td></tr>
                      <tr><td className="px-4 py-1.5 pl-6 border-b border-slate-100 text-[12px]">Penjualan Laptop & Sparepart</td><td className="px-4 py-1.5 text-right border-b border-slate-100 font-medium text-[12px]">{fmt(data.revenue.laptop)}</td></tr>
                      <tr><td className="px-4 py-1.5 pl-6 border-b border-slate-100 text-[12px]">Pendapatan Jasa Servis</td><td className="px-4 py-1.5 text-right border-b border-slate-100 font-medium text-[12px]">{fmt(data.revenue.servis)}</td></tr>
                      <tr><td className="print-td-bg-light bg-slate-50 px-4 py-2 font-bold text-slate-900 border-b border-slate-300 text-[12px]">Total Pendapatan</td><td className="print-td-bg-light bg-slate-50 px-4 py-2 text-right font-bold text-slate-900 border-b border-slate-300 text-[12px]">{fmt(totalRevenue)}</td></tr>
                      
                      {/* COGS */}
                      <tr><td colSpan={2} className="print-td-bg bg-slate-100 font-bold text-[10px] uppercase tracking-wider px-4 py-2 text-slate-700">Harga Pokok Penjualan (COGS)</td></tr>
                      <tr><td className="px-4 py-1.5 pl-6 border-b border-slate-100 text-[12px]">HPP Laptop & Sparepart</td><td className="px-4 py-1.5 text-right border-b border-slate-100 font-medium text-red-600 text-[12px]">({fmt(data.cogs)})</td></tr>
                      <tr><td className="print-td-bg-light bg-slate-50 px-4 py-2 font-bold text-slate-900 border-b border-slate-300 text-[12px]">Laba Kotor (Gross Profit)</td><td className="print-td-bg-light bg-slate-50 px-4 py-2 text-right font-black text-emerald-600 border-b border-slate-300 text-[12px]">{fmt(grossProfit)}</td></tr>

                      {/* Opex */}
                      <tr><td colSpan={2} className="print-td-bg bg-slate-100 font-bold text-[10px] uppercase tracking-wider px-4 py-2 text-slate-700">Beban Operasional</td></tr>
                      <tr><td className="px-4 py-1.5 pl-6 border-b border-slate-100 text-[12px]">Gaji Karyawan</td><td className="px-4 py-1.5 text-right border-b border-slate-100 font-medium text-red-600 text-[12px]">({fmt(data.opex.gaji)})</td></tr>
                      <tr><td className="px-4 py-1.5 pl-6 border-b border-slate-100 text-[12px]">Listrik & Internet</td><td className="px-4 py-1.5 text-right border-b border-slate-100 font-medium text-red-600 text-[12px]">({fmt(data.opex.listrik)})</td></tr>
                      <tr><td className="px-4 py-1.5 pl-6 border-b border-slate-100 text-[12px]">Sewa Tempat</td><td className="px-4 py-1.5 text-right border-b border-slate-100 font-medium text-red-600 text-[12px]">({fmt(data.opex.sewa)})</td></tr>
                      <tr><td className="px-4 py-1.5 pl-6 border-b border-slate-100 text-[12px]">Lain-lain</td><td className="px-4 py-1.5 text-right border-b border-slate-100 font-medium text-red-600 text-[12px]">({fmt(data.opex.lainnya || 0)})</td></tr>
                      <tr><td className="print-td-bg-light bg-slate-50 px-4 py-2 font-bold text-slate-900 border-b border-slate-300 text-[12px]">Total Beban Operasional</td><td className="print-td-bg-light bg-slate-50 px-4 py-2 text-right font-bold text-red-600 border-b border-slate-300 text-[12px]">({fmt(totalOpex)})</td></tr>
                    </tbody>
                  </table>
                </div>

                <div className="print-td-bg bg-slate-100 px-4 py-3 border-t border-slate-800 flex justify-between items-center print:border-t-2">
                  <span className="font-black text-[12px] sm:text-[14px] uppercase tracking-wider text-slate-800">Laba Bersih (Net Profit)</span>
                  <span className={`font-black text-[14px] sm:text-[16px] ${netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {fmt(netProfit)}
                  </span>
                </div>
              </div>
            )}

            {/* PAGE BREAK (If both are printed) */}
            {printType === "all" && <div className="hidden print:block" style={{ pageBreakBefore: 'always' }}></div>}

            {/* BALANCE SHEET SECTION */}
            {(printType === "all" || printType === "balance") && (
              <div className="rounded-xl border border-slate-200 overflow-hidden print:border-none print:rounded-none">
                <div className="print-card-header bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center print:border-b-2 print:border-slate-800 print:bg-transparent print:px-0 print:py-2">
                  <h3 className="text-[14px] font-black uppercase tracking-wide flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400 print:hidden" />
                    Neraca (Balance Sheet)
                  </h3>
                  <div className="text-right">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Total Aset</span>
                    <span className="font-black text-[12px] text-slate-800">{fmt(totalAssets)}</span>
                  </div>
                </div>
                
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left min-w-[500px]">
                    <thead>
                      <tr>
                        <th className="print-th bg-slate-800 text-white font-semibold py-1.5 px-3 sm:px-4 uppercase tracking-wider text-[10px] w-[65%]">Akun / Keterangan</th>
                        <th className="print-th bg-slate-800 text-white font-semibold py-1.5 px-3 sm:px-4 uppercase tracking-wider text-[10px] text-right">Saldo (Rp)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Aset */}
                      <tr><td colSpan={2} className="print-td-bg bg-slate-100 font-bold text-[10px] uppercase tracking-wider px-4 py-2 text-slate-700">Aset (Aktiva)</td></tr>
                      <tr><td className="px-4 py-1.5 pl-6 border-b border-slate-100 text-[12px]">Kas & Bank</td><td className="px-4 py-1.5 text-right border-b border-slate-100 font-medium text-[12px]">{fmt(data.assets.kas)}</td></tr>
                      <tr><td className="px-4 py-1.5 pl-6 border-b border-slate-100 text-[12px]">Piutang Usaha (Belum Lunas)</td><td className="px-4 py-1.5 text-right border-b border-slate-100 font-medium text-[12px]">{fmt(data.assets.piutang || 0)}</td></tr>
                      <tr><td className="px-4 py-1.5 pl-6 border-b border-slate-100 text-[12px]">Persediaan (Inventory)</td><td className="px-4 py-1.5 text-right border-b border-slate-100 font-medium text-[12px]">{fmt(data.assets.inventory)}</td></tr>
                      <tr><td className="print-td-bg-light bg-slate-50 px-4 py-2 font-bold text-slate-900 border-b border-slate-300 text-[12px]">Total Aset</td><td className="print-td-bg-light bg-slate-50 px-4 py-2 text-right font-black text-slate-900 border-b border-slate-300 text-[12px]">{fmt(totalAssets)}</td></tr>
                      
                      {/* Liabilities */}
                      <tr><td colSpan={2} className="print-td-bg bg-slate-100 font-bold text-[10px] uppercase tracking-wider px-4 py-2 text-slate-700">Kewajiban (Liabilitas)</td></tr>
                      <tr><td className="px-4 py-1.5 pl-6 border-b border-slate-100 text-[12px]">Hutang Usaha (Supplier)</td><td className="px-4 py-1.5 text-right border-b border-slate-100 font-medium text-[12px]">{fmt(data.liabilitiesDetail?.hutangUsaha || 0)}</td></tr>
                      <tr><td className="px-4 py-1.5 pl-6 border-b border-slate-100 text-[12px]">Hutang Bank / Kreditur</td><td className="px-4 py-1.5 text-right border-b border-slate-100 font-medium text-[12px]">{fmt(data.liabilitiesDetail?.hutangBank || 0)}</td></tr>
                      <tr><td className="print-td-bg-light bg-slate-50 px-4 py-2 font-bold text-slate-900 border-b border-slate-300 text-[12px]">Total Kewajiban</td><td className="print-td-bg-light bg-slate-50 px-4 py-2 text-right font-bold text-slate-900 border-b border-slate-300 text-[12px]">{fmt(data.liabilities)}</td></tr>

                      {/* Equity */}
                      <tr><td colSpan={2} className="print-td-bg bg-slate-100 font-bold text-[10px] uppercase tracking-wider px-4 py-2 text-slate-700">Modal (Ekuitas)</td></tr>
                      <tr><td className="px-4 py-1.5 pl-6 border-b border-slate-100 text-[12px]">Modal Pemilik</td><td className="px-4 py-1.5 text-right border-b border-slate-100 font-medium text-[12px]">{fmt(data.equity)}</td></tr>
                      <tr><td className="px-4 py-1.5 pl-6 border-b border-slate-100 text-[12px]">Laba Ditahan (Retained Earnings)</td><td className="px-4 py-1.5 text-right border-b border-slate-100 font-medium text-[12px]">{fmt(retainedEarnings)}</td></tr>
                      <tr><td className="print-td-bg-light bg-slate-50 px-4 py-2 font-bold text-slate-900 border-b border-slate-300 text-[12px]">Total Modal</td><td className="print-td-bg-light bg-slate-50 px-4 py-2 text-right font-bold text-slate-900 border-b border-slate-300 text-[12px]">{fmt(totalEquity)}</td></tr>
                    </tbody>
                  </table>
                </div>

                <div className="print-td-bg bg-slate-100 px-4 py-3 border-t border-slate-800 flex justify-between items-center print:border-t-2">
                  <span className="font-black text-[12px] sm:text-[14px] uppercase tracking-wider text-slate-800">Total Kewajiban & Modal</span>
                  <span className="font-black text-[14px] sm:text-[16px] text-slate-900">
                    {fmt(totalLiabEquity)}
                  </span>
                </div>
              </div>
            )}
            
          </div>

          {/* FOOTER SIGNATURE */}
          <div className="mt-10 flex justify-end">
            <div className="text-center w-40">
              <p className="text-[10px] text-slate-500 mb-1.5">Dicetak pada: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p className="text-[12px] text-slate-500 mb-1.5">Dibuat oleh,</p>
              <div className="h-16 flex items-center justify-center my-1 relative">
                <img src="/ttd.png" alt="Ttd" className="max-h-full object-contain filter grayscale opacity-80" onError={(e) => e.currentTarget.style.display = 'none'} />
              </div>
              <p className="border-t border-slate-300 pt-1 text-[12px] font-bold text-slate-800 mt-1">{localStorage.getItem("storeName") || "HanLaptop"}</p>
            </div>
          </div>

        </div>
      </div>
    </>,
    document.body
  )
}
