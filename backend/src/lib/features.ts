/**
 * Module feature flags — the first-class capability layer for SaaS plans.
 *
 * Gate capabilities on `hasFeature(plan, "payroll")`, NEVER `plan.key === "business"`.
 * Plans map to a set of module flags, so renaming/repricing a tier — or moving a
 * module between tiers — never ripples through the codebase.
 */

/** Canonical module features, with Indonesian labels for the pricing/UI tables. */
export const FEATURES = {
    inventory: "Inventory & stok",
    pos: "Transaksi / POS",
    services: "Servis",
    accounting: "Akuntansi & laporan",
    crm: "CRM & pelanggan",
    payroll: "HR & Payroll",
    procurement: "Procurement",
    multiStore: "Multi-cabang",
    aiPricing: "Fitur AI",
} as const;

export type FeatureKey = keyof typeof FEATURES;
export const FEATURE_KEYS = Object.keys(FEATURES) as FeatureKey[];

type FeatureMap = Partial<Record<FeatureKey, boolean>>;
/** Anything we can read features from: a plan row, its raw JSON string, or a map. */
type PlanLike = { features?: string | null } | string | FeatureMap | null | undefined;

/** Parse a plan's `features` (JSON text) — or a raw map/string — into a feature map. */
export function parseFeatures(plan: PlanLike): FeatureMap {
    if (!plan) return {};
    let raw: unknown = plan;
    if (typeof plan === "object" && "features" in plan) raw = (plan as { features?: string | null }).features;
    if (typeof raw === "string") {
        try { raw = JSON.parse(raw || "{}"); } catch { return {}; }
    }
    return raw && typeof raw === "object" ? (raw as FeatureMap) : {};
}

/** Whether a plan grants a module feature. A missing key is treated as `false`. */
export function hasFeature(plan: PlanLike, key: FeatureKey): boolean {
    return parseFeatures(plan)[key] === true;
}

/** Expand a subset of enabled keys into a full map (every key present) — for seeds/storage. */
export function buildFeatures(enabled: readonly FeatureKey[]): Record<FeatureKey, boolean> {
    return FEATURE_KEYS.reduce((acc, k) => {
        acc[k] = enabled.includes(k);
        return acc;
    }, {} as Record<FeatureKey, boolean>);
}

/** Shape of a seed plan (source of truth for `db/seed-plans.ts`). Quotas: null = unlimited. */
export interface PlanSeed {
    key: string;
    name: string;
    description: string;
    sortOrder: number;
    priceMonthly: number;      // IDR/month; placeholder — editable later via super-admin
    isPublic: boolean;
    maxStores: number | null;
    maxUsers: number | null;
    maxTransactionsPerMonth: number | null;
    storageLimitMb: number | null;
    features: readonly FeatureKey[];
}

/**
 * Default plan matrix. Feature inclusion follows the intended tiers:
 * Starter = core selling (inventory/POS/servis/AI); Business = + full books, CRM,
 * HR, procurement; Growth = everything incl. multi-cabang; internal = unlimited,
 * not shown publicly (Han Laptop flagship). Prices are placeholders in IDR.
 */
export const PLAN_SEED: PlanSeed[] = [
    {
        key: "starter", name: "Starter", sortOrder: 1, priceMonthly: 99_000, isPublic: true,
        maxStores: 1, maxUsers: 3, maxTransactionsPerMonth: 500, storageLimitMb: 500,
        features: ["inventory", "pos", "services", "aiPricing"],
        description: "Untuk toko kecil yang baru mulai — jual, servis, dan stok.",
    },
    {
        key: "business", name: "Business", sortOrder: 2, priceMonthly: 249_000, isPublic: true,
        maxStores: 2, maxUsers: 10, maxTransactionsPerMonth: 5_000, storageLimitMb: 5_000,
        features: ["inventory", "pos", "services", "accounting", "crm", "payroll", "procurement", "aiPricing"],
        description: "Pembukuan lengkap + CRM + HR untuk toko yang berkembang.",
    },
    {
        key: "growth", name: "Growth", sortOrder: 3, priceMonthly: 499_000, isPublic: true,
        maxStores: 10, maxUsers: null, maxTransactionsPerMonth: null, storageLimitMb: 50_000,
        features: FEATURE_KEYS,
        description: "Multi-cabang + kuota besar untuk bisnis yang menskala.",
    },
    {
        key: "internal", name: "Internal", sortOrder: 99, priceMonthly: 0, isPublic: false,
        maxStores: null, maxUsers: null, maxTransactionsPerMonth: null, storageLimitMb: null,
        features: FEATURE_KEYS,
        description: "Paket internal tanpa batas untuk tenant flagship (Han Laptop).",
    },
];
