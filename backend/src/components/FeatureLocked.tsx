"use client";

import Link from "next/link";
import { Lock, ArrowRight } from "lucide-react";
import { FEATURES, type FeatureKey } from "@/lib/features";
import { useUpgradeTarget } from "@/components/PlanFeaturesProvider";

/**
 * The client-side twin of `PlanUpsell`, for a locked area *inside* a page the
 * shop legitimately has.
 *
 * Laporan is the case that forced it: one page holding tabs from three tiers.
 * Gating the page would take Laporan away from Starter, which pays for it; not
 * gating anything meant a Starter shop clicked "Laba Rugi" and got a 402 toast
 * over an empty table. The tab has to stay visible and say what it costs.
 */
export function FeatureLocked({ feature, compact }: { feature: FeatureKey; compact?: boolean }) {
    const planName = useUpgradeTarget(feature);

    return (
        <div className={compact ? "py-6 text-center" : "py-14 text-center"}>
            <div className="h-11 w-11 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto mb-3">
                <Lock className="h-5 w-5" />
            </div>
            <p className="text-sm font-bold text-foreground mb-1.5">{FEATURES[feature]}</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed mb-5">
                Tidak termasuk dalam paket toko Anda saat ini
                {/* Left out entirely when no public plan sells it — naming a plan
                    that does not include the feature is worse than saying nothing. */}
                {planName ? <>, tersedia mulai paket <strong className="text-foreground">{planName}</strong></> : null}.
            </p>
            <Link
                href={`/settings/billing?feature=${feature}#paket`}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground text-xs font-bold px-4 py-2 hover:opacity-90 transition-opacity"
            >
                Lihat paket &amp; upgrade
                <ArrowRight className="h-3.5 w-3.5" />
            </Link>
        </div>
    );
}
