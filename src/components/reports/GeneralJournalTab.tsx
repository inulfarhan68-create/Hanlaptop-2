import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface PeriodState {
  from?: string;
  to?: string;
  label: string;
}

interface GeneralJournalTabProps {
  period: PeriodState;
  fmt: (v: number) => string;
}

export function GeneralJournalTab({ period, fmt }: GeneralJournalTabProps) {
  const queryParams = new URLSearchParams()
  if (period.from) queryParams.append('from', period.from)
  if (period.to) queryParams.append('to', period.to)
  const q = queryParams.toString() ? `?${queryParams.toString()}` : ""

  const { data: journalsData = [], isLoading: journalsLoading } = useSWR<any[]>(
    (import.meta.env.VITE_API_URL || '') + `/api/journals${q}`, 
    { keepPreviousData: true }
  )

  return (
    <div className="print:hidden space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Jurnal Umum (General Journal)</CardTitle>
          <CardDescription>Rincian mutasi debit dan kredit seluruh akun</CardDescription>
        </CardHeader>
        <CardContent>
          {journalsLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Akun</TableHead>
                  <TableHead>Keterangan/Ref</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Kredit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journalsData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center p-8 text-muted-foreground">
                      Tidak ada jurnal pada periode ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  [...journalsData]
                    .sort((a: any, b: any) => {
                      const dateDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                      if (dateDiff !== 0) return dateDiff
                      if (a.transactionId !== b.transactionId) return a.transactionId.localeCompare(b.transactionId)
                      if (a.debit > 0 && b.debit === 0) return -1
                      if (b.debit > 0 && a.debit === 0) return 1
                      return 0
                    })
                    .map((j: any) => (
                      <TableRow key={j.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(j.createdAt).toLocaleDateString('id-ID')}
                        </TableCell>
                        <TableCell className="font-semibold text-xs">{j.accountName}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">
                          {j.transaction?.invoiceNumber || '-'} <br />
                          <span className="text-[10px] text-muted-foreground">
                            {j.transaction?.description || j.transaction?.transactionType}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums text-emerald-600">
                          {j.debit > 0 ? fmt(j.debit) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums text-destructive">
                          {j.credit > 0 ? fmt(j.credit) : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
