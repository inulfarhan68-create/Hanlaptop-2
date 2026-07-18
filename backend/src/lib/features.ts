/**
 * Module feature flags — the first-class capability layer for SaaS plans.
 *
 * Gate capabilities on `hasFeature(plan, "service")`, NEVER `plan.key === "pro"`.
 * Plans map to a set of module flags, so renaming/repricing a tier — or moving a
 * capability between tiers — never ripples through the codebase.
 *
 * NOTE on accounting: the double-entry *journal engine* always runs (it is core
 * data integrity, on every plan incl. Starter). What the `accountingReports` flag
 * gates is the reports/COA *UI* (Jurnal Umum, Piutang/Hutang, Laba-Rugi, Neraca,
 * Arus Kas) — matching "Starter = jurnal otomatis di belakang layar; Pro = laporan
 * keuangan lengkap".
 */

/** Canonical module features, with Indonesian labels for the pricing/UI tables. */
export const FEATURES = {
    // Core operations (every paid plan)
    pos: "POS Penjualan",
    inventory: "Inventory",
    purchasing: "Pembelian",
    customersSuppliers: "Customer & Supplier",
    buyback: "Buyback / Trade-In",
    shift: "Shift Kasir",
    catalog: "Katalog Online",
    // Pro
    service: "Servis (Work Order, Tracking, Garansi, Device Passport)",
    accountingReports: "Laporan Keuangan (COA, Jurnal, L/R, Neraca, Arus Kas)",
    roles: "Role & Permission",
    // Business
    multiStore: "Multi Cabang (transfer, konsolidasi)",
    stockOpname: "Stock Opname",
    qc: "Quality Control",
    procurement: "Purchase Order",
    auditTrail: "Audit Trail",
    approvals: "Approval Workflow",
    hr: "HR (karyawan, komisi teknisi)",
    // Enterprise
    api: "API Integration",
    whiteLabel: "White Label",
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

// ── Cumulative feature sets per tier (each builds on the previous) ──────────────
const CORE: FeatureKey[] = ["pos", "inventory", "purchasing", "customersSuppliers", "buyback", "shift", "catalog"];
const PRO_ADDS: FeatureKey[] = ["service", "accountingReports", "roles"];
const BUSINESS_ADDS: FeatureKey[] = ["multiStore", "stockOpname", "qc", "procurement", "auditTrail", "approvals", "hr"];
const ENTERPRISE_ADDS: FeatureKey[] = ["api", "whiteLabel"];

const STARTER_FEATURES = CORE;
const PRO_FEATURES = [...CORE, ...PRO_ADDS];
const BUSINESS_FEATURES = [...PRO_FEATURES, ...BUSINESS_ADDS];
const ENTERPRISE_FEATURES = [...BUSINESS_FEATURES, ...ENTERPRISE_ADDS];

/** Shape of a seed plan (source of truth for `db/seed-plans.ts`). null = unlimited/custom. */
export interface PlanSeed {
    key: string;
    name: string;
    description: string;
    bestFor: string;            // "Cocok untuk …" shown on the pricing card
    sortOrder: number;
    priceMonthly: number | null; // IDR/month; null = custom ("Hubungi kami")
    isPublic: boolean;
    maxStores: number | null;    // null = unlimited
    maxUsers: number | null;     // null = unlimited
    maxTransactionsPerMonth: number | null;
    storageLimitMb: number | null;
    features: readonly FeatureKey[];
}

/**
 * HanLaptop POS pricing — final v1. Tiers follow a shop's growth: Starter (run the
 * shop) → Pro (servis + full books + team) → Business (multi-cabang + controls) →
 * Enterprise (integration + custom). Quotas gate on users & branches, not tx count.
 */
export const PLAN_SEED: PlanSeed[] = [
    {
        key: "starter", name: "Starter", sortOrder: 1, priceMonthly: 69_000, isPublic: true,
        maxStores: 1, maxUsers: 1, maxTransactionsPerMonth: null, storageLimitMb: null,
        features: STARTER_FEATURES,
        bestFor: "Toko perorangan yang fokus jual-beli, belum ada alur servis kompleks.",
        description: "Jalankan toko Anda — POS, stok, pembelian, buyback, dan nota digital.",
    },
    {
        key: "pro", name: "Pro", sortOrder: 2, priceMonthly: 159_000, isPublic: true,
        maxStores: 1, maxUsers: 3, maxTransactionsPerMonth: null, storageLimitMb: null,
        features: PRO_FEATURES,
        bestFor: "Toko yang mulai menerima servis, punya kasir & teknisi, butuh laporan keuangan.",
        description: "Semua Starter + modul Servis, akuntansi lengkap, dan kolaborasi tim.",
    },
    {
        key: "business", name: "Business", sortOrder: 3, priceMonthly: 349_000, isPublic: true,
        maxStores: 3, maxUsers: 10, maxTransactionsPerMonth: null, storageLimitMb: null,
        features: BUSINESS_FEATURES,
        bestFor: "Toko dengan beberapa cabang, tim lebih besar, butuh kontrol operasional.",
        description: "Semua Pro + multi-cabang, stock opname/QC, procurement, audit & approval, HR.",
    },
    {
        key: "enterprise", name: "Enterprise", sortOrder: 4, priceMonthly: null, isPublic: true,
        maxStores: null, maxUsers: null, maxTransactionsPerMonth: null, storageLimitMb: null,
        features: ENTERPRISE_FEATURES,
        bestFor: "Perusahaan atau jaringan toko yang butuh integrasi & kustomisasi.",
        description: "Semua Business + API, white-label, import data, training, priority support & SLA.",
    },
    {
        key: "internal", name: "Internal", sortOrder: 99, priceMonthly: 0, isPublic: false,
        maxStores: null, maxUsers: null, maxTransactionsPerMonth: null, storageLimitMb: null,
        features: FEATURE_KEYS,
        description: "Paket internal tanpa batas untuk tenant flagship (Han Laptop).",
        bestFor: "Tenant flagship internal.",
    },
];
