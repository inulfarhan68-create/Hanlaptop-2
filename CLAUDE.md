# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Konteks permanen untuk semua sesi Claude Code. Dokumen pendukung: [ARCHITECTURE.md](ARCHITECTURE.md), [BUSINESS_RULES.md](BUSINESS_RULES.md), [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md), [ROADMAP.md](ROADMAP.md).

---

## 1. Ringkasan & Tujuan Proyek

**Han Laptop ERP & POS** — aplikasi internal back-office + Point of Sale untuk bisnis **Han Laptop** (jual-beli laptop bekas, sparepart, jasa servis, tukar tambah/buyback). Menggabungkan manajemen stok fisik dengan pembukuan akuntansi berpasangan (*double-entry*), lengkap dengan HR, CRM, dan multi-cabang.

- **Bahasa UI & domain:** Indonesia (identifier kode: Inggris).
- **Pengguna:** owner, manager, kasir, teknisi, investor (multi-toko, akses berbasis peran).

---

## 2. Struktur Repo (satu app Next.js di `backend/`)

**Satu aplikasi Next.js 16 (App Router)** di direktori **`backend/`**, disajikan di **root** produksi. UI (Server/Client Components) dan API menyatu dalam satu app.

| | Next app |
| --- | --- |
| Lokasi | `backend/` (kode di `backend/src/`) |
| Framework | Next.js 16 (App Router) + React 19 |
| Port dev | 3000 (`http://localhost:3000`) |
| URL prod | root `/` (`hanlaptop-front.vercel.app`) |

- Halaman di `backend/src/app/`, route API di `backend/src/app/api/`. Semua **root-relative** — tak ada proxy/rewrite/basePath.
- ⚠️ **Riwayat:** dulu repo dua-app (SPA Vite di root `src/` + Next di `/backend` dengan basePath `/_/backend`). Migrasi ke Next **selesai 2026-07-18** (commit `52fbc03`): SPA Vite dihapus, basePath `/_/backend` dicabut (path lama itu sekarang 404). Riwayat/rencana lama: [MIGRATION_NEXTJS.md](MIGRATION_NEXTJS.md).
- ⚠️ Folder `src/` **kosong** bisa tertinggal di root working tree (efek Windows/OneDrive) — abaikan, bukan bagian app & tak ter-track git.

Struktur folder lengkap → [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md).

---

## 3. Tech Stack

Satu app Next.js 16 (App Router) — UI + API menyatu.

**UI (Client Components):** React 19, TypeScript 6, Tailwind CSS v4 + Radix UI (pola shadcn, komponen di `backend/src/components/ui/`), SWR (data fetching lewat `apiFetch`), Recharts, Lucide, `jspdf`, `xlsx`, `framer-motion`, `sonner`, `better-auth/react` (client). **PWA:** `app/manifest.ts` (manifest native) + service worker tulis-tangan `public/sw.js`, diregistrasi oleh `ServiceWorkerRegister` (produksi saja).

**Server / API:** Next.js 16 route handlers, Drizzle ORM + `postgres` (postgres-js, Supabase/Postgres), Kysely (via Better-Auth), Better-Auth (email+password), Zod (validasi), `@google/genai` (Gemini `gemini-2.5-flash`), Vercel Blob (upload), Pino (log), Sentry, Upstash Redis/Ratelimit (dependency; **rate limiter aktif masih LRU in-memory**).

**Database:** PostgreSQL (Supabase) untuk dev & produksi. Skema Drizzle di `backend/src/db/schema/`.

**Deployment:** Vercel (satu service Next di root, region `hnd1`; `vercel.json` → `experimentalServices.backend` `routePrefix "/"`), Vercel Cron untuk backup/cleanup.

---

## 4. Cara Menjalankan

Semua perintah di **`backend/`** (satu app). Tak ada lagi install/run terpisah di root.

### Dev & build (`cd backend`)
```bash
npm install       # menjalankan postinstall: node patch-kysely.cjs
npm run dev       # next dev, app di root → http://localhost:3000
npm run build     # next build
npm run start
npm run lint      # next lint
npm run seed      # tsx src/db/seed.ts (seed data contoh)
```

### Database (di `/backend`) — workflow migrasi berversi
Alur standar (produksi & shared DB): edit `src/db/schema/*` → generate migrasi → apply.
```bash
npm run db:generate   # buat file migrasi SQL dari perubahan schema (commit file-nya)
npm run db:migrate    # apply migrasi pending ke DB (pakai DIRECT_URL, tracking di schema `drizzle`)
```
> ⚠️ **Jangan `db:push` ke DB produksi/shared.** `push` = diff destruktif tanpa riwayat/rollback. `push` hanya untuk **DB throwaway lokal** (mis. harness integration test lewat `drizzle.config.test.ts`). DB produksi sudah di-baseline ke workflow `migrate` (migrasi `0000` tercatat sebagai applied di `drizzle.__drizzle_migrations`).

### Seed & Test (di `/backend`)
```bash
npm run seed             # data contoh (tsx src/db/seed.ts)
npm test                 # unit test (Vitest)
npm run test:integration # integration test (butuh Postgres; CI pakai service container)
node tests/smoke-test.js --prefix=/api   # smoke HTTP (butuh server jalan)
npx playwright test tests/e2e            # e2e (butuh server jalan)
```
> CI (`.github/workflows/ci.yml`) menjalankan tsc + build + unit + integration test di tiap PR/push ke `main` (satu job `backend:`, `working-directory: backend`, dengan service Postgres).

---

## 5. Environment Variables (nama saja)

> Isi/value TIDAK ditampilkan. Set di `.env.local` (dev) / Vercel (prod).

**Database:** `DATABASE_URL` (Supabase pooler, port 6543) — dipakai `db/index.ts`. `DIRECT_URL` (Supabase direct, port 5432) — dipakai `db:migrate`/`db:push` (drizzle-kit).

**Auth:** `BETTER_AUTH_SECRET` (wajib di runtime produksi), `BETTER_AUTH_URL`, `FRONTEND_URL` (CORS + trustedOrigins), `VERCEL_URL`, `VERCEL_BRANCH_URL` (dua terakhir masuk trustedOrigins agar login preview tak "403 Invalid origin" — lihat `lib/auth.ts`).

**AI:** `GEMINI_API_KEY`.

**Upload/Storage:** `BLOB_READ_WRITE_TOKEN`, `BLOB_STORE_ID`, `BLOB_WEBHOOK_PUBLIC_KEY`.

**Backup:** `BACKUP_STORAGE`, `BACKUP_LOCAL_PATH`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_BUCKET`.

**Rate limit / cache:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

**Observability:** `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `LOG_LEVEL`.

**Ops/flags:** `CRON_SECRET`, `ENABLE_FACTORY_RESET`, `ADMIN_DEFAULT_EMAIL`, `ADMIN_DEFAULT_PASSWORD`, `NODE_ENV`, `GIT_SHA`/`VERCEL_GIT_COMMIT_SHA`, `VERCEL`, `NEXT_PHASE`.

**SaaS / billing / demo:** `BILLING_WEBHOOK_SECRET` (gate `api/webhooks/billing`), `DEFAULT_ORGANIZATION_ID` (flagship tenant id for `migrate-tenancy`, fallback `org-default`), `PLATFORM_ADMIN_EMAIL` (designate the platform operator in `migrate-tenancy`), `DEMO_LOGIN_EMAIL` + `DEMO_LOGIN_PASSWORD` (read-only demo account for `api/demo/login` — must match `seed-demo-tenant`), `DEMO_ORGANIZATION_ID`/`DEMO_STORE_ID` (demo tenant ids, fallback `org-demo`/`store-demo`).

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
- **UI (Client Component):** panggil API hanya lewat `apiFetch` (`backend/src/lib/api.ts`), jangan `fetch` mentah; aset statis lewat `assetUrl()` (`lib/utils.ts`). Halaman admin baru = `app/(admin)/<modul>/page.tsx` (Server Component: metadata + gate `getSession()` yang di-`cache()`) + `<modul>-client.tsx` (`"use client"`). Pakai `useSessionUser()` (**bukan** `useSession()` — crash SSR) untuk sesi di komponen shell. Pakai komponen `backend/src/components/ui/`, ikon Lucide, kelas Tailwind.
- **Error handling:** kembalikan `NextResponse.json({ error }, { status })` dengan pesan jelas; validasi gagal → 400 dengan `error.format()`.
- **Audit:** aksi kritikal menulis ke `auditLogs`/`activityLogs`.
- **Naming:** tabel & kolom `camelCase` di Drizzle (mapping ke `snake_case` DB); komponen React `PascalCase`; file util `camelCase`.

---

## 7. Business Modules

> Path di kolom bawah relatif ke **`backend/src/`**. Halaman admin = grup route `app/(admin)/<modul>/` (`page.tsx` Server Component + `<modul>-client.tsx`); route API di `app/api/*`; logika di `services/`, helper di `lib/`.

| Modul | File utama | Kelengkapan |
| --- | --- | --- |
| Dashboard & KPI | `app/(admin)/dashboard/`, `api/dashboard`, `api/inventory/kpi` | ✅ |
| Inventory (stok, kondisi, konsinyasi) | `app/(admin)/inventory/`, `api/inventory/*`, `services/InventoryService` | ✅ |
| Digital Passport (Serial Number) | `app/(admin)/passports/`, `lib/digital-passport.ts`, `api/inventory/passports/*` | ✅ |
| QC & Stock Opname | `app/(admin)/opname/`, `api/inventory/[id]/qc`, `api/inventory/opname/*`, `QCDetailForm.tsx` | ✅ |
| Stock Transfer antar cabang | `app/(admin)/transfer/`, `api/inventory/transfers/*` | ✅ (pakai approval) |
| Transaksi / POS | `app/(admin)/transactions/`, `api/transactions/*`, `services/TransactionService` | ✅ (inti) |
| Retur & Tukar Tambah/Buyback | `api/transactions/[id]/return`, `api/transactions/trade-in-buyback` | ✅ |
| Service Order | `app/(admin)/services/`, `api/services/*` | ✅ |
| Warranty | `api/warranty/*`, `api/warranty-claims/*` | ✅ |
| Accounting (COA, ledger, laporan) | `app/(admin)/reports/`, `api/accounting/*`, `services/AccountingService`, `PeriodClosingService` | ✅ |
| Piutang / Hutang | `app/(admin)/piutang/`, `app/(admin)/hutang/`, `api/consignment/*` | ✅ |
| Reconciliation (bank) | `app/(admin)/reconciliation/`, `api/financials/reconciliation/*` | ✅ |
| CRM (customer, poin, reminder, lead) | `app/(admin)/crm/`, `app/(admin)/customers/`, `api/crm/*`, `api/customers/*` | ✅ |
| Supplier | `app/(admin)/suppliers/`, `api/suppliers/*` | ✅ |
| HR (karyawan, payroll, absensi, kasbon, komisi) | `app/(admin)/payroll/`, `api/employees/*`, `api/payrolls/*`, `api/technicians/*` | ✅ |
| Procurement (requisition) | `app/(admin)/procurement/`, `api/procurement/*` | ✅ |
| Approvals workflow | `app/(admin)/approvals/`, `api/approvals/*`, `lib/workflow.ts` | ✅ |
| Shift Kasir | `ShiftModal.tsx`, `api/shifts/*` | ✅ |
| User & Store Management | `app/(admin)/settings/`, `api/users/*`, `api/stores/*` | ✅ (owner) |
| Audit Logs | `app/(admin)/audit/`, `api/logs/*` | ✅ |
| Settings | `app/(admin)/settings/`, `api/settings/*` | ✅ |
| AI Features (import nota, pricing, buyback) | `AIPricingWidget.tsx`, `api/inventory/import-ai`, `api/ai/pricing`, `api/public/buyback/estimate` | ✅ |
| Public (katalog, nota, booking servis) | `app/page.tsx` + `home-client.tsx`, `app/catalog/[slug]/`, `app/nota/[id]/`, `app/nota-servis/[id]/`, `api/public/*` | ✅ (tanpa auth) |

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

1. **Semua path root-relative** (pasca-cutover `52fbc03`, 2026-07-18): `apiFetch`/`assetUrl`/`auth-client`/`upload/route.ts` tanpa prefix, `next.config.ts` tanpa `basePath`. Path lama `/_/backend/*` sekarang **404** — jangan reintroduksi prefix itu.
2. **Pola guard route:** guard mengembalikan `NextResponse` (error) **atau** hasil auth — selalu narrow dengan `instanceof NextResponse` sebelum memakai hasilnya.
3. **Selalu filter `storeId`** pada query data milik store (isolasi tenant/IDOR). Ada e2e test yang menjaga ini — jangan sampai bocor antar-store.
4. **ACID:** operasi yang menyentuh inventory **dan** accounting harus dalam satu `db.transaction()`. Logika ini hidup di `services/`, bukan di handler.
5. **Jurnal via nama akun standar** (dipetakan `JournalMappingService`), jangan tulis kode akun manual.
6. **Client pakai `apiFetch`** (bukan `fetch`) agar `x-store-id` + cookie ikut; mutasi menyiarkan event cross-tab (SWR revalidate). Untuk sesi di komponen shell pakai **`useSessionUser()`** (context dari sesi server) — better-auth `useSession()` **crash saat SSR** (`null.useRef`) di tiap halaman admin.
7. **Ubah skema DB:** edit `backend/src/db/schema/*` → `npm run db:generate` (commit file migrasi) → `npm run db:migrate`. **JANGAN `db:push` ke DB shared/produksi** (diff destruktif tanpa riwayat/rollback; push hanya untuk DB throwaway lokal). Import tabel dari `@/db/schema` (barrel + relations).
8. **Rate limiter default LRU in-memory** — jangan andalkan untuk proteksi produksi lintas instance (lihat ROADMAP).
9. **Route sensitif** (`reset`, `migrate-prd`) butuh `requireOwnerOnly` + flag env; cron butuh `CRON_SECRET`. Jangan longgarkan.
10. **Field masking:** kasir tidak boleh melihat `costPrice` — pertahankan saat menambah endpoint yang mengembalikan data inventory.

---

## 10. Referensi Dokumen
- [ARCHITECTURE.md](ARCHITECTURE.md) — arsitektur, auth/authz, integrasi.
- [BUSINESS_RULES.md](BUSINESS_RULES.md) — aturan bisnis dari kode.
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) — peta folder & schema.
- [ROADMAP.md](ROADMAP.md) — security/performance review, technical debt, skor SaaS.
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md), [README.md](README.md), [DEPLOYMENT.md](DEPLOYMENT.md), [prd.md](prd.md) — dokumen lama/pendukung (sebagian nama env sudah stale).
