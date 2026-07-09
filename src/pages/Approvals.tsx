import { useState } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ShieldQuestion, Loader2, CheckCircle2, XCircle, Clock, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"

export function Approvals() {
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notes, setNotes] = useState("");
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);

  const { data: requests, isLoading, mutate } = useSWR(`/api/approvals?status=${statusFilter}`);

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;
    setIsProcessing(true);
    
    try {
      await apiFetch(`/api/approvals/${selectedRequest.id}`, {
        method: "POST",
        body: JSON.stringify({
          action: actionType,
          notes: notes
        })
      });

      toast.success(actionType === 'APPROVE' ? "Berhasil disetujui!" : "Request ditolak");
      mutate();
      setSelectedRequest(null);
      setNotes("");
      setActionType(null);
    } catch (error: any) {
      toast.error("Gagal memproses", { description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING": return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400"><Clock className="w-3 h-3 mr-1"/> Menunggu</Badge>;
      case "APPROVED": return <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400"><CheckCircle2 className="w-3 h-3 mr-1"/> Disetujui</Badge>;
      case "REJECTED": return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400"><XCircle className="w-3 h-3 mr-1"/> Ditolak</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ShieldQuestion className="w-8 h-8 text-primary" />
          Persetujuan (Approval)
        </h1>
        <p className="text-muted-foreground mt-1">
          Pusat kendali izin otoritas. Menyetujui atau menolak aksi berbahaya yang dicegat sistem.
        </p>
      </div>

      <div className="flex gap-2">
        <Button 
          variant={statusFilter === "PENDING" ? "default" : "outline"} 
          onClick={() => setStatusFilter("PENDING")}
          className="rounded-full"
        >
          Menunggu (Pending)
        </Button>
        <Button 
          variant={statusFilter === "APPROVED" ? "default" : "outline"} 
          onClick={() => setStatusFilter("APPROVED")}
          className="rounded-full"
        >
          Disetujui
        </Button>
        <Button 
          variant={statusFilter === "REJECTED" ? "default" : "outline"} 
          onClick={() => setStatusFilter("REJECTED")}
          className="rounded-full"
        >
          Ditolak
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="rounded-md overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground uppercase font-semibold text-[11px] tracking-wider border-b">
                <tr>
                  <th className="px-6 py-4">Waktu & Tiket</th>
                  <th className="px-6 py-4">Pemohon</th>
                  <th className="px-6 py-4">Jenis Aksi & Alasan</th>
                  <th className="px-6 py-4">Status</th>
                  {statusFilter === "PENDING" && <th className="px-6 py-4 text-right">Keputusan</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="h-40 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    </td>
                  </tr>
                ) : !requests || requests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="h-40 text-center text-muted-foreground flex-col items-center justify-center">
                      <ShieldQuestion className="w-10 h-10 mx-auto text-muted/50 mb-2" />
                      <p>Tidak ada tiket persetujuan di kategori ini</p>
                    </td>
                  </tr>
                ) : (
                  requests.map((req: any) => {
                    let payloadStr = "{}";
                    try {
                      const p = JSON.parse(req.payload);
                      payloadStr = p.reason || JSON.stringify(p);
                    } catch(e) {}

                    return (
                      <tr key={req.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-slate-700 dark:text-slate-300">
                            {new Date(req.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {new Date(req.createdAt).toLocaleTimeString("id-ID")}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-1 font-mono uppercase bg-muted px-1.5 py-0.5 rounded inline-block">
                            #{req.id.slice(0, 8)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-primary">{req.requester?.name || 'Kasir'}</div>
                          <div className="text-xs text-muted-foreground">{req.requester?.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold tracking-tight text-[13px] text-rose-600 dark:text-rose-400 mb-1">
                            {req.actionType.replace(/_/g, " ")}
                          </div>
                          <div className="text-xs text-muted-foreground italic border-l-2 pl-2 mt-2">
                            "{payloadStr}"
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(req.status)}
                          {req.status !== 'PENDING' && req.approver && (
                            <div className="text-[10px] text-muted-foreground mt-2">
                              Oleh: <span className="font-medium">{req.approver?.name}</span>
                            </div>
                          )}
                        </td>
                        {statusFilter === "PENDING" && (
                          <td className="px-6 py-4 text-right whitespace-nowrap space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                              onClick={() => {
                                setSelectedRequest(req);
                                setActionType('APPROVE');
                              }}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" /> Setujui
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-900/30"
                              onClick={() => {
                                setSelectedRequest(req);
                                setActionType('REJECT');
                              }}
                            >
                              <XCircle className="w-4 h-4 mr-1" /> Tolak
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Custom Confirmation Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !isProcessing && setSelectedRequest(null)} />
          <div className="relative bg-background p-6 rounded-lg shadow-lg w-full max-w-md border">
            <h2 className="text-lg font-bold mb-2">
              {actionType === 'APPROVE' ? "Setujui Permintaan?" : "Tolak Permintaan?"}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {actionType === 'APPROVE' 
                ? "Sistem akan segera mengeksekusi (Void Transaksi / Koreksi) sesaat setelah Anda menekan tombol Setujui."
                : "Permintaan akan ditandai sebagai ditolak dan tidak akan diproses oleh sistem."
              }
            </p>
            
            <div className="space-y-2 mb-6">
              <label className="text-sm font-medium">Catatan (Opsional)</label>
              <Input 
                placeholder="Masukkan pesan untuk Kasir..." 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isProcessing}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedRequest(null)} disabled={isProcessing}>
                Batal
              </Button>
              <Button 
                variant={actionType === 'APPROVE' ? 'default' : 'destructive'} 
                className={actionType === 'APPROVE' ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
                onClick={handleAction} 
                disabled={isProcessing}
              >
                {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {actionType === 'APPROVE' ? 'Ya, Setujui Eksekusi' : 'Ya, Tolak Permintaan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
