"use client";

import useSWR from "swr";
import { type FeatureKey } from "./features";
import { apiFetch } from "./api";

type SubscriptionData = {
    subscription: any | null;
    plan: any | null;
    features: Partial<Record<FeatureKey, boolean>>;
};

export function useSubscription() {
    const { data, error, isLoading, mutate } = useSWR<SubscriptionData>(
        "/api/subscription",
        () => apiFetch("/api/subscription").then(res => res.json()),
        {
            revalidateOnFocus: false, // Don't spam the server on every tab focus
            dedupingInterval: 60000, // 1 minute deduplication
        }
    );

    const hasFeature = (key: FeatureKey): boolean => {
        if (!data?.features) return false;
        return data.features[key] === true;
    };

    return {
        subscription: data?.subscription || null,
        plan: data?.plan || null,
        features: data?.features || {},
        hasFeature,
        isLoading,
        error,
        mutate
    };
}
