import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface PeriodState {
  from?: string;
  to?: string;
  label: string;
}

interface CashFlowTabProps {
  period: PeriodState;
  fmt: (v: number) => string;
}

export function CashFlowTab({ period, fmt }: CashFlowTabProps) {
  const queryParams = new URLSearchParams()
  if (period.from) queryParams.append('from', period.from)
  if (period.to) queryParams.append('to', period.to)
  const q = queryParams.toString() ? `?${queryParams.toString()}` : ""

  const { data: journalsData = [], isLoading: journalsLoading } = useSWR<any[]>(
    (import.meta.env.VITE_API_URL || '') + `/api/journals${q}`, 
    { keepPreviousData: true }
  )

  if (journalsLoading) {
    return (
      <div className="flex justify-center p-8 print:hidden">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const cashJournals = journalsData.filter(
    (j: any) => j.accountName === 'Kas' || j.accountName === 'Bank' || j.accountName === 'QRIS'
  )
  
  const operating = cashJournals.filter(
    (j: any) => !['Modal Baru', 'Prive', 'Pinjaman Bank', 'Pelunasan Hutang', 'Pembelian Aset Tetap', 'Penjualan Aset Tetap'].includes(j.transaction?.transactionType)
  )
  const investing = cashJournals.filter(
    (j: any) => ['Pembelian Aset Tetap', 'Penjualan Aset Tetap'].includes(j.transaction?.transactionType)
  )
  const financing = cashJournals.filter(
    (j: any) => ['Modal Baru', 'Prive', 'Pinjaman Bank', 'Pelunasan Hutang'].includes(j.transaction?.transactionType)
  )

  const calcNet = (arr: any[]) => Math.round(arr.reduce((sum, j) => sum + Math.round(j.debit - j.credit), 0))
  const opNet = calcNet(operating)
  const invNet = calcNet(investing)
  const finNet = calcNet(financing)
  const totalNet = Math.round(opNet + invNet + finNet)

  const getBreakdown = (arr: any[]) => {
    const breakdown: Record<string, number> = {}
    arr.forEach(j => {
      const type = j.transaction?.transactionType || 'Lainnya'
      if (!breakdown[type]) breakdown[type] = 0
      breakdown[type] = Math.round(breakdown[type] + Math.round(j.debit - j.credit))
    })
    return Object.entries(breakdown).filter(([_, val]) => val !== 0)
  }

  const renderBreakdown = (title: string, arr: any[], net: number) => (
    <div className="border rounded-md overflow-hidden bg-card">
      <h4 className="font-bold text-sm bg-slate-100 dark:bg-muted text-slate-800 dark:text-slate-100 p-3 border-b border-border">{title}</h4>
      <div className="p-0">
        {getBreakdown(arr).length === 0 ? (
          <div className="px-4 py-3 text-sm text-muted-foreground italic">Tidak ada arus kas</div>
        ) : (
          getBreakdown(arr).map(([type, val], i) => (
            <div key={i} className="flex justify-between px-4 py-2 border-b border-border last:border-0">
              <span className="text-sm text-slate-600 dark:text-slate-300">Aliran dari {type}</span>
              <span className={`text-sm tabular-nums ${val >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                {val >= 0 ? fmt(val) : `(${fmt(Math.abs(val))})`}
              </span>
            </div>
          ))
        )}
      </div>
      <div className="flex justify-between px-4 py-3 bg-slate-50/50 dark:bg-muted/30 border-t border-border">
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Kas Bersih</span>
        <span className={`text-sm font-bold tabular-nums ${net >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
          {net >= 0 ? fmt(net) : `(${fmt(Math.abs(net))})`}
        </span>
      </div>
    </div>
  )

  return (
    <div className="print:hidden space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Laporan Arus Kas (Cash Flow)</CardTitle>
          <CardDescription>Aliran masuk dan keluar kas/bank (Uang tunai & setara kas)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderBreakdown("Aktivitas Operasi (Operating)", operating, opNet)}
          {renderBreakdown("Aktivitas Investasi (Investing)", investing, invNet)}
          {renderBreakdown("Aktivitas Pendanaan (Financing)", financing, finNet)}

          <div className="flex justify-between p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <span className="font-bold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wide">Kenaikan / (Penurunan) Bersih Kas</span>
            <span className={`font-extrabold text-base tabular-nums ${totalNet >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
              {totalNet >= 0 ? fmt(totalNet) : `(${fmt(Math.abs(totalNet))})`}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
