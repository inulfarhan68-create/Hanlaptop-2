import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

const API_URL = import.meta.env.VITE_API_URL || "";

interface ApprovalRequest {
    id: string;
    actionType: string;
    referenceId: string;
    payload: any;
    status: string;
    createdAt: string;
    requester?: { name: string; email: string };
}

export function ApprovalBoard({ isOwner }: { isOwner: boolean }) {
    const [processingId, setProcessingId] = useState<string | null>(null);
    const storeId = localStorage.getItem("selectedStoreId") || "default";

    const { data: requests = [], isLoading: loading, mutate: fetchRequests } = useSWR<ApprovalRequest[]>(
        isOwner ? `/api/approvals?storeId=${storeId}` : null,
        { refreshInterval: 15000 }
    );

    const handleAction = async (requestId: string, action: 'APPROVE' | 'REJECT') => {
        if (!confirm(`Anda yakin ingin ${action === 'APPROVE' ? 'menyetujui' : 'menolak'} request ini?`)) return;

        setProcessingId(requestId);
        try {
            const response = await apiFetch(`/api/approvals/${requestId}`, {
                method: "POST",
                body: JSON.stringify({ action })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Gagal memproses request");

            toast.success(data.message || `Request ${action === 'APPROVE' ? 'disetujui' : 'ditolak'}`);
            fetchRequests();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setProcessingId(null);
        }
    };

    if (!isOwner) return null;

    if (loading) return <div className="p-4 text-sm text-muted-foreground animate-pulse">Memuat persetujuan...</div>;

    if (requests.length === 0) return (
        <div className="bg-card border rounded-xl p-6 text-center shadow-sm">
            <ShieldAlert className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <h4 className="font-semibold text-sm">Tidak ada permintaan persetujuan</h4>
            <p className="text-xs text-muted-foreground mt-1">Semua alur persetujuan saat ini sudah selesai.</p>
        </div>
    );

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden mb-4">
            <div className="p-4 border-b bg-muted/20 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm md:text-base">Approval Board (Perlu Tindakan)</h3>
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full ml-auto">
                    {requests.length} Tertunda
                </span>
            </div>
            <div className="divide-y max-h-[400px] overflow-y-auto">
                {requests.map(req => (
                    <div key={req.id} className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between hover:bg-muted/10 transition-colors">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded border border-primary/20 uppercase">
                                    {req.actionType.replace(/_/g, ' ')}
                                </span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatDate(req.createdAt)}
                                </span>
                            </div>
                            <p className="text-sm">
                                <span className="font-medium text-foreground">{req.requester?.name || 'Kasir'}</span> meminta persetujuan untuk 
                                <span className="font-bold ml-1">{req.actionType === 'VOID_TRANSACTION' ? `Pembatalan Transaksi #${req.referenceId?.substring(0, 8).toUpperCase()}` : req.actionType}</span>.
                            </p>
                            {req.payload?.reason && (
                                <p className="text-xs text-muted-foreground mt-1 border-l-2 border-border pl-2 italic">
                                    "{req.payload.reason}"
                                </p>
                            )}
                        </div>
                        <div className="flex gap-2 shrink-0 w-full md:w-auto">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1 md:flex-none border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-8"
                                onClick={() => handleAction(req.id, 'REJECT')}
                                disabled={processingId === req.id}
                            >
                                <XCircle className="w-4 h-4 mr-1.5" /> Tolak
                            </Button>
                            <Button 
                                size="sm" 
                                className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                                onClick={() => handleAction(req.id, 'APPROVE')}
                                disabled={processingId === req.id}
                            >
                                <CheckCircle className="w-4 h-4 mr-1.5" /> 
                                {processingId === req.id ? 'Memproses...' : 'Setujui'}
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}


