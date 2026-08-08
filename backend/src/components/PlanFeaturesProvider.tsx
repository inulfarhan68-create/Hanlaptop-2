"use client";

import { createContext, useContext } from "react";
import type { PlanFeatureMap } from "@/lib/route-features";
import type { FeatureKey } from "@/lib/features";

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
const PlanFeaturesContext = createContext<PlanFeatureMap | null>(null);

export function PlanFeaturesProvider({
    features,
    children,
}: {
    features: PlanFeatureMap | null;
    children: React.ReactNode;
}) {
    return <PlanFeaturesContext.Provider value={features}>{children}</PlanFeaturesContext.Provider>;
}

/** The raw map. `null` = no plan resolved; callers fall open, never closed. */
export function usePlanFeatures(): PlanFeatureMap | null {
    return useContext(PlanFeaturesContext);
}

/**
 * Whether the shop has a feature. Unresolved plan → `true`, matching
 * `routeAllowedByPlan` and `planAllows`: a billing lookup that found nothing must
 * not take away a page the shop already uses.
 */
export function useHasFeature(feature: FeatureKey): boolean {
    const features = useContext(PlanFeaturesContext);
    if (!features) return true;
    return features[feature] === true;
}
