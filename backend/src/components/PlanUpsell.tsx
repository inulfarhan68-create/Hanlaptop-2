import Link from "next/link";
import { Lock, ArrowRight } from "lucide-react";
import { FEATURES, type FeatureKey } from "@/lib/features";
import { cheapestPlanWith } from "@/lib/plan-gate";

/**
 * What a shop sees where a feature it does not pay for would be.
 *
 * Deliberately a page, not a redirect: bouncing someone to the dashboard reads as
 * a broken link, and they try again. Naming the feature and the plan that carries
 * it turns the wall into the only thing it can usefully be — an offer.
 */
export async function PlanUpsell({ feature }: { feature: FeatureKey }) {
    const planName = await cheapestPlanWith(feature);

    return (
        <div className="flex items-center justify-center min-h-[70vh] p-4">
            <div className="max-w-md w-full text-center bg-card border border-border rounded-2xl p-8 shadow-sm">
                <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                    <Lock className="h-5 w-5" />
                </div>
                <h1 className="text-lg font-bold text-foreground mb-2">
                    {FEATURES[feature]}
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    Fitur ini tidak termasuk dalam paket toko Anda saat ini
                    {/* Omitted entirely when no public plan sells it — pointing a shop
                        at a plan that does not actually include the feature is worse
                        than staying quiet. */}
                    {planName ? <>, dan tersedia mulai paket <strong className="text-foreground">{planName}</strong></> : null}.
                </p>
                <Link
                    href="/settings/billing"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground text-sm font-bold px-5 py-2.5 hover:opacity-90 transition-opacity"
                >
                    Lihat paket &amp; upgrade
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
        </div>
    );
}
