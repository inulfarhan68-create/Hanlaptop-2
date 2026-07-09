import { useState } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ShieldAlert, FileJson, Activity, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function AuditLogs() {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useSWR(`/api/logs/audit?page=${page}&limit=${limit}`);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ShieldAlert className="w-8 h-8 text-primary" />
          Audit Trail
        </h1>
        <p className="text-muted-foreground mt-1">
          Pantauan forensik aktivitas pengguna. Merekam siapa mengubah apa secara real-time.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Log Aktivitas (Anti-Fraud)</CardTitle>
          <CardDescription>Menampilkan rekam jejak operasi kritis pada sistem</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Aksi</th>
                  <th className="px-4 py-3">Modul</th>
                  <th className="px-4 py-3">Data Sebelum</th>
                  <th className="px-4 py-3">Data Sesudah</th>
                  <th className="px-4 py-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="h-32 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    </td>
                  </tr>
                ) : data?.data?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="h-32 text-center text-muted-foreground">
                      Belum ada aktivitas yang terekam
                    </td>
                  </tr>
                ) : (
                  data?.data?.map((log: any) => (
                    <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("id-ID", { 
                          day: "numeric", month: "short", year: "numeric", 
                          hour: "2-digit", minute: "2-digit", second: "2-digit" 
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold">{log.user?.name || 'Sistem'}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">{log.user?.role || '-'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold tracking-wider ${
                          log.action === 'UPDATE' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                          log.action === 'DELETE' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                          log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">{log.entity}</td>
                      <td className="px-4 py-3 max-w-[200px]">
                        {log.oldValue ? (
                          <div className="text-[11px] font-mono text-slate-500 max-h-16 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-2 rounded border truncate break-words whitespace-pre-wrap">
                            {log.oldValue}
                          </div>
                        ) : <span className="text-muted-foreground text-[10px] italic">-</span>}
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        {log.newValue ? (
                          <div className="text-[11px] font-mono text-slate-500 max-h-16 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-2 rounded border truncate break-words whitespace-pre-wrap">
                            {log.newValue}
                          </div>
                        ) : <span className="text-muted-foreground text-[10px] italic">-</span>}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-muted-foreground font-mono">
                        {log.ipAddress}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {data?.metadata && data.metadata.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-2">
              <span className="text-sm text-muted-foreground">
                Halaman {data.metadata.page} dari {data.metadata.totalPages} ({data.metadata.total} Log)
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Sebelumnya
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={page === data.metadata.totalPages}
                  onClick={() => setPage(p => Math.min(data.metadata.totalPages, p + 1))}
                >
                  Selanjutnya
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
