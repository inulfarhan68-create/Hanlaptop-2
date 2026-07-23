/**
 * Module feature flags — the first-class capability layer for SaaS plans.
 *
 * Gate capabilities on `hasFeature(plan, "service")`, NEVER `plan.key === "pro"`.
 * Flags are fine-grained (one menu can split across tiers) so the value gap
 * between plans is explicit and repricing/moving a capability never ripples
 * through the codebase.
 *
 * NOTE on POS vs Servis: Starter's `pos` can charge a service fee as a line item
 * at the register; the full work-order/tracking/warranty system is `service` (Pro).
 * NOTE on accounting: the double-entry *engine* always runs (data integrity, every
 * plan). What's gated is the reports/UI — `accounting` (Pro: COA, piutang/hutang,
 * laporan keuangan) and the advanced pieces (`generalJournal`, `fixedAssets`,
 * `closingPeriod`, `bankReconciliation` — Business).
 */

/** Canonical module features, with Indonesian labels for the pricing/UI tables. */
export const FEATURES = {
    // ── Core / Operasional (Starter+) ──
    dashboard: "Dashboard",
    pos: "POS (jual + jasa, restock, pengeluaran, modal/prive)",
    shift: "Shift Kasir",
    inventory: "Inventory Dasar",
    barangJasa: "Barang & Jasa (non-stok)",
    customersSuppliers: "Customer & Supplier",
    invoice: "Invoice / Nota Digital",
    printBarcode: "Cetak Barcode",
    exportReports: "Export Laporan (Excel & PDF)",
    basicReports: "Laporan Dasar (penjualan, pembelian, stok, laba kotor)",
    // ── Pro ──
    service: "Modul Servis (work order, tracking, garansi)",
    buyback: "Buyback / Trade-In",
    bulkImport: "Import Massal",
    catalog: "Katalog Online",
    flyer: "Flyer Produk",
    markdown: "Markdown (penurunan harga)",
    devicePassport: "Device Passport",
    specSummary: "Ringkasan Spek",
    agingInventory: "Aging Inventory",
    consignment: "Konsinyasi",
    accounting: "Accounting (COA, Piutang, Hutang, Laporan Keuangan)",
    roles: "Role & Permission",
    // ── Business ──
    multiStore: "Multi Cabang",
    stockTransfer: "Transfer Stok",
    stockOpname: "Stock Opname",
    qc: "Quality Control (QC)",
    purchaseOrder: "Purchase Order",
    bankReconciliation: "Rekonsiliasi Bank",
    generalJournal: "General Journal",
    fixedAssets: "Fixed Asset & Depresiasi",
    closingPeriod: "Closing Period",
    hr: "HR & Payroll",
    technicianCommission: "Komisi Teknisi",
    auditTrail: "Audit Trail",
    approvals: "Approval Workflow",
    // ── Enterprise ──
    api: "API",
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
const CORE: FeatureKey[] = [
    "dashboard", "pos", "shift", "inventory", "barangJasa",
    "customersSuppliers", "invoice", "printBarcode", "exportReports", "basicReports",
];
const PRO_ADDS: FeatureKey[] = [
    "service", "buyback", "bulkImport", "catalog", "flyer", "markdown",
    "devicePassport", "specSummary", "agingInventory", "consignment", "accounting", "roles",
];
const BUSINESS_ADDS: FeatureKey[] = [
    "multiStore", "stockTransfer", "stockOpname", "qc", "purchaseOrder",
    "bankReconciliation", "generalJournal", "fixedAssets", "closingPeriod",
    "hr", "technicianCommission", "auditTrail", "approvals",
];
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
 * HanLaptop POS pricing — v2 (fine-grained). Tiers follow a shop's growth: Starter
 * (run the shop) → Pro (servis + katalog + buyback + akuntansi + tim) → Business
 * (multi-cabang + kontrol operasional + akuntansi lanjutan + HR) → Enterprise
 * (custom). Quotas gate on users & branches. Variable-cost features (AI, storage,
 * WA, custom domain) are sold as ADDONS, not bundled.
 */
export const PLAN_SEED: PlanSeed[] = [
    {
        key: "starter", name: "Starter", sortOrder: 1, priceMonthly: 69_000, isPublic: true,
        maxStores: 1, maxUsers: 1, maxTransactionsPerMonth: null, storageLimitMb: null,
        features: STARTER_FEATURES,
        bestFor: "Toko perorangan & UMKM.",
        description: "Menjalankan toko: POS (jual + jasa), inventory dasar, nota, laporan dasar.",
    },
    {
        key: "pro", name: "Pro", sortOrder: 2, priceMonthly: 159_000, isPublic: true,
        maxStores: 1, maxUsers: 3, maxTransactionsPerMonth: null, storageLimitMb: null,
        features: PRO_FEATURES,
        bestFor: "Toko yang mulai berkembang.",
        description: "Semua Starter + servis, katalog, buyback, akuntansi, dan tim (role & permission).",
    },
    {
        key: "business", name: "Business", sortOrder: 3, priceMonthly: 349_000, isPublic: true,
        maxStores: 3, maxUsers: 10, maxTransactionsPerMonth: null, storageLimitMb: null,
        features: BUSINESS_FEATURES,
        bestFor: "Bisnis dengan tim & banyak operasional.",
        description: "Semua Pro + multi-cabang, kontrol operasional, akuntansi lanjutan, HR & payroll.",
    },
    {
        key: "enterprise", name: "Enterprise", sortOrder: 4, priceMonthly: null, isPublic: true,
        maxStores: null, maxUsers: null, maxTransactionsPerMonth: null, storageLimitMb: null,
        features: ENTERPRISE_FEATURES,
        bestFor: "Jaringan toko / korporasi.",
        description: "Semua Business + API, white-label, dedicated support, dan integrasi custom.",
    },
    {
        key: "internal", name: "Internal", sortOrder: 99, priceMonthly: 0, isPublic: false,
        maxStores: null, maxUsers: null, maxTransactionsPerMonth: null, storageLimitMb: null,
        features: FEATURE_KEYS,
        description: "Paket internal tanpa batas untuk tenant flagship (Han Laptop).",
        bestFor: "Tenant flagship internal.",
    },
];

/** Paid add-ons (variable-cost / premium), billed separately from the base plan. */
export const ADDONS = [
    { key: "aiSpec", name: "AI Cek Spesifikasi", desc: "Isi otomatis spek lengkap hanya dari foto atau serial number laptop." },
    { key: "aiOcr", name: "AI OCR Invoice", desc: "Scan & impor nota/faktur supplier otomatis jadi data stok." },
    { key: "aiPricing", name: "AI Pricing & Buyback", desc: "Prediksi cerdas estimasi harga jual & beli berdasarkan data pasar." },
    { key: "whatsapp", name: "WhatsApp API (Verified)", desc: "Kirim nota & pengingat servis otomatis ke pelanggan." },
    { key: "customDomain", name: "Custom Domain", desc: "Katalog online & portal pelanggan menggunakan domain toko Anda." },
    { key: "storage", name: "Cloud Storage Ekstra", desc: "Kapasitas 100GB tambahan untuk foto barang, KTP, dan bukti servis." },
] as const;
