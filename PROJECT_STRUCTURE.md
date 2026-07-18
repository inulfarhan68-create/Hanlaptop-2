# PROJECT_STRUCTURE.md

Struktur folder proyek **Han Laptop ERP & POS**. Dokumen ini hanya memetakan struktur — penjelasan arsitektur ada di [ARCHITECTURE.md](ARCHITECTURE.md).

> **Satu aplikasi Next.js 16 (App Router)** di direktori `backend/`, disajikan di **root** produksi (UI + API menyatu). Dulu dua-app (SPA Vite di root `src/` + Next di `/backend` basePath `/_/backend`); migrasi ke Next **selesai 2026-07-18** (`52fbc03`) — SPA Vite dihapus, basePath dicabut. Riwayat: [MIGRATION_NEXTJS.md](MIGRATION_NEXTJS.md).

---

## Root

Pasca-cutover, root **tidak lagi berisi aplikasi** — hanya:

```text
Hanlaptop-2/
├── backend/                   # ← SELURUH APLIKASI (Next.js, lihat di bawah)
├── *.md                       # Dokumen (CLAUDE.md, ARCHITECTURE.md, dll.)
├── vercel.json                # Deploy: satu service Next di root (experimentalServices)
├── data/                      # Data statis contoh
├── .github/workflows/ci.yml   # CI (satu job backend:)
└── src/                       # (kosong — sisa hapus Vite; tak ter-track, harmless)
```

## `backend/` — aplikasi Next.js (UI + API menyatu)

```text
backend/
├── src/
│   ├── middleware.ts          # Request ID, rate limit, CSRF, security headers, CSP
│   ├── instrumentation.ts     # Sentry init (Next.js instrumentation hook)
│   ├── app/
│   │   ├── (admin)/           # Shell admin (layout+sidebar). 1 subfolder = 1 halaman:
│   │   │                      #   dashboard, inventory, passports, opname, transfer,
│   │   │                      #   transactions, services, reports, piutang, hutang,
│   │   │                      #   reconciliation, crm, customers, suppliers, payroll,
│   │   │                      #   procurement, approvals, settings, audit
│   │   │                      #   (tiap folder: page.tsx [server] + <modul>-client.tsx)
│   │   ├── page.tsx, home-client.tsx    # Landing publik (root /)
│   │   ├── catalog/[slug]/, nota/[id]/, nota-servis/[id]/, login/  # Publik + login
│   │   ├── manifest.ts        # PWA manifest (native Next); service worker di public/sw.js
│   │   ├── layout.tsx, globals.css
│   │   └── api/               # REST API (App Router route handlers)
│   │       ├── accounting/    # balance-sheet, cash-flow, coa, general-ledger,
│   │       │                  #   income-statement, trial-balance, fiscal-periods,
│   │       │                  #   fixed-assets, equity-changes, journal-mapping
│   │       ├── ai/pricing/    # Estimasi harga via Gemini
│   │       ├── inventory/     # CRUD, kpi, opname, transfers, passports, qc,
│   │       │                  #   apply-markdown, markdown-recommendations, import-ai, bulk-barcode
│   │       ├── transactions/  # POS, [id], return, trade-in-buyback
│   │       ├── services/      # Service order
│   │       ├── warranty/, warranty-claims/
│   │       ├── crm/           # leads, points, reminders
│   │       ├── customers/, suppliers/, technicians/
│   │       ├── employees/     # + attendance, loans, users
│   │       ├── payrolls/, procurement/, shifts/
│   │       ├── consignment/, financials/reconciliation/
│   │       ├── reports/, dashboard/, alerts/, suggestions/, logs/
│   │       ├── stores/, settings/, user/, users/, approvals/
│   │       ├── public/        # Endpoint tanpa auth: catalog, invoice, service, buyback, booking
│   │       ├── auth/[...all]/ # Better-Auth catch-all handler
│   │       ├── cron/          # backup, cleanup (dipanggil Vercel Cron)
│   │       ├── health/        # /health, /ready, /live
│   │       ├── upload/        # Upload file ke Vercel Blob
│   │       ├── migrate-prd/, reset/, debug-db/  # Utilitas admin (HATI-HATI, lihat security)
│   │       └── ...
│   ├── components/            # Komponen UI (Client Components)
│   │   ├── ui/                # Primitives (Radix, shadcn-style)
│   │   ├── layout/            # Shell: Sidebar, MobileHeader (auth-gate)
│   │   ├── accounting/, dashboard/, inventory/, transactions/, reports/, settings/, suppliers/, customers/
│   │   ├── SessionUserProvider.tsx  # Context sesi server (pengganti useSession SSR-crash)
│   │   ├── ServiceWorkerRegister.tsx, ThemeProvider.tsx, TenantProvider.tsx, Providers.tsx
│   │   └── *.tsx              # Widget lepas (AIPricingWidget, CameraScanner, QCDetailForm, ShiftModal, dll.)
│   ├── hooks/                 # useUserRole.ts (role dari session + /api/settings)
│   ├── data/                  # Data statis contoh
│   ├── services/              # LOGIKA BISNIS (bukan di route handler)
│   │   ├── TransactionService.ts     # createTransaction (stok, jurnal, passport, poin)
│   │   ├── AccountingService.ts      # Laporan keuangan, ledger, trial balance, saldo akun
│   │   ├── InventoryService.ts       # applyMarkdown (+ jurnal penurunan nilai)
│   │   ├── JournalMappingService.ts  # accountName → accountCode
│   │   ├── PeriodClosingService.ts   # Tutup buku periode fiskal
│   │   └── AuditService.ts           # Penulisan audit log
│   ├── lib/                   # Utilitas (server + client)
│   │   ├── api.ts             # apiFetch() — WAJIB untuk semua panggilan API (client)
│   │   ├── auth-client.ts     # Better-Auth React client; broadcast.ts (sync antar-tab)
│   │   ├── utils.ts           # cn(), assetUrl(); pricingUtils.ts (buyback), print*.ts, laptopUtils.ts
│   │   ├── auth.ts            # Konfigurasi Better-Auth (server)
│   │   ├── auth-guard.ts      # requireAuth / requirePermission / requireOwner / dll.
│   │   ├── permissions.ts     # Matriks PBAC (role → permission)
│   │   ├── validators.ts      # Semua skema Zod
│   │   ├── sanitize.ts        # Strip HTML (anti-XSS, berbasis regex)
│   │   ├── rate-limiter/      # index.ts + lru-adapter.ts + types.ts (default: LRU in-memory)
│   │   ├── digital-passport.ts # Lifecycle serial number
│   │   ├── crm-helper.ts      # awardPoints (poin membership)
│   │   ├── workflow.ts        # createApprovalRequest
│   │   ├── backup-service.ts  # Backup ke S3/R2/local
│   │   ├── logger.ts (Pino), request-id.ts, sentry.ts
│   ├── db/
│   │   ├── index.ts           # Klien Drizzle tunggal (postgres-js/Supabase)
│   │   ├── schema.ts          # Barrel: re-export semua schema/* + definisi relations
│   │   ├── schema/            # Definisi tabel per modul (lihat tabel di bawah)
│   │   ├── query-helpers.ts   # withActiveTransactions dll. (helper soft-delete)
│   │   ├── seed.ts, seed-large.ts, seed-custom.ts
│   │   ├── migrate-*.ts       # Skrip migrasi one-off (tsx)
│   │   └── check-*.ts, inspect-*.ts, drop.ts, fix.ts  # Skrip diagnostik one-off
│   ├── constants/accounting.ts # ACCOUNT_CODES (kode COA)
│   └── drizzle/               # Output drizzle-kit
├── tests/
│   ├── smoke-test.js          # Smoke test HTTP (butuh server jalan)
│   └── e2e/                   # Playwright: multi-tenant.spec.ts, security.spec.ts
├── drizzle.config.ts
├── next.config.ts            # CORS headers, serverExternalPackages (tanpa basePath — root)
├── public/                    # Aset statis + PWA: sw.js, ikon, gambar (manifest via app/manifest.ts)
├── patch-kysely.cjs          # Dijalankan postinstall (backend "type":"module" → .cjs)
└── package.json              # Dependencies aplikasi
```

## Schema modul database (`backend/src/db/schema/`)

| File | Tabel utama |
| --- | --- |
| `store.ts` | `organizations`, `stores`, `userStoreAccess`, `storeSettings`, `activityLogs` |
| `users.ts` | `user`, `session`, `account`, `verification` (Better-Auth) |
| `inventory.ts` | `inventory`, `qcInspections`, `stockOpnames`, `stockOpnameItems` |
| `crm.ts` | `customers`, `suppliers`, `serviceOrders`, `buybackLeads`, `membershipPoints`, `crmReminders` |
| `hr.ts` | `employees`, `payrolls`, `attendances`, `technicians`, `technicianCommissions`, `cashierShifts`, `employeeLoans`, `purchaseRequisitions` |
| `transactions.ts` | `transactions`, `transactionItems`, `journalEntries`, `warrantyClaims`, `warrantyClaimParts`, `bankMutations`, `stockTransfers`, `stockTransferItems`, `consignmentPayables`, `devicePassports`, `deviceLifecycleLogs`, `approvalRequests`, `aiPricingLogs` |
| `accounting.ts` | `chartOfAccounts`, `fiscalPeriods`, `fixedAssets`, `depreciationEntries`, `closingEntries` |
| `refurbish.ts` | `deviceRefurbishments` |
| `audit.ts` | `auditLogs` |

## Dokumentasi (root)

| File | Isi |
| --- | --- |
| `CLAUDE.md` | Konteks permanen untuk Claude Code (ringkasan lengkap) |
| `ARCHITECTURE.md` | Arsitektur sistem, auth flow, data flow |
| `BUSINESS_RULES.md` | Aturan bisnis yang ditemukan di kode |
| `PROJECT_STRUCTURE.md` | Dokumen ini |
| `ROADMAP.md` | Rekomendasi pengembangan & tech debt |
| `PROJECT_SUMMARY.md`, `README.md`, `DEPLOYMENT.md`, `prd.md` | Dokumen lama/pendukung |
