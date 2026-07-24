"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * "Coba demo" CTA. Signs the visitor into the read-only demo tenant via
 * /api/demo/login (password stays server-side) then drops them on the dashboard.
 */
export function DemoButton({ className }: { className?: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function openDemo() {
        setLoading(true);
        try {
            const res = await fetch("/api/demo/login", { method: "POST" });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                toast.error(data.error || "Mode demo sedang tidak tersedia.");
                return;
            }
            toast.success("Membuka demo (mode baca-saja)…");
            router.push("/dashboard");
            router.refresh();
        } catch {
            toast.error("Gagal membuka demo. Coba lagi.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={openDemo}
            disabled={loading}
            className={className}
        >
            {loading ? (
                <>
                    <Loader2 className="h-5 w-5 animate-spin" /> Membuka demo…
                </>
            ) : (
                <>
                    <Play className="h-5 w-5" /> Coba demo
                </>
            )}
        </Button>
    );
}
