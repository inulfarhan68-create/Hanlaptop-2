"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useTenant } from "@/components/TenantProvider";
import { apiFetch } from "@/lib/api";

export function DemoBanner({ isOwner }: { isOwner: boolean }) {
    const { activeStore } = useTenant();
    const [loading, setLoading] = useState(false);
    
    // We fetch KPI data to quickly check if the store has any transactions
    const { data } = useSWR<any>(
        isOwner ? ["dashboard_demo_check", activeStore?.id] : null,
        () => apiFetch(`/api/dashboard/kpi?storeId=${activeStore?.id}`)
    );

    const isStoreEmpty = data && (!data.sales || data.sales.value === 0);

    if (!isOwner || !isStoreEmpty) return null;

    const handleLoadDemo = async () => {
        if (!confirm("Are you sure you want to load dummy data? This will create dummy customers, items, and transactions.")) return;
        setLoading(true);
        try {
            const res = await fetch("/api/tenant/seed-demo", { method: "POST" });
            if (res.ok) {
                window.location.reload();
            } else {
                alert("Failed to load demo data.");
                setLoading(false);
            }
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    return (
        <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-blue-500/20 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
            <div>
                <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                    <Sparkles className="h-5 w-5 text-blue-500" />
                    Welcome to HanLaptop!
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Your store is completely empty. Would you like to load some dummy data to see how the dashboard looks when fully populated?
                </p>
            </div>
            <Button onClick={handleLoadDemo} disabled={loading} className="shrink-0 gap-2 font-bold bg-blue-600 hover:bg-blue-700 text-white">
                {loading ? "Generating Data..." : (
                    <>
                        <Sparkles className="h-4 w-4" />
                        Load Demo Data
                    </>
                )}
            </Button>
        </div>
    );
}
