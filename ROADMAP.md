# ROADMAP.md

Rekomendasi pengembangan, hasil review (security, performance, SaaS readiness), dan daftar technical debt. Semua temuan berbasis pembacaan kode per **2026-07-10**.

> **Update 2026-07-10 — sebagian temuan sudah diperbaiki** (lihat penanda ✔️ **SUDAH DIPERBAIKI**):
> standardisasi env DB, adapter rate limiter Redis (Upstash) dengan fallback LRU, penguatan sanitizer XSS, dan koreksi dokumentasi env. Item lain masih terbuka / sengaja ditahan karena berisiko.

---

## 1. Ringkasan Skor

| Aspek | Skor | Catatan singkat |
| --- | ---: | --- |
| Security | 72/100 | Fondasi bagus (guard, PBAC, CSRF, CSP, IDOR test). Kelemahan: sanitasi XSS regex, rate limit in-memory. |
| Performance | 70/100 | Lazy routes, SWR dedup, index DB, chunk manual. Ada beberapa query N+1 & full-table fetch. |
| Maintainability | 60/100 | Service layer rapi, tapi banyak skrip one-off & `any`, file besar. |
| **SaaS Readiness** | **62/100** | Multi-tenant kuat, observability ada. Blocker skala: rate limiter in-memory, DB env ganda, tanpa CI/CD & test coverage tipis. |

Detail per aspek di bawah.

---

## 2. Security Review

### Sudah baik ✅
- **AuthN/AuthZ berlapis:** Better-Auth + `auth-guard` (guard mengembalikan error/hasil) + PBAC matrix + store scoping. Semua route non-publik memanggil guard.
- **Isolasi tenant (IDOR):** query difilter `storeId`; ada `tests/e2e/multi-tenant.spec.ts` & `security.spec.ts`.
- **Field-level masking:** `costPrice` disembunyikan dari role `kasir`.
- **CSRF:** validasi Origin pada mutasi (middleware).
- **Security headers + CSP** di middleware & `vercel.json`.
- **Rate limiting** per kategori (auth/mutations/public).
- **Route berbahaya dijaga:** `reset` & `migrate-prd` butuh `requireOwnerOnly` + `ENABLE_FACTORY_RESET=true`; cron butuh `Bearer ${CRON_SECRET}`.
- **Validasi input** menyeluruh via Zod (`validators.ts`).
- **SQL injection:** rendah — Drizzle ORM parameterized, tidak ada raw string SQL dari input user yang terlihat.

### Perlu diperbaiki ⚠️
| Prioritas | Temuan | Lokasi |
| --- | --- | --- |
| High ✔️ diperbaiki | **4 kebocoran BACA lintas-tenant.** (a) `GET /api/user/stores` mengembalikan **seluruh** store di database untuk peran owner — padahal pasca-Fase-2 owner itu org-scoped — sehingga store switcher membocorkan nama & alamat tenant lain; (b) fallback identitas toko berisi **kontak asli Han Laptop** dan tercetak di nota tenant lain (lihat Technical Debt #11); (c) `GET /api/suggestions` ber-auth tapi tanpa `storeScope`, sehingga autocomplete menyodorkan nama barang & perangkat **semua tenant**; (d) `GET /api/crm/leads` pada cabang `storeId === "all"` berjalan **tanpa WHERE sama sekali** → owner disuguhi buyback lead semua tenant berikut kontak pelanggan. | `api/user/stores`, `api/settings`, `api/suggestions`, `api/crm/leads` |
| High ✔️ diperbaiki | **3 kerentanan TULIS lintas-tenant** — lebih merusak daripada kebocoran baca di atas. (a) `PUT`/`DELETE /api/users/[id]` dijaga `requireOwnerOnly` (meloloskan owner tenant **mana pun**) lalu mengakses tabel user lewat ID mentah tanpa cek organisasi → owner toko A bisa mengubah peran atau **menghapus** pengguna toko B beserta sesi & kredensialnya; (b) `POST /api/employees` mengambil cabang dari `body.storeId` tanpa validasi → staf bisa dibuat di cabang tenant lain (terjangkau **secara default**, karena selector owner default-nya `"all"`); (c) `employees/attendance/admin-log` mencari karyawan dengan `eq(employees.id, …)` telanjang → manager bisa mencatat/mengubah/menghapus absensi staf tenant lain. *Bukan eskalasi peran: `updateUserSchema` membatasi role ke enum non-`platform_admin`.* | `api/users/[id]`, `api/employees`, `api/employees/attendance/admin-log` |
| High ✔️ diperbaiki | **Dua route API tidak pernah masuk repositori.** `.gitignore` berisi pola telanjang `logs`, yang mencocokkan **direktori bernama `logs` di mana pun** — termasuk `backend/src/app/api/logs/`. Kedua file route hanya ada di mesin developer; di produksi `/api/logs` dan `/api/logs/audit` menjawab **404** (dibuktikan dengan membandingkannya terhadap `/api/alerts` yang menjawab 401), sehingga halaman Audit Trail & tab Audit Logs **mati di produksi** sementara tampak normal di lokal. Pola kini di-anchor (`/logs/`, `/backend/logs/`) dan kedua route ter-commit. | `.gitignore`, `api/logs/`, `api/logs/audit/` |
| Medium ✔️ diperbaiki | **Sentinel `"all"` dibandingkan sebagai store id.** `eq(tabel.storeId, authResult.storeId)` tak cocok baris mana pun saat storeId = `"all"` — dan itu **default bagi owner** — sehingga daftar periode fiskal, register aset tetap, dan audit trail tampak **kosong**. Fail-closed (bukan bocor), tapi tiga fitur terlihat rusak. Semua kini lewat `storeScope`. | `accounting/fiscal-periods`, `accounting/fixed-assets`, `logs/audit` |
| High ✔️ diperbaiki | **Gate isolasi tenant di CI sebelumnya tidak menguji apa pun** — `multi-tenant.spec.ts` di-`fixme` karena memalsukan sesi (token mentah, padahal Better-Auth v1.6 menandatangani cookie) sehingga semua request 401. Dipulihkan dengan login sungguhan (`tests/helpers/auth.ts`) + assertion baru (spoof `x-store-id`, `user/stores`, `suggestions`). Inilah gate yang seharusnya menangkap (a) dan (c) di atas. | `tests/e2e/multi-tenant.spec.ts`, `tests/helpers/auth.ts` |
| High ✔️ diperbaiki sebagian | **Sanitasi XSS berbasis regex** — kini blok `<script>`/`<style>` + isinya dihapus lebih dulu sebelum strip tag. Masih disarankan output-encoding React + sanitizer teruji edge-safe untuk keamanan penuh. | `backend/src/lib/sanitize.ts` |
| High ✔️ diperbaiki | **Rate limiter in-memory (LRU)** → ditambahkan adapter Upstash Redis (fail-open) yang aktif otomatis bila env Upstash diset; fallback LRU untuk dev. Set env Upstash di produksi untuk mengaktifkan. | `backend/src/lib/rate-limiter/` |
| Medium ✔️ diperbaiki sebagian | **CSP `unsafe-eval` dihapus** dari `script-src`. `'unsafe-inline'` masih ada (menghapusnya butuh nonce/hash — ditahan agar tidak memecah runtime). | `backend/src/middleware.ts` |
| Medium ✔️ diperbaiki | **`CRON_SECRET` opsional** → endpoint cron kini **fail-closed di produksi** (503 bila secret tak diset) via `lib/cron-auth.ts`. | `cron/*/route.ts`, `lib/cron-auth.ts` |
| Medium | **Fallback `BETTER_AUTH_SECRET = "dev-only-secret..."`** saat non-Vercel; pastikan tidak terpakai di produksi self-host. | `backend/src/lib/auth.ts` |
| Low | Banyak file `.env*` (termasuk `.env.production*`, `.env.vercel.*`) di root repo — pastikan tidak ada rahasia ter-commit; verifikasi `.gitignore`. | root |
| Low | Upload file (`app/api/upload`) — verifikasi validasi tipe/ukuran & tidak mengembalikan URL yang bisa disalahgunakan. | `app/api/upload/route.ts` |

---

## 3. Performance Review

### Sudah baik ✅
- Route frontend **lazy-loaded** + **manual vendor chunks** (xlsx/recharts/framer-motion/jspdf/radix/icons).
- SWR: `dedupingInterval`, `revalidateOnFocus: false` (hemat koneksi DB).
- PWA: API `NetworkOnly` (tidak cache basi).
- Index DB via `migrate-add-indexes.ts`; soft-delete lewat query-helper.
- Transaksi DB atomik dengan pengurangan stok aman-konkuren.

### Perlu diperhatikan ⚠️
| Prioritas | Temuan | Lokasi |
| --- | --- | --- |
| ✔️ SELESAI | `transactions` GET fetch semua stores + semua storeSettings tiap panggilan. Kini hanya store yang muncul di respons, dan keduanya paralel. | `app/api/transactions/route.ts` |
| Medium | Pengambilan nama pembuat transaksi lewat query `activityLogs` terpisah (pola N+1-ish saat banyak transaksi). | `app/api/transactions/route.ts` |
| ✔️ SELESAI | `AccountingService` menghitung saldo per-akun (2 round-trip × ~60 akun, dan neraca menunggu laba rugi di tengah). Diganti **satu agregat `GROUP BY`** (`getAccountActivityMap`). Terukur: **balance-sheet 42,8s → 1,06s**, income-statement 16,1s → 1,10s, trial-balance 2,0s, cash-flow 3,9s → 1,9s, equity-changes 3,2s → 1,1s. | `services/AccountingService.ts` |
| ✔️ SELESAI | Rantai auth dijalankan **dua kali** per request pada route yang memakai 2 guard (`requireFeature` memanggil `requireAuth` dari nol), dan validasi sesi menyentuh DB tiap request. Guard kini bisa menerima context yang sudah ada + cookie cache Better-Auth (60s). Tiap request ber-auth −0,5s. | `lib/auth-guard.ts`, `lib/auth.ts` |
| ✔️ SEBAGIAN BESAR SELESAI | Pagination list endpoint. **Sudah:** `inventory` (sejak awal), piutang/hutang (`api/receivables`/`api/payables` — agregat umur di SQL + paging), dan `api/logs` (yang sebelumnya ber-`limit: 100` keras dengan pencarian di klien, sehingga aktivitas lama **diam-diam tak bisa ditemukan** — pada jejak audit, "tak ketemu" terbaca sebagai "tak pernah terjadi"). **Tak perlu:** `customers`/`suppliers` adalah picker (butuh search server, bukan paging) dan `services` adalah papan Kanban (butuh semua kartu). Pelajaran: "tambah pagination" tak otomatis benar untuk tiap list. | `api/receivables`, `api/payables`, `api/logs` |
| Low | Caching Upstash Redis belum dimanfaatkan untuk hasil laporan yang mahal. | — |

---

## 4. Technical Debt

### 🔴 Critical
1. ✔️ **SUDAH DIPERBAIKI** — **Rate limiter in-memory di lingkungan serverless.** Ditambahkan `lib/rate-limiter/redis-adapter.ts` (Upstash Redis, fixed-window, fail-open); `index.ts` memakai Redis bila `UPSTASH_REDIS_REST_URL`+`UPSTASH_REDIS_REST_TOKEN` ada, jika tidak fallback ke LRU. *Tindak lanjut: set env Upstash di produksi agar adapter Redis aktif.*
2. ✔️ **SUDAH DIPERBAIKI** — **Konvensi env DB.** Sekarang hanya `DATABASE_URL` (Supabase Postgres pooler) + `DIRECT_URL` (direct connection untuk migrasi). Legacy `TURSO_*` sudah dihapus.

### 🟠 High
3. ✔️ **SEBAGIAN DIPERBAIKI** — **Sanitasi XSS lemah** (regex). `lib/sanitize.ts` kini menghapus blok `<script>`/`<style>` beserta isinya sebelum strip tag. *Catatan: tetap bukan pengganti sanitizer teruji; untuk keamanan penuh andalkan output-encoding React + pertimbangkan library server yang edge-safe.*
4. ✔️ **SEBAGIAN DIPERBAIKI** — **Test coverage.** (a) **Vitest** + **39 unit test** untuk logika inti murni: pemetaan akun jurnal (`getAccountCodeFromName`), matriks PBAC (`hasPermission`), sanitizer XSS (`sanitizeInput`), pricing buyback, asset-url — `backend/tests/unit/`. (b) **Harness integrasi** (`backend/tests/integration/`, `vitest.integration.config.ts`) yang mem-`push` skema terkini ke **Postgres throwaway** (`drizzle-kit push --config=drizzle.config.test.ts`; CI pakai service `postgres:16`) lalu menjalankan **service sungguhan** (`TransactionService.createTransaction`, invoice-number, QC intake, service-parts) — memverifikasi pengurangan stok, jurnal double-entry seimbang, DP→Piutang, dan rollback atomik saat stok kurang (**23 test, 6 file**). CI menjalankan `npm test` + `npm run test:integration`; `tsc --noEmit` hijau (tsconfig exclude `tests/`). ✔️ **Ditutup:** integrasi `AccountingService`/laporan kini ada — `accounting-reports.test.ts` (mengunci jendela periode, filter `isVoided`, batas store, dan identitas akuntansi) dan `receivables-aging.test.ts` (batas bucket umur hari 0/1/30/31/60/61, DP hanya sisanya, paging tak mengubah total). **Playwright e2e sudah jalan di CI**, termasuk gate isolasi multi-tenant yang dipulihkan. Kini 60 unit test + suite integrasi + e2e, semuanya hijau di CI.
5. ✔️ **SUDAH DIPERBAIKI** — **File DB SQLite ter-commit** (`backend/local.db`, `backend/sqlite.db`, `data/han-laptop.db` + sidecar `-wal`/`-shm`). Semua di-`git rm --cached` (tetap ada di disk lokal) dan pola `*.db*` ditambahkan ke `.gitignore` agar tak ter-commit lagi.

### 🟡 Medium
6. ✔️ **SUDAH DIPERBAIKI** — 15 skrip one-off dipindah dari root `backend/` ke **`backend/scripts/`** + `README.md` yang mengatalogkan tiap skrip dan menandai yang destruktif. Perlu penanganan dua jenis path yang berbeda: impor modul relatif-file (`./src` → `../src`), `dotenv.config({path:"./.env"})` relatif-**CWD** (tetap `./.env`, dijalankan dari `backend/`), dan `path.join(__dirname, ".env")` relatif-file (→ naik satu level). Tetap di tempat: `patch-kysely.cjs` (dipanggil `postinstall`) dan `src/db/reset-tables.ts` (kode aplikasi, di-import `api/reset`). *Sisa: beberapa skrip di `src/db/` (`fix.ts`, `seed-custom.ts`, `seed-large.ts`, `migrate-tenancy.ts`) masih di sana karena dirujuk dokumen.*
7. **Typing longgar** — `data: any` di `TransactionService`, banyak `as any` untuk `user.role`/`storeRole`. Definisikan tipe `AuthResult` yang benar. (`services/`, `lib/auth-guard.ts`)
8. **File besar / monolitik** — `AccountingService.ts` (1120), `validators.ts` (346), `TransactionService.ts` (489). Pertimbangkan pemecahan.
9. ✔️ **SUDAH DIPERBAIKI** — **Dokumen env sudah diperbarui** — README, CLAUDE.md, DEPLOYMENT.md sekarang hanya menyebut `DATABASE_URL` (Supabase).
10. ✔️ **TIDAK BERLAKU** — folder `app/api/debug-db` sudah tidak ada.

### 🟢 Low
11. ✔️ **SUDAH DIPERBAIKI — ternyata bukan kosmetik.** Fallback alamat/telepon berisi **data asli Han Laptop**, dan letaknya di hulu semua dokumen pelanggan (`api/settings`, `api/transactions`, `api/transactions/[id]`, `lib/public/invoices`). Toko lain yang belum mengisi pengaturan memberikan alamat & HP Han Laptop kepada pelanggannya sendiri — di nota, tanda terima servis, flyer stok, dan laporan cetak. Semua fallback identitas dihapus; perender kini menghilangkan barisnya, dan `StoreSettingsTab` berhenti menulis placeholder ke localStorage. *Sisa: default nama toko `"HanLaptop"` di ~10 file (severity rendah — nama, bukan kontak).*
12. String pesan campur Bahasa Indonesia & Inggris di error/log.
13. `console.log`/`console.warn` dipakai langsung di beberapa tempat alih-alih logger Pino terpusat.

---

## 5. SaaS Readiness (rincian)

| Dimensi | Status | Catatan |
| --- | --- | --- |
| Multi-tenancy | 🟢 Kuat | Store scoping + PBAC + tes isolasi. Model data siap multi-store/organisasi. |
| Scalability | 🟢 Baik | Supabase Postgres + serverless, tapi rate limiter in-memory & beberapa query full-fetch jadi penghambat. |
| Maintainability | 🟠 Sedang | Service layer & validasi rapi; terkotori skrip one-off & `any`. |
| Extensibility | 🟢 Baik | PBAC matrix, journal mapping, dan schema modular mudah diperluas. |
| Observability | 🟢 Baik | Pino, request-id, Sentry, structured log. |
| Monitoring/Health | 🟢 Baik | `/health`, `/ready`, `/live`. |
| Deployment | 🟢 Baik | Vercel — satu service Next di root (`experimentalServices`) + cron backup. |
| CI/CD | 🟢 Baik | `.github/workflows/ci.yml` (satu job `backend:`) menjalankan `tsc` + **unit test (Vitest)** + integrasi (service Postgres) + build. Sisa: Playwright e2e di CI. |
| Production readiness | 🟠 Sedang | Perlu selesaikan Critical/High di atas. |

---

## 6. Rekomendasi Prioritas (urutan disarankan)

1. ✔️ **SELESAI** — Standarkan env DB (menerima kedua konvensi) + perbarui README/health check.
2. ✔️ **SELESAI (kode)** — Adapter Upstash Redis untuk rate limiter. *Tindak lanjut ops: set `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` di produksi.*
3. ✔️ **SELESAI** — Sanitasi/XSS diperkuat (script/style block) + **CSP `unsafe-eval` dihapus**. *Sisa opsional: hilangkan `'unsafe-inline'` dengan nonce/hash bila diperlukan.*
4. ✔️ **SELESAI** — Cron endpoint fail-closed di produksi + **hentikan tracking DB SQLite** ter-commit (git rm --cached + `.gitignore`).
5. ✔️ **SEBAGIAN** — **CI + test**: Vitest 39 unit + 23 integration test (alur jual `TransactionService`, invoice, QC, service-parts — di **Postgres throwaway**), keduanya di CI; `tsc` hijau. ✔️ **SELESAI** — integrasi `AccountingService`/laporan + Playwright e2e (termasuk gate isolasi multi-tenant) sudah berjalan di CI.
6. ✔️ **SEBAGIAN BESAR SELESAI** — **Optimasi laporan & list**: agregasi SQL untuk akuntansi (**neraca 42,8s → 1,06s**), full-fetch stores/settings dihapus dari `transactions` & `alerts`, rantai auth ganda dihilangkan + cookie cache sesi (−0,5s tiap request ber-auth), dan pagination server-side untuk piutang/hutang lewat `ReceivablesService`. *Sisa: pagination untuk `customers`/`suppliers`/`services`/`logs`, dan memindahkan agregasi sisi-klien pada konsumen `/api/transactions` lain sebelum endpoint itu bisa dibatasi.*
7. ✔️ **SEBAGIAN** — **Typing diperketat**: (a) tipe `AuthContext`/`AuthUser` di `auth-guard.ts`, return guard beranotasi, **35 cast `(authResult.user as any)` dihapus** di guard + 21 route; (b) `TransactionService.data` kini bertipe `TransactionInput` (`z.infer<typeof transactionSchema>`) alih-alih `any`, dan cabang `transactionType` yang tak-terjangkau (`"Pengeluaran Operasional"`) dibersihkan. *Sisa: rapikan skrip one-off ke `scripts/`.*

> Item bertanda ✔️ sudah dikerjakan pada sesi ini. Sisanya (CI test, optimasi query, typing, penataan skrip) bersifat perbaikan bertahap dan tidak mendesak untuk aplikasi yang belum dipakai.
