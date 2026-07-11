# PROJECT_STRUCTURE.md

Struktur folder proyek **Han Laptop ERP & POS**. Dokumen ini hanya memetakan struktur — penjelasan arsitektur ada di [ARCHITECTURE.md](ARCHITECTURE.md).

> Repo ini berisi **dua aplikasi terpisah** dalam satu direktori (bukan workspace/monorepo tooling): Frontend Vite di root, Backend Next.js di `/backend`. Masing-masing punya `package.json` dan `node_modules` sendiri, di-`npm install` terpisah.

---

## Root (Frontend — Vite + React SPA)

```text
Hanlaptop-2/
├── src/                       # Source code frontend
│   ├── App.tsx                # Entry routing (React Router v7, semua route lazy-loaded)
│   ├── main.tsx               # Entry point React
│   ├── index.css / App.css    # Global styles (Tailwind v4)
│   ├── pages/                 # 27 halaman (1 file = 1 route)
│   ├── components/            # Komponen UI
│   │   ├── ui/                # Primitives (Radix-based, shadcn-style)
│   │   ├── layout/            # Layout, Sidebar, Header (auth-gate ada di sini)
│   │   ├── accounting/        # Komponen modul akuntansi
│   │   ├── dashboard/         # Widget dashboard/KPI
│   │   ├── inventory/         # Komponen inventory
│   │   ├── transactions/      # Komponen POS/transaksi
│   │   ├── reports/           # Komponen laporan
│   │   ├── settings/          # Komponen pengaturan
│   │   ├── landing/           # Komponen landing page
│   │   └── *.tsx              # Widget lepas (AIPricingWidget, CameraScanner, QCDetailForm, dll.)
│   ├── hooks/                 # useUserRole.ts (role dari session + /api/settings)
│   ├── lib/                   # Utilitas frontend
│   │   ├── api.ts             # apiFetch() — WAJIB dipakai untuk semua panggilan API
│   │   ├── auth-client.ts     # Better-Auth React client (useSession, signIn, dll.)
│   │   ├── broadcast.ts       # BroadcastChannel sinkronisasi antar-tab
│   │   ├── types.ts           # Tipe TypeScript bersama
│   │   ├── utils.ts           # cn() dan helper umum
│   │   ├── laptopSpecsData.ts, laptopUtils.ts, technician-data.ts
│   │   └── print*.ts          # printBarcode, printThermal, printServiceLabel
│   ├── services/              # aiService.ts (klien fitur AI di sisi frontend)
│   ├── data/                  # Data statis (laptop-models, inventory-items)
│   └── assets/                # Aset statis
├── public/                    # Aset publik + PWA icons
├── dist/                      # Hasil build (generated)
├── index.html                # HTML root Vite
├── vite.config.ts            # Config Vite: proxy /api → :3000/_/backend, PWA, manual chunks
├── tailwind.config.js, postcss.config.js
├── eslint.config.js
├── tsconfig*.json            # tsconfig.json / .app.json / .node.json
├── vercel.json               # Konfigurasi deploy dua service (frontend + backend)
└── package.json              # Dependencies frontend
```

## `/backend` (Next.js API + Database)

```text
backend/
├── src/
│   ├── middleware.ts          # Request ID, rate limit, CSRF, security headers, CSP
│   ├── instrumentation.ts     # Sentry init (Next.js instrumentation hook)
│   ├── app/
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
│   ├── services/              # LOGIKA BISNIS (bukan di route handler)
│   │   ├── TransactionService.ts     # createTransaction (stok, jurnal, passport, poin)
│   │   ├── AccountingService.ts      # Laporan keuangan, ledger, trial balance, saldo akun
│   │   ├── InventoryService.ts       # applyMarkdown (+ jurnal penurunan nilai)
│   │   ├── JournalMappingService.ts  # accountName → accountCode
│   │   ├── PeriodClosingService.ts   # Tutup buku periode fiskal
│   │   └── AuditService.ts           # Penulisan audit log
│   ├── lib/                   # Utilitas backend
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
├── next.config.ts            # basePath /_/backend, CORS headers, serverExternalPackages
├── patch-kysely.js           # Dijalankan postinstall
├── local.db / sqlite.db      # File SQLite dev (ter-commit)
├── vercel.json
└── package.json              # Dependencies backend
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
