"use client";

import { createContext, useContext } from "react";
import type { PlanFeatureMap } from "@/lib/route-features";
import { FEATURES, type FeatureKey } from "@/lib/features";
import { toast } from "sonner";

/**
 * The tenant's plan features, resolved once server-side in (admin)/layout and
 * handed to the client shell.
 *
 * A client component cannot look this up for itself — the plan lives on the
 * subscription row, and asking for it over the wire on every mount would put a
 * request in front of every menu. Everything the shell hides by plan (sidebar
 * entries, the audit tab in Settings) reads it from here, so the menu and the
 * server gate can never disagree.
 */
type PlanContext = {
    features: PlanFeatureMap | null;
    /** Feature → cheapest plan that sells it. Only features the shop lacks. */
    upgrades: Record<string, string>;
};

const PlanFeaturesContext = createContext<PlanContext>({ features: null, upgrades: {} });

export function PlanFeaturesProvider({
    features,
    upgrades = {},
    children,
}: {
    features: PlanFeatureMap | null;
    upgrades?: Record<string, string>;
    children: React.ReactNode;
}) {
    return (
        <PlanFeaturesContext.Provider value={{ features, upgrades }}>
            {children}
        </PlanFeaturesContext.Provider>
    );
}

/** The raw map. `null` = no plan resolved; callers fall open, never closed. */
export function usePlanFeatures(): PlanFeatureMap | null {
    return useContext(PlanFeaturesContext).features;
}

/** Which plan to name in an offer for a feature the shop lacks — `null` if none sells it. */
export function useUpgradeTarget(feature: FeatureKey): string | null {
    return useContext(PlanFeaturesContext).upgrades[feature] ?? null;
}

/**
 * Whether the shop has a feature. Unresolved plan → `true`, matching
 * `routeAllowedByPlan` and `planAllows`: a billing lookup that found nothing must
 * not take away a page the shop already uses.
 */
/**
 * A single toolbar button's worth of gating: whether it works, and what to say
 * when it does not.
 *
 * Buttons stay on screen rather than disappearing, for the same reason the
 * sidebar keeps locked entries — a shop cannot ask to buy what it has never
 * seen. Clicking one explains the price instead of opening a modal that would
 * fail at the API.
 */
export function useFeatureGate(feature: FeatureKey) {
    const { features, upgrades } = useContext(PlanFeaturesContext);
    const allowed = !features || features[feature] === true;
    const planName = upgrades[feature] ?? null;
    return {
        allowed,
        planName,
        notifyLocked: () =>
            toast.info(
                planName
                    ? `${FEATURES[feature]} tersedia mulai paket ${planName}.`
                    : `${FEATURES[feature]} tidak termasuk dalam paket Anda.`,
                { description: "Buka Billing & Plan untuk upgrade." },
            ),
    };
}

export function useHasFeature(feature: FeatureKey): boolean {
    const { features } = useContext(PlanFeaturesContext);
    if (!features) return true;
    return features[feature] === true;
}
