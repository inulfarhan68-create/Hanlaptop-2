"use client";

import useSWR from "swr";
import { X, FileText, Loader2 } from "lucide-react";
import { fetcher } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface DrillEntry {
    id: string;
    transactionId: string | null;
    date: string;
    transactionType: string | null;
    invoiceNumber: string | null;
    description: string | null;
    debit: number;
    credit: number;
    running: number;
}

interface DrillData {
    accountCode: string;
    accountName: string | null;
    period: { year: number; month: number };
    entries: DrillEntry[];
    totalDebit: number;
    totalCredit: number;
    net: number;
}

/**
 * Shows the individual journal lines behind one account figure on a financial
 * statement — the drill-down from a P&L / Balance Sheet account row.
 */
export function DrillDownModal({
    accountCode,
    accountName,
    year,
    month,
    fmt,
    onClose,
}: {
    accountCode: string;
    accountName: string;
    year: number;
    month: number;
    fmt: (v: number) => string;
    onClose: () => void;
}) {
    const { data, isLoading } = useSWR<DrillData>(
        [`/api/accounting/account-detail?accountCode=${encodeURIComponent(accountCode)}&year=${year}&month=${month}`],
        fetcher
    );

    const fmtDate = (d: string) =>
        new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

    const entries = data?.entries ?? [];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-xl border border-border flex flex-col overflow-hidden animate-in zoom-in-95">
                <div className="px-5 py-4 border-b border-border flex justify-between items-start gap-3 shrink-0 bg-muted/30">
                    <div className="min-w-0">
                        <h3 className="font-bold text-base flex items-center gap-2 truncate">
                            <FileText className="h-4 w-4 text-primary shrink-0" />
                            <span className="truncate">{accountName}</span>
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Rincian jurnal · Akun {accountCode} · Periode {String(month).padStart(2, "0")}/{year}
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full shrink-0">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex-1 overflow-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" /> Memuat rincian…
                        </div>
                    ) : entries.length === 0 ? (
                        <div className="py-16 text-center text-sm text-muted-foreground">
                            Tidak ada transaksi pada akun ini untuk periode terpilih.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="sticky top-0 bg-card z-10">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="text-[10px] uppercase tracking-wider font-bold py-2.5 px-4">Tanggal</TableHead>
                                    <TableHead className="text-[10px] uppercase tracking-wider font-bold py-2.5">Keterangan</TableHead>
                                    <TableHead className="text-right text-[10px] uppercase tracking-wider font-bold py-2.5">Debit</TableHead>
                                    <TableHead className="text-right text-[10px] uppercase tracking-wider font-bold py-2.5">Kredit</TableHead>
                                    <TableHead className="text-right text-[10px] uppercase tracking-wider font-bold py-2.5 px-4">Saldo</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {entries.map((e) => (
                                    <TableRow key={e.id} className="border-b border-border/40">
                                        <TableCell className="py-2 px-4 text-xs whitespace-nowrap text-muted-foreground">{fmtDate(e.date)}</TableCell>
                                        <TableCell className="py-2 text-xs">
                                            <span className="font-medium text-foreground">{e.transactionType || "—"}</span>
                                            {e.invoiceNumber && <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">{e.invoiceNumber}</span>}
                                            {e.description && <div className="text-[11px] text-muted-foreground truncate max-w-[280px]" title={e.description}>{e.description}</div>}
                                        </TableCell>
                                        <TableCell className="py-2 text-right text-xs tabular-nums">{e.debit ? fmt(e.debit) : "—"}</TableCell>
                                        <TableCell className="py-2 text-right text-xs tabular-nums">{e.credit ? fmt(e.credit) : "—"}</TableCell>
                                        <TableCell className="py-2 px-4 text-right text-xs tabular-nums font-semibold">{fmt(Math.abs(e.running))}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>

                {data && entries.length > 0 && (
                    <div className="shrink-0 border-t border-border bg-muted/30 px-4 py-3 flex flex-wrap items-center justify-end gap-x-6 gap-y-1 text-xs">
                        <span className="text-muted-foreground">{entries.length} transaksi</span>
                        <span>Total Debit: <span className="font-bold tabular-nums">{fmt(data.totalDebit)}</span></span>
                        <span>Total Kredit: <span className="font-bold tabular-nums">{fmt(data.totalCredit)}</span></span>
                        <span>Mutasi Bersih: <span className="font-bold tabular-nums text-primary">{fmt(Math.abs(data.net))}</span></span>
                    </div>
                )}
            </div>
        </div>
    );
}
