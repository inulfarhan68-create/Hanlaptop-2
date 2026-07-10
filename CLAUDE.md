# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Konteks permanen untuk semua sesi Claude Code. Dokumen pendukung: [ARCHITECTURE.md](ARCHITECTURE.md), [BUSINESS_RULES.md](BUSINESS_RULES.md), [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md), [ROADMAP.md](ROADMAP.md).

---

## 1. Ringkasan & Tujuan Proyek

**Han Laptop ERP & POS** — aplikasi internal back-office + Point of Sale untuk bisnis **Han Laptop** (jual-beli laptop bekas, sparepart, jasa servis, tukar tambah/buyback). Menggabungkan manajemen stok fisik dengan pembukuan akuntansi berpasangan (*double-entry*), lengkap dengan HR, CRM, dan multi-cabang.

- **Bahasa UI & domain:** Indonesia (identifier kode: Inggris).
- **Pengguna:** owner, manager, kasir, teknisi, investor (multi-toko, akses berbasis peran).

---

## 2. Struktur Repo (dua aplikasi, satu direktori)

Ini **bukan** monorepo workspace — dua app terpisah dengan `package.json`/`node_modules` masing-masing:

| | Frontend | Backend |
| --- | --- | --- |
| Lokasi | root (`src/`) | `/backend` |
| Framework | React 19 + Vite 8 SPA | Next.js 16 (App Router) |
| Port dev | 5173 | 3000 |

### ⚠️ basePath `/_/backend` (paling mudah bikin bingung)
Backend Next.js disajikan di **basePath `/_/backend`**, bukan root.
- Dev: Vite mem-proxy `/api/*` → `http://localhost:3000/_/backend/api/*` (`vite.config.ts`).
- Prod (Vercel): frontend di `/`, backend di `/_/backend`, dengan rewrite `/api/:match*` → `/_/backend/api/:match*` (`vercel.json`).
- Health check / smoke test harus menyertakan prefix ini.

Struktur folder lengkap → [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md).

---

## 3. Tech Stack

**Frontend:** React 19, Vite 8, TypeScript 6, React Router v7 (route lazy di `src/App.tsx`), Tailwind CSS v4 + Radix UI (pola shadcn), SWR (data fetching), Recharts, Lucide, `jspdf`, `xlsx`, `framer-motion`, `sonner`, `better-auth/react` (client), `vite-plugin-pwa`.

**Backend:** Next.js 16 (App Router), Drizzle ORM + `@libsql/client` (Turso/SQLite), Kysely (via Better-Auth), Better-Auth (email+password), Zod (validasi), `@google/genai` (Gemini `gemini-2.5-flash`), Vercel Blob (upload), Pino (log), Sentry, Upstash Redis/Ratelimit (dependency; **rate limiter aktif masih LRU in-memory**).

**Database:** SQLite lokal saat dev, Turso (libSQL) di produksi. Skema Drizzle di `backend/src/db/schema/`.

**Deployment:** Vercel (dual-service frontend+backend, region `hnd1`), Vercel Cron untuk backup/cleanup.

---

## 4. Cara Menjalankan

Install terpisah di root dan `/backend`.

### Frontend (root)
```bash
npm install
npm run dev       # Vite dev server, port 5173
npm run build     # tsc -b && vite build
npm run lint      # eslint
npm run preview
```

### Backend (`cd backend`)
```bash
npm install       # menjalankan postinstall: node patch-kysely.js
npm run dev       # next dev, port 3000 (basePath /_/backend)
npm run build     # next build
npm run start
npm run lint      # next lint
npm run seed      # tsx src/db/seed.ts (seed data contoh)
```

### Database (di `/backend`)
```bash
npx drizzle-kit push          # sinkron skema ke DB (edit backend/src/db/schema/ dulu)
npx tsx src/db/check-db.ts    # inspeksi kolom/isi DB lokal
# skrip one-off lain: npx tsx src/db/migrate-*.ts  (lihat ROADMAP: perlu dirapikan)
```

### Test (di `/backend`, butuh server jalan)
```bash
node tests/smoke-test.js --prefix=/_/backend/api   # smoke HTTP; flags: --verbose --skip=e2e --port= --base=
npx playwright test tests/e2e                       # semua e2e
npx playwright test tests/e2e/multi-tenant.spec.ts  # satu file (isolasi tenant)
```
> Belum ada `format` khusus (mengandalkan ESLint) dan belum ada pipeline CI.

---

## 5. Environment Variables (nama saja)

> Isi/value TIDAK ditampilkan. Set di `.env.local` (dev) / Vercel (prod).

**Database:** `DATABASE_URL`, `DATABASE_AUTH_TOKEN` — dipakai `db/index.ts`. `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` — dipakai sebagian skrip/health (⚠️ konvensi ganda, perlu distandarkan).

**Auth:** `BETTER_AUTH_SECRET` (wajib di runtime produksi), `BETTER_AUTH_URL`, `FRONTEND_URL`, `VERCEL_URL`.

**AI:** `GEMINI_API_KEY`.

**Frontend:** `VITE_API_URL`.

**Upload/Storage:** `BLOB_READ_WRITE_TOKEN`, `BLOB_STORE_ID`, `BLOB_WEBHOOK_PUBLIC_KEY`.

**Backup:** `BACKUP_STORAGE`, `BACKUP_LOCAL_PATH`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_BUCKET`.

**Rate limit / cache:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

**Observability:** `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `LOG_LEVEL`.

**Ops/flags:** `CRON_SECRET`, `ENABLE_FACTORY_RESET`, `ADMIN_DEFAULT_EMAIL`, `ADMIN_DEFAULT_PASSWORD`, `NODE_ENV`, `GIT_SHA`/`VERCEL_GIT_COMMIT_SHA`, `VERCEL`, `NEXT_PHASE`.

---

## 6. Coding Convention (ikuti pola yang sudah ada)

- **TypeScript** di seluruh kode; hindari `any` (walau kode lama masih ada `any`/`as any` — jangan menirunya).
- **Route handler backend** selalu:
  1. `export const dynamic = 'force-dynamic'`,
  2. panggil guard: `const authResult = await requirePermission(...)` lalu `if (authResult instanceof NextResponse) return authResult;`,
  3. validasi body dengan Zod `safeParse` (skema di `lib/validators.ts`),
  4. filter query dengan `authResult.storeId` (kecuali `"all"`),
  5. delegasikan logika lintas-entitas ke `services/` dalam `db.transaction()`.
- **Logika bisnis** di `backend/src/services/`, **bukan** di route handler.
- **Jurnal akuntansi** dibuat via nama akun standar; `accountCode` dipetakan otomatis oleh `JournalMappingService` — jangan hard-code kode akun.
- **Frontend:** panggil API hanya lewat `apiFetch` (`src/lib/api.ts`), jangan `fetch` mentah. Tambah halaman baru sebagai lazy import + `<Route>` di `src/App.tsx`. Pakai komponen `src/components/ui/`, ikon Lucide, kelas Tailwind.
- **Error handling:** kembalikan `NextResponse.json({ error }, { status })` dengan pesan jelas; validasi gagal → 400 dengan `error.format()`.
- **Audit:** aksi kritikal menulis ke `auditLogs`/`activityLogs`.
- **Naming:** tabel & kolom `camelCase` di Drizzle (mapping ke `snake_case` DB); komponen React `PascalCase`; file util `camelCase`.

---

## 7. Business Modules

| Modul | File utama | Kelengkapan |
| --- | --- | --- |
| Dashboard & KPI | `src/pages/Dashboard.tsx`, `api/dashboard`, `api/inventory/kpi` | ✅ |
| Inventory (stok, kondisi, konsinyasi) | `src/pages/Inventory.tsx`, `api/inventory/*`, `services/InventoryService` | ✅ |
| Digital Passport (Serial Number) | `src/pages/DigitalPassport.tsx`, `lib/digital-passport.ts`, `api/inventory/passports/*` | ✅ |
| QC & Stock Opname | `api/inventory/[id]/qc`, `api/inventory/opname/*`, `QCDetailForm.tsx` | ✅ |
| Stock Transfer antar cabang | `src/pages/StockTransfer.tsx`, `api/inventory/transfers/*` | ✅ (pakai approval) |
| Transaksi / POS | `src/pages/Transactions.tsx`, `api/transactions/*`, `services/TransactionService` | ✅ (inti) |
| Retur & Tukar Tambah/Buyback | `api/transactions/[id]/return`, `api/transactions/trade-in-buyback` | ✅ |
| Service Order | `src/pages/Services.tsx`, `api/services/*` | ✅ |
| Warranty | `api/warranty/*`, `api/warranty-claims/*` | ✅ |
| Accounting (COA, ledger, laporan) | `src/pages/Reports.tsx`, `api/accounting/*`, `services/AccountingService`, `PeriodClosingService` | ✅ |
| Piutang / Hutang | `src/pages/Piutang.tsx`, `Hutang.tsx`, `api/consignment/*` | ✅ |
| Reconciliation (bank) | `src/pages/Reconciliation.tsx`, `api/financials/reconciliation/*` | ✅ |
| CRM (customer, poin, reminder, lead) | `src/pages/CrmManagement.tsx`, `api/crm/*`, `api/customers/*` | ✅ |
| Supplier | `src/pages/Suppliers.tsx`, `api/suppliers/*` | ✅ |
| HR (karyawan, payroll, absensi, kasbon, komisi) | `src/pages/Payroll.tsx`, `api/employees/*`, `api/payrolls/*`, `api/technicians/*` | ✅ |
| Procurement (requisition) | `src/pages/Procurement.tsx`, `api/procurement/*` | ✅ |
| Approvals workflow | `src/pages/Approvals.tsx`, `api/approvals/*`, `lib/workflow.ts` | ✅ |
| Shift Kasir | `ShiftModal.tsx`, `api/shifts/*` | ✅ |
| User & Store Management | `src/pages/Settings.tsx`, `api/users/*`, `api/stores/*` | ✅ (owner) |
| Audit Logs | `src/pages/AuditLogs.tsx`, `api/logs/*` | ✅ |
| Settings | `src/pages/Settings.tsx`, `api/settings/*` | ✅ |
| AI Features (import nota, pricing, buyback) | `AIPricingWidget.tsx`, `api/inventory/import-ai`, `api/ai/pricing`, `api/public/buyback/estimate` | ✅ |
| Public (katalog, nota, booking servis) | `src/pages/Public*.tsx`, `api/public/*` | ✅ (tanpa auth) |

Detail keterhubungan antar modul → [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 8. Business Rules (ringkas)

Rincian lengkap di [BUSINESS_RULES.md](BUSINESS_RULES.md). Yang paling penting:

- **Penjualan** mengurangi stok (aman-konkuren), membuat jurnal double-entry (Penjualan/HPP/Persediaan/Kas/Piutang), memproses SN → passport `SOLD`, dan menangani konsinyasi — semuanya atomik.
- **Item `IN_INSPECTION` tidak boleh dijual.** Item `tracksSerialNumber` wajib jumlah SN = kuantitas.
- **Pembelian Stok** memakai **HPP rata-rata bergerak** (moving weighted average).
- **HPP** = `costPrice × quantity`.
- **DP/Piutang:** `paymentStatus === "Belum Lunas"` → sisa jadi Piutang Usaha.
- **Invoice** `INV/YYYY/MM/XXX`, sekuensial per store per bulan.
- **Kasir** wajib buka **shift** dulu (bila `enableCashierShift`) & harus pilih store spesifik (bukan `"all"`).
- **Markdown** harga turun membuat jurnal "Beban Penurunan Nilai Persediaan".
- **Passport lifecycle:** PROCURED → INBOUND_QC → READY_FOR_SALE → RESERVED → SOLD / UNDER_SERVICE / TRADED_IN / WRITTEN_OFF.
- **Import nota AI** menyarankan harga jual = `costPrice × 1.25` (markup 25%).

---

## 9. Hal Penting yang WAJIB Diketahui Sebelum Mengubah Kode

1. **basePath `/_/backend`** — jangan asumsikan backend di root. Frontend memanggil `/api`, Vite/Vercel yang me-rewrite.
2. **Pola guard route:** guard mengembalikan `NextResponse` (error) **atau** hasil auth — selalu narrow dengan `instanceof NextResponse` sebelum memakai hasilnya.
3. **Selalu filter `storeId`** pada query data milik store (isolasi tenant/IDOR). Ada e2e test yang menjaga ini — jangan sampai bocor antar-store.
4. **ACID:** operasi yang menyentuh inventory **dan** accounting harus dalam satu `db.transaction()`. Logika ini hidup di `services/`, bukan di handler.
5. **Jurnal via nama akun standar** (dipetakan `JournalMappingService`), jangan tulis kode akun manual.
6. **Frontend pakai `apiFetch`** (bukan `fetch`) agar `x-store-id` + cookie ikut; mutasi menyiarkan event cross-tab (SWR revalidate).
7. **Ubah skema DB:** edit `backend/src/db/schema/*` dulu, lalu `npx drizzle-kit push`. Import tabel dari `@/db/schema` (barrel + relations).
8. **Konvensi env DB ganda** (`DATABASE_URL` vs `TURSO_DATABASE_URL`) — hati-hati saat menyentuh koneksi DB (lihat ROADMAP, item Critical).
9. **Rate limiter default LRU in-memory** — jangan andalkan untuk proteksi produksi lintas instance (lihat ROADMAP).
10. **Route sensitif** (`reset`, `migrate-prd`) butuh `requireOwnerOnly` + flag env; cron butuh `CRON_SECRET`. Jangan longgarkan.
11. **Field masking:** kasir tidak boleh melihat `costPrice` — pertahankan saat menambah endpoint yang mengembalikan data inventory.
12. Banyak **skrip one-off** di `backend/` & `backend/src/db/` dan **DB SQLite ter-commit** — jangan jadikan acuan; lihat ROADMAP untuk rencana pembersihan.

---

## 10. Referensi Dokumen
- [ARCHITECTURE.md](ARCHITECTURE.md) — arsitektur, auth/authz, integrasi.
- [BUSINESS_RULES.md](BUSINESS_RULES.md) — aturan bisnis dari kode.
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) — peta folder & schema.
- [ROADMAP.md](ROADMAP.md) — security/performance review, technical debt, skor SaaS.
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md), [README.md](README.md), [DEPLOYMENT.md](DEPLOYMENT.md), [prd.md](prd.md) — dokumen lama/pendukung (sebagian nama env sudah stale).
