import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"

interface PeriodState {
  from?: string;
  to?: string;
  label: string;
}

interface FinancialReportsTabProps {
  period: PeriodState;
  fmt: (v: number) => string;
}

export function FinancialReportsTab({ period, fmt }: FinancialReportsTabProps) {
  const queryParams = new URLSearchParams()
  if (period.from) queryParams.append('from', period.from)
  if (period.to) queryParams.append('to', period.to)
  const q = queryParams.toString() ? `?${queryParams.toString()}` : ""

  const { data: res, error: reportsError, isLoading: loading, mutate: mutateReports } = useSWR(
    (import.meta.env.VITE_API_URL || '') + `/api/reports${q}`, 
    { keepPreviousData: true }
  )

  if (reportsError) {
    return (
      <div className="flex h-[50vh] items-center justify-center p-6 text-center">
        <div>
          <p className="text-destructive font-semibold text-lg mb-2">Gagal memuat laporan</p>
          <p className="text-muted-foreground text-sm mb-4">{reportsError.message}</p>
          <Button onClick={() => mutateReports()} variant="outline">Coba Lagi</Button>
        </div>
      </div>
    )
  }

  if (loading || !res) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const data = {
    label: period.label,
    revenue: {
      laptop: res.revenue?.laptop || 0,
      servis: res.revenue?.servis || 0
    },
    cogs: res.cogs || 0,
    opex: {
      gaji: res.opex?.gaji || 0,
      listrik: res.opex?.listrik || 0,
      sewa: res.opex?.sewa || 0,
      lainnya: res.opex?.lainnya || 0
    },
    assets: {
      kas: res.assets?.kas || 0,
      inventory: res.assets?.inventory || 0,
      piutang: res.assets?.piutang || 0
    },
    liabilities: res.liabilities || 0,
    liabilitiesDetail: {
      hutangUsaha: res.liabilitiesDetail?.hutangUsaha || 0,
      hutangBank: res.liabilitiesDetail?.hutangBank || 0
    },
    equity: res.equity || 0,
    cumulativeNetProfit: res.cumulativeNetProfit || 0
  }

  // Precision floating-point protection math
  const totalRevenue = Math.round(data.revenue.laptop + data.revenue.servis)
  const grossProfit = Math.round(totalRevenue - data.cogs)
  const totalOpex = Math.round(data.opex.gaji + data.opex.listrik + data.opex.sewa + (data.opex.lainnya || 0))
  const netProfit = Math.round(grossProfit - totalOpex)
  const totalAssets = Math.round(data.assets.kas + data.assets.inventory + (data.assets.piutang || 0))
  const retainedEarnings = Math.round(data.cumulativeNetProfit || 0)
  const totalEquity = Math.round(data.equity + retainedEarnings)
  const totalLiabEquity = Math.round(data.liabilities + totalEquity)
  
  const grossMargin = totalRevenue === 0 ? "0.0" : ((grossProfit / totalRevenue) * 100).toFixed(1)
  const netMargin = totalRevenue === 0 ? "0.0" : ((netProfit / totalRevenue) * 100).toFixed(1)

  return (
    <div className="space-y-4">
      {/* Summary KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 md:gap-2 mb-1.5 print:hidden">
        {[
          { label: "Total Revenue", value: fmt(totalRevenue), color: "text-primary" },
          { label: "Gross Profit", value: fmt(grossProfit), color: "text-emerald-600 dark:text-emerald-500" },
          { label: "Net Profit", value: fmt(netProfit), color: netProfit >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-destructive" },
          { label: "Net Margin", value: `${netMargin}%`, color: parseFloat(netMargin) >= 15 ? "text-emerald-600 dark:text-emerald-500" : "text-amber-500" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border border-border/50 bg-white/60 dark:bg-card/60 backdrop-blur-md rounded-xl">
            <CardContent className="p-2 md:p-3 text-center md:text-left flex flex-col justify-center">
              <p className="text-[9px] md:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5 truncate">{kpi.label}</p>
              <p className={`text-[11px] md:text-[14px] font-extrabold truncate ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 2xl:grid-cols-2 print:hidden" id="screen-report-area">
        {/* Profit and Loss */}
        <div className="flex flex-col h-full">
          <Card className="flex flex-col h-full">
            <CardHeader className="border-b border-border/50 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    Laporan Laba Rugi
                  </CardTitle>
                  <CardDescription className="mt-0.5 text-xs md:text-sm">Profit & Loss Statement — {data.label}</CardDescription>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-[10px] md:text-xs text-muted-foreground">Gross Margin</p>
                  <p className="text-xs md:text-sm font-bold text-primary">{grossMargin}%</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto max-w-[100vw] sm:max-w-none scrollbar-none">
              <Table className="min-w-[400px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[65%] pl-3 md:pl-5">Akun</TableHead>
                    <TableHead className="text-right pr-3 md:pr-5">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-muted/40">
                    <TableCell colSpan={2} className="font-semibold text-primary text-xs uppercase tracking-wide pl-3 md:pl-5">Pendapatan (Revenue)</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6 md:pl-8">Penjualan Laptop & Sparepart</TableCell>
                    <TableCell className="text-right pr-3 md:pr-5">{fmt(data.revenue.laptop)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6 md:pl-8">Pendapatan Jasa Servis</TableCell>
                    <TableCell className="text-right pr-3 md:pr-5">{fmt(data.revenue.servis)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/60 border-t-2 border-black">
                    <TableCell className="pl-3 md:pl-5 font-bold uppercase text-xs">Total Revenue</TableCell>
                    <TableCell className="text-right pr-3 md:pr-5 font-bold">{fmt(totalRevenue)}</TableCell>
                  </TableRow>

                  <TableRow className="bg-muted/20">
                    <TableCell colSpan={2} className="font-bold text-xs uppercase tracking-wide pl-3 md:pl-5">Harga Pokok Penjualan (COGS)</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6 md:pl-8">HPP Laptop & Sparepart</TableCell>
                    <TableCell className="text-right pr-3 md:pr-5 text-destructive">({fmt(data.cogs)})</TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/20 border-t-2 border-black">
                    <TableCell className="pl-3 md:pl-5 font-bold text-xs uppercase">Laba Kotor (Gross Profit)</TableCell>
                    <TableCell className="text-right pr-3 md:pr-5 font-bold text-emerald-600">{fmt(grossProfit)}</TableCell>
                  </TableRow>

                  <TableRow className="bg-muted/20 mt-4">
                    <TableCell colSpan={2} className="font-bold text-xs uppercase tracking-wide pl-3 md:pl-5 pt-4">Beban Operasional</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6 md:pl-8">Beban Gaji Karyawan</TableCell>
                    <TableCell className="text-right pr-3 md:pr-5 text-destructive">({fmt(data.opex.gaji)})</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6 md:pl-8">Beban Listrik & Internet</TableCell>
                    <TableCell className="text-right pr-3 md:pr-5 text-destructive">({fmt(data.opex.listrik)})</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6 md:pl-8">Beban Sewa Tempat</TableCell>
                    <TableCell className="text-right pr-3 md:pr-5 text-destructive">({fmt(data.opex.sewa)})</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6 md:pl-8">Beban Lain-lain</TableCell>
                    <TableCell className="text-right pr-3 md:pr-5 text-destructive">({fmt(data.opex.lainnya || 0)})</TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/20 border-t-2 border-black">
                    <TableCell className="pl-3 md:pl-5 font-bold text-xs uppercase">Total Beban Operasional</TableCell>
                    <TableCell className="text-right pr-3 md:pr-5 font-bold text-destructive">({fmt(totalOpex)})</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
            
            <div className="mt-auto border-t-[3px] border-border bg-primary/10 px-5 py-4 flex justify-between items-center rounded-b-xl">
              <span className="font-bold text-sm md:text-base uppercase tracking-wide">Laba Bersih (Net Profit)</span>
              <span className={`font-bold text-base md:text-lg ${netProfit >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-destructive"}`}>
                {fmt(netProfit)}
              </span>
            </div>
          </Card>
        </div>

        {/* Balance Sheet */}
        <div className="flex flex-col h-full">
          <Card className="flex flex-col h-full mt-8 xl:mt-0">
            <CardHeader className="border-b border-border/50 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    Neraca (Balance Sheet)
                  </CardTitle>
                  <CardDescription className="mt-0.5 text-xs md:text-sm">Per akhir {data.label}</CardDescription>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-[10px] md:text-xs text-muted-foreground">Total Aset</p>
                  <p className="text-xs md:text-sm font-bold text-primary">{fmt(totalAssets)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto max-w-[100vw] sm:max-w-none scrollbar-none">
              <Table className="min-w-[400px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[65%] pl-3 md:pl-5">Akun</TableHead>
                    <TableHead className="text-right pr-3 md:pr-5">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-muted/20">
                    <TableCell colSpan={2} className="font-bold text-xs uppercase tracking-wide pl-3 md:pl-5">Aset (Aktiva)</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6 md:pl-8">Kas & Bank</TableCell>
                    <TableCell className="text-right pr-3 md:pr-5">{fmt(data.assets.kas)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6 md:pl-8">Piutang Usaha (Belum Lunas)</TableCell>
                    <TableCell className="text-right pr-3 md:pr-5">{fmt(data.assets.piutang || 0)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6 md:pl-8">Persediaan (Inventory)</TableCell>
                    <TableCell className="text-right pr-3 md:pr-5">{fmt(data.assets.inventory)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/20 border-t-2 border-black">
                    <TableCell className="pl-3 md:pl-5 font-bold text-xs uppercase">Total Aset</TableCell>
                    <TableCell className="text-right pr-3 md:pr-5 font-bold">{fmt(totalAssets)}</TableCell>
                  </TableRow>

                  <TableRow className="bg-muted/20 mt-4">
                    <TableCell colSpan={2} className="font-bold text-xs uppercase tracking-wide pl-3 md:pl-5 pt-4">Kewajiban (Liabilities)</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6 md:pl-8">Hutang Usaha (Supplier)</TableCell>
                    <TableCell className="text-right pr-3 md:pr-5">{fmt(data.liabilitiesDetail?.hutangUsaha || 0)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6 md:pl-8">Hutang Bank / Kreditur</TableCell>
                    <TableCell className="text-right pr-3 md:pr-5">{fmt(data.liabilitiesDetail?.hutangBank || 0)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/20 border-t-2 border-black">
                    <TableCell className="pl-3 md:pl-5 font-bold text-xs uppercase">Total Kewajiban</TableCell>
                    <TableCell className="text-right pr-3 md:pr-5 font-bold">{fmt(data.liabilities)}</TableCell>
                  </TableRow>

                  <TableRow className="bg-muted/20 mt-4">
                    <TableCell colSpan={2} className="font-bold text-xs uppercase tracking-wide pl-3 md:pl-5 pt-4">Modal (Equity)</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6 md:pl-8">Modal Pemilik</TableCell>
                    <TableCell className="text-right pr-3 md:pr-5">{fmt(data.equity)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6 md:pl-8">Laba Ditahan (Retained Earnings)</TableCell>
                    <TableCell className="text-right pr-3 md:pr-5">{fmt(retainedEarnings)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/20 border-t-2 border-black">
                    <TableCell className="pl-3 md:pl-5 font-bold text-xs uppercase">Total Modal</TableCell>
                    <TableCell className="text-right pr-3 md:pr-5 font-bold">{fmt(totalEquity)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
            
            <div className="mt-auto border-t-[3px] border-border bg-primary/10 px-5 py-4 flex justify-between items-center rounded-b-xl">
              <span className="font-bold text-sm md:text-base uppercase tracking-wide">Total Kewajiban & Modal</span>
              <span className="font-bold text-base md:text-lg text-primary">
                {fmt(totalLiabEquity)}
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
