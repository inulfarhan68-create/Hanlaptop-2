import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { Printer, AlertCircle, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function PublicServiceReceipt() {
  const { id } = useParams()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [scale, setScale] = useState(1)
  const [actionLoading, setActionLoading] = useState(false)
  const [rating, setRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [ratingComment, setRatingComment] = useState<string>("")
  const [submittedRating, setSubmittedRating] = useState<boolean>(false)
  const [ratingLoading, setRatingLoading] = useState<boolean>(false)

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      alert("Silakan pilih rating bintang terlebih dahulu.");
      return;
    }
    setRatingLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/public/service/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, ratingComment })
      });
      if (res.ok) {
        setSubmittedRating(true);
        setData((prev: any) => ({
          ...prev,
          serviceOrder: {
            ...prev.serviceOrder,
            rating,
            ratingComment
          }
        }));
      } else {
        const err = await res.json();
        alert(err.error || "Gagal mengirim ulasan.");
      }
    } catch (e) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setRatingLoading(false);
    }
  };

  const handleApproveEstimate = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/public/service/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Dikerjakan' })
      });
      if (res.ok) {
        setData((prev: any) => ({
          ...prev,
          serviceOrder: {
            ...prev.serviceOrder,
            status: 'Dikerjakan'
          }
        }));
      } else {
        const err = await res.json();
        alert(err.error || "Gagal menyetujui estimasi.");
      }
    } catch (e) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineEstimate = async () => {
    if (!confirm("Apakah Anda yakin ingin membatalkan perbaikan laptop Anda?\nUnit yang batal diperbaiki dapat diambil kembali ke toko.")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/public/service/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Batal' })
      });
      if (res.ok) {
        setData((prev: any) => ({
          ...prev,
          serviceOrder: {
            ...prev.serviceOrder,
            status: 'Batal'
          }
        }));
      } else {
        const err = await res.json();
        alert(err.error || "Gagal membatalkan servis.");
      }
    } catch (e) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setActionLoading(false);
    }
  };

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
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/public/service/${id}`)
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
        setError("Gagal memuat tanda terima servis.")
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
        <h2 className="text-xl font-bold text-slate-800">Tanda Terima Tidak Ditemukan</h2>
        <p className="mt-2">{error}</p>
      </div>
    )
  }

  const { serviceOrder: printData, storeSettings } = data

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
  const total = printData.finalCost || printData.estimatedCost || 0;
  const status = printData.status || "Diterima";

  // Parses notes safely to pull out QC, Spareparts, and Kelengkapan blocks
  const rawNotes = printData.notes || "";
  
  // Clean metadata blocks unconditionally to prevent raw JSON leak in all cases
  let cleanNotes = rawNotes
    .replace(/\n?\[QC:\s*\{[\s\S]*?\}\]/g, "")
    .replace(/\n?\[Kelengkapan:\s*\{[\s\S]*?\}\]/g, "")
    .replace(/\n?\[Spareparts:\s*\[[\s\S]*?\]\]/g, "")
    .replace(/\n?\[Spareparts:\s*[\s\S]*?\]\]/g, "") // fallback
    .trim();

  let qcData: any = null;
  let sparepartsData: any[] = [];
  let kelengkapanData: any = null;

  // Parse QC
  const qcMatch = rawNotes.match(/\[QC:\s*(\{[\s\S]*?\})\]/);
  if (qcMatch) {
    try {
      qcData = JSON.parse(qcMatch[1]);
    } catch (e) {
      console.error("Failed to parse QC JSON in receipt", e);
    }
  }

  // Parse Spareparts
  const partsMatch = rawNotes.match(/\[Spareparts:\s*(\[[\s\S]*?\])\]/);
  if (partsMatch) {
    try {
      sparepartsData = JSON.parse(partsMatch[1]);
    } catch (e) {
      console.error("Failed to parse spareparts JSON in receipt", e);
    }
  }

  // Parse Kelengkapan
  const kelengkapanMatch = rawNotes.match(/\[Kelengkapan:\s*(\{[\s\S]*?\})\]/);
  if (kelengkapanMatch) {
    try {
      kelengkapanData = JSON.parse(kelengkapanMatch[1]);
    } catch (e) {
      console.error("Failed to parse Kelengkapan JSON in receipt", e);
    }
  }

  const sparepartsTotal = sparepartsData.reduce((sum: number, p: any) => sum + (p.price * p.qty), 0);
  const serviceFee = Math.max(0, total - sparepartsTotal);
  
  const getStatusBg = (s: string) => {
    if (s === 'Selesai' || s === 'Diambil') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (s === 'Batal') return 'bg-red-50 text-red-700 border-red-200'
    return 'bg-blue-50 text-blue-700 border-blue-200'
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 print:bg-white print:p-0">
      <div className="max-w-[794px] mx-auto mb-4 flex justify-end print:hidden">
        <Button size="sm" className="gap-2 rounded-lg font-bold px-5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg" onClick={() => window.print()}>
          <Printer className="w-4 h-4" />
          Cetak PDF / Print
        </Button>
      </div>

      {/* Estimate Approval Panel */}
      {printData && (status === 'Diterima' || status === 'Menunggu Part') && total > 0 && (
        <div className="max-w-[794px] mx-auto mb-6 bg-white border border-indigo-100 shadow-md rounded-2xl p-5 text-left print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
              </span>
              Konfirmasi Persetujuan Estimasi Biaya
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-[500px]">
              Silakan konfirmasi persetujuan perbaikan unit laptop Anda dengan estimasi total biaya sebesar <span className="font-bold text-indigo-700 font-mono">{formatCurrency(total)}</span> agar teknisi kami dapat segera memulai pengerjaan.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              disabled={actionLoading}
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 rounded-lg text-xs font-bold"
              onClick={handleDeclineEstimate}
            >
              Batalkan Servis
            </Button>
            <Button
              size="sm"
              disabled={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md"
              onClick={handleApproveEstimate}
            >
              {actionLoading ? 'Memproses...' : 'Setujui & Kerjakan'}
            </Button>
          </div>
        </div>
      )}

      {/* Customer Satisfaction Rating Panel */}
      {printData && (status === 'Selesai' || status === 'Diambil') && (
        <div className="max-w-[794px] mx-auto mb-6 bg-white border border-amber-100 shadow-md rounded-2xl p-5 text-left print:hidden">
          {printData.rating ? (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                Terima kasih atas ulasan Anda!
              </h3>
              <p className="text-xs text-slate-600">
                Ulasan Anda sangat berharga bagi kami dalam meningkatkan kualitas layanan teknisi kami.
              </p>
              <div className="flex items-center gap-2 mt-2 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star} 
                      className={`w-4 h-4 ${star <= printData.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`} 
                    />
                  ))}
                </div>
                {printData.ratingComment && (
                  <span className="text-xs text-slate-700 italic border-l border-slate-200 pl-2">
                    "{printData.ratingComment}"
                  </span>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitRating} className="space-y-3">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
                  Bagaimana Pengalaman Layanan Servis Kami?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Silakan berikan penilaian bintang dan masukan Anda untuk kualitas pengerjaan unit laptop Anda oleh teknisi kami.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-1.5">
                {/* Star rating selector */}
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isSelected = star <= (hoverRating || rating);
                    return (
                      <button
                        key={star}
                        type="button"
                        className="p-1 hover:scale-110 transition-transform duration-200 focus:outline-none"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                      >
                        <Star 
                          className={`w-6 h-6 ${
                            isSelected 
                              ? 'text-amber-500 fill-amber-500 drop-shadow-sm' 
                              : 'text-slate-300'
                          }`} 
                        />
                      </button>
                    );
                  })}
                  {rating > 0 && (
                    <span className="text-xs font-bold text-amber-600 ml-1.5 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {rating} dari 5
                    </span>
                  )}
                </div>

                {/* Comment box */}
                <div className="flex-1 flex gap-2">
                  <Input
                    placeholder="Tulis ulasan singkat atau catatan untuk teknisi kami (opsional)..."
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    className="h-9 text-xs bg-slate-50 border-slate-200 focus:bg-white rounded-lg flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={ratingLoading || rating === 0}
                    className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold h-9 px-4 shrink-0 shadow-sm disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    {ratingLoading ? 'Mengirim...' : 'Kirim Ulasan'}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

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
              <h2 className="text-[20px] md:text-[24px] font-black text-slate-900 uppercase tracking-[0.1em] leading-none mb-3">TANDA TERIMA SERVIS</h2>
              <div className="space-y-1 text-right">
                <p className="text-[12px] text-slate-600">
                  <span className="font-semibold text-slate-800">No. Servis: </span>
                  <span className="font-mono text-slate-900">{printData.id.substring(0,8).toUpperCase()}</span>
                </p>
                <p className="text-[12px] text-slate-600">
                  <span className="font-semibold text-slate-800">Tgl Diterima: </span>
                  <span className="text-slate-900">{new Date(printData.receivedDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="mb-5 grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 border-b border-slate-100 pb-0.5 w-fit">Informasi Pelanggan</h3>
              <p className="text-[14px] font-bold text-slate-900 mt-1">{printData.customerName || "Pelanggan Umum"}</p>
              {(printData.customerPhone) && <p className="text-[11px] text-slate-500 mt-0.5">No WA : {printData.customerPhone}</p>}
              {(printData.customerAddress || printData.customer?.address) && <p className="text-[11px] text-slate-500 mt-0.5">Alamat : {printData.customerAddress || printData.customer?.address}</p>}
            </div>
            <div className="text-right flex flex-col items-end">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 border-b border-slate-100 pb-0.5 w-fit">Tipe Transaksi</h3>
              <p className="text-[14px] font-bold text-slate-900 mt-1">Jasa Servis</p>
            </div>
          </div>

          {/* Invoice Table */}
          <div className="mb-5 border border-slate-200 rounded-md overflow-hidden">
            <table className="w-full text-left border-collapse" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '45%' }} />
                <col style={{ width: '55%' }} />
              </colgroup>
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-2.5 px-3 font-bold text-[12px] uppercase tracking-wider text-slate-800">Tipe / Unit Laptop</th>
                  <th className="py-2.5 px-3 font-bold text-[12px] uppercase tracking-wider text-slate-800">Keluhan / Kerusakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                <tr>
                  <td className="py-3 px-3 text-[13px] font-bold text-slate-900 break-words">{printData.deviceName}</td>
                  <td className="py-3 px-3 text-[12px] text-slate-800 break-words whitespace-pre-wrap">{printData.issue}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Catatan Perbaikan/Garansi (Full Width) */}
          {cleanNotes && (
            <div className="mb-5 bg-slate-50/50 border border-slate-200 rounded-md p-4 text-left print:bg-transparent">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pb-0.5 border-b border-slate-100 w-fit">Catatan Perbaikan / Garansi</h3>
              <p className="text-[12px] text-slate-700 italic break-words whitespace-pre-wrap">{cleanNotes}</p>
            </div>
          )}

          {/* Kelengkapan Unit Panel */}
          {kelengkapanData && (
            <div className="mb-5 bg-slate-50/50 border border-slate-200 rounded-md p-4 print:bg-transparent">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 pb-0.5 border-b border-slate-100 w-fit">Kelengkapan Unit Diterima</h3>
              <div className="grid grid-cols-3 gap-4 text-[12px] mt-1.5">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${kelengkapanData.charger ? 'bg-indigo-600 dark:bg-indigo-400' : 'bg-slate-300'}`}></span>
                  <span className="text-slate-600 font-medium">Charger:</span>
                  <span className="font-bold text-slate-900">{kelengkapanData.charger ? 'Ada (Bawa)' : 'Tidak Ada'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${kelengkapanData.tas ? 'bg-indigo-600 dark:bg-indigo-400' : 'bg-slate-300'}`}></span>
                  <span className="text-slate-600 font-medium">Tas / Case:</span>
                  <span className="font-bold text-slate-900">{kelengkapanData.tas ? 'Ada (Bawa)' : 'Tidak Ada'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${kelengkapanData.dus ? 'bg-indigo-600 dark:bg-indigo-400' : 'bg-slate-300'}`}></span>
                  <span className="text-slate-600 font-medium">Dus / Box:</span>
                  <span className="font-bold text-slate-900">{kelengkapanData.dus ? 'Ada (Bawa)' : 'Tidak Ada'}</span>
                </div>
              </div>
              {kelengkapanData.lainnya && (
                <div className="mt-2 text-[12px] border-t border-slate-200/60 pt-2 flex items-baseline gap-1.5">
                  <span className="text-slate-500">Kelengkapan Lainnya:</span>
                  <span className="font-semibold text-slate-800 break-words">{kelengkapanData.lainnya}</span>
                </div>
              )}
            </div>
          )}

          {/* Quality Control (QC) Checklist Panel */}
          {qcData && (
            <div className="mb-5 bg-slate-50/50 border border-slate-200 rounded-md p-4 print:bg-transparent">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 pb-0.5 border-b border-slate-100 w-fit">Laporan Quality Control (QC)</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-[12px] mt-1.5">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[12px] font-bold ${qcData.keyboard ? 'text-emerald-600' : 'text-slate-400'}`}>{qcData.keyboard ? '✓' : '✗'}</span>
                  <span className="text-slate-700">Keyboard & Touchpad</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[12px] font-bold ${qcData.screen ? 'text-emerald-600' : 'text-slate-400'}`}>{qcData.screen ? '✓' : '✗'}</span>
                  <span className="text-slate-700">Layar / LCD Display</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[12px] font-bold ${qcData.wifi ? 'text-emerald-600' : 'text-slate-400'}`}>{qcData.wifi ? '✓' : '✗'}</span>
                  <span className="text-slate-700">Wi-Fi & Bluetooth</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[12px] font-bold ${qcData.audio ? 'text-emerald-600' : 'text-slate-400'}`}>{qcData.audio ? '✓' : '✗'}</span>
                  <span className="text-slate-700">Audio & Speaker</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[12px] font-bold ${qcData.charger ? 'text-emerald-600' : 'text-slate-400'}`}>{qcData.charger ? '✓' : '✗'}</span>
                  <span className="text-slate-700">Baterai & Charger</span>
                </div>
              </div>
            </div>
          )}

          {/* Spareparts Used Table */}
          {sparepartsData && sparepartsData.length > 0 && (
            <div className="mb-5 border border-slate-200 rounded-md overflow-hidden">
              <table className="w-full text-left border-collapse" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '50%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '20%' }} />
                </colgroup>
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-2 px-3 font-bold text-[11px] uppercase tracking-wider text-slate-800">Sparepart Terpasang / Diganti</th>
                    <th className="py-2 px-3 font-bold text-[11px] uppercase tracking-wider text-slate-800">Jumlah</th>
                    <th className="py-2 px-3 font-bold text-[11px] uppercase tracking-wider text-slate-800">Harga Satuan</th>
                    <th className="py-2 px-3 text-right font-bold text-[11px] uppercase tracking-wider text-slate-800">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-[12px]">
                  {sparepartsData.map((part: any, i: number) => (
                    <tr key={part.id || i}>
                      <td className="py-2 px-3 text-slate-800 font-semibold break-words">{part.name}</td>
                      <td className="py-2 px-3 text-slate-600 font-mono">{part.qty} pcs</td>
                      <td className="py-2 px-3 text-slate-600 font-mono">{formatCurrency(part.price)}</td>
                      <td className="py-2 px-3 text-right text-slate-900 font-bold font-mono">{formatCurrency(part.price * part.qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

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
                <div className="flex justify-between text-[12px] items-center">
                  <span className="text-slate-600">Status Servis</span>
                  <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border print:bg-transparent print:border-none print:px-0 ${getStatusBg(status)}`}>
                    {status}
                  </span>
                </div>
                {printData.completedDate && (
                  <div className="flex justify-between text-[12px] border-t border-dashed border-slate-200 pt-2">
                    <span className="text-slate-600">Tgl Selesai</span>
                    <span className="font-bold text-slate-900">{new Date(printData.completedDate).toLocaleDateString('id-ID')}</span>
                  </div>
                )}
                {printData.technicianName && (
                  <div className="flex justify-between text-[12px]">
                    <span className="text-slate-600">Teknisi</span>
                    <span className="font-bold text-slate-900">{printData.technicianName}</span>
                  </div>
                )}
                {sparepartsTotal > 0 && (
                  <div className="border-t border-dashed border-slate-200 pt-2 space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Biaya Jasa Servis</span>
                      <span className="font-semibold text-slate-800 font-mono">{formatCurrency(serviceFee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Biaya Spareparts</span>
                      <span className="font-semibold text-slate-800 font-mono">{formatCurrency(sparepartsTotal)}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center bg-white text-slate-900 px-3 py-3 border-t border-slate-300">
                <span className="text-[12px] font-bold uppercase tracking-widest">{printData.finalCost ? 'Biaya Akhir' : 'Estimasi Biaya'}</span>
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
              <p className="text-[12px] font-bold text-slate-900">{printData.customerName || "Pelanggan"}</p>
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
