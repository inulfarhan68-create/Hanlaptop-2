"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";
import { fetcher } from "@/lib/api";
import { Button } from "@/components/ui/button";

type Metric = {
    metric: "stores" | "users" | "transactions";
    used: number;
    limit: number | null;
    remaining: number | null;
    percent: number | null;
    status: "unlimited" | "ok" | "warning" | "critical" | "blocked";
};

const LABEL: Record<Metric["metric"], string> = {
    stores: "cabang",
    users: "pengguna",
    transactions: "transaksi bulan ini",
};

const SEVERITY: Record<string, number> = { blocked: 3, critical: 2, warning: 1 };

/**
 * Soft-limit warning bar (Phase 4). Reads /api/usage and surfaces the most severe
 * metric nearing/at its plan cap (warning ≥80%, critical ≥90%, blocked at 100%),
 * with an upgrade CTA. Self-hides when everything is comfortably within limits.
 */
export function UsageBanner() {
    const [dismissed, setDismissed] = useState(false);
    const { data } = useSWR<{ metrics: Metric[] }>("/api/usage", fetcher);

    if (dismissed || !data?.metrics?.length) return null;

    const flagged = data.metrics
        .filter((m) => m.status === "warning" || m.status === "critical" || m.status === "blocked")
        .sort((a, b) => (SEVERITY[b.status] ?? 0) - (SEVERITY[a.status] ?? 0))[0];

    if (!flagged) return null;

    const blocked = flagged.status === "blocked";
    const label = LABEL[flagged.metric];

    return (
        <div
            className={`rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-2 border ${
                blocked ? "border-red-500/30 bg-red-500/10" : "border-amber-500/30 bg-amber-500/10"
            }`}
        >
            <div className="flex items-start gap-3">
                <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${blocked ? "text-red-500" : "text-amber-500"}`} />
                <div>
                    <p className="font-bold text-foreground">
                        {blocked
                            ? `Batas paket tercapai — ${label} ${flagged.used}/${flagged.limit}`
                            : `Mendekati batas ${label} — ${flagged.used}/${flagged.limit}`}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {blocked
                            ? `Anda tidak bisa menambah ${label} lagi di paket ini. Upgrade untuk melanjutkan.`
                            : `Sisa ${flagged.remaining} lagi. Pertimbangkan upgrade paket sebelum penuh.`}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                <Link href="/product#harga">
                    <Button size="sm" className="font-bold">Lihat paket</Button>
                </Link>
                {!blocked && (
                    <Button size="sm" variant="ghost" onClick={() => setDismissed(true)} aria-label="Tutup">
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}
