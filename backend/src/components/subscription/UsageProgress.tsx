"use client";

import { useSubscription } from "@/lib/use-subscription";
import { AlertCircle } from "lucide-react";
import { useMemo } from "react";

/**
 * A UI component that displays a warning banner if the tenant is approaching their transaction limits.
 * Expected to be placed in a global layout or dashboard.
 */
export function UsageProgress({
    currentTransactions = 0
}: {
    currentTransactions?: number;
}) {
    const { plan, isLoading } = useSubscription();

    const maxTransactions = plan?.maxTransactionsPerMonth;

    const progress = useMemo(() => {
        if (!maxTransactions) return 0;
        return (currentTransactions / maxTransactions) * 100;
    }, [currentTransactions, maxTransactions]);

    if (isLoading || !maxTransactions) return null;

    if (progress < 80) return null; // Only show warning when >= 80%

    let bannerColor = "bg-yellow-50 text-yellow-800 border-yellow-200";
    let iconColor = "text-yellow-500";
    let message = `Penggunaan transaksi Anda bulan ini mencapai ${Math.round(progress)}% dari batas paket ${plan?.name}.`;

    if (progress >= 100) {
        bannerColor = "bg-red-50 text-red-800 border-red-200";
        iconColor = "text-red-500";
        message = `Anda telah melampaui batas transaksi paket ${plan?.name} (${maxTransactions} transaksi). Mohon segera upgrade paket Anda agar operasional kasir tetap lancar.`;
    } else if (progress >= 90) {
        bannerColor = "bg-orange-50 text-orange-800 border-orange-200";
        iconColor = "text-orange-500";
        message = `Peringatan: Penggunaan transaksi sudah ${Math.round(progress)}%. Segera upgrade paket Anda sebelum mencapai batas limit.`;
    }

    return (
        <div className={`flex items-start gap-3 p-4 border rounded-md mb-4 ${bannerColor}`}>
            <AlertCircle className={`w-5 h-5 mt-0.5 shrink-0 ${iconColor}`} />
            <div>
                <p className="text-sm font-medium">{message}</p>
                <div className="w-full bg-white/50 h-2 mt-2 rounded-full overflow-hidden">
                    <div 
                        className={`h-full ${progress >= 100 ? 'bg-red-500' : progress >= 90 ? 'bg-orange-500' : 'bg-yellow-500'}`} 
                        style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
