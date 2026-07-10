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
- SWR: `dedupingInterval`, `revalidateOnFocus: false` (hemat baca Turso).
- PWA: API `NetworkOnly` (tidak cache basi).
- Index DB via `migrate-add-indexes.ts`; soft-delete lewat query-helper.
- Transaksi DB atomik dengan pengurangan stok aman-konkuren.

### Perlu diperhatikan ⚠️
| Prioritas | Temuan | Lokasi |
| --- | --- | --- |
| Medium | `transactions` GET **fetch semua stores + semua storeSettings** tiap panggilan, lalu map manual → tidak skala saat data besar/multi-store banyak. | `app/api/transactions/route.ts` |
| Medium | Pengambilan nama pembuat transaksi lewat query `activityLogs` terpisah (pola N+1-ish saat banyak transaksi). | `app/api/transactions/route.ts` |
| Medium | `AccountingService.ts` (1120 baris) menghitung laporan dengan banyak query per-akun; untuk periode besar bisa lambat — pertimbangkan agregasi SQL. | `services/AccountingService.ts` |
| Low | Tidak ada pagination default terlihat pada beberapa list endpoint (mengandalkan `limit` opsional). | berbagai route |
| Low | Caching Upstash Redis belum dimanfaatkan untuk hasil laporan yang mahal. | — |

---

## 4. Technical Debt

### 🔴 Critical
1. ✔️ **SUDAH DIPERBAIKI** — **Rate limiter in-memory di lingkungan serverless.** Ditambahkan `lib/rate-limiter/redis-adapter.ts` (Upstash Redis, fixed-window, fail-open); `index.ts` memakai Redis bila `UPSTASH_REDIS_REST_URL`+`UPSTASH_REDIS_REST_TOKEN` ada, jika tidak fallback ke LRU. *Tindak lanjut: set env Upstash di produksi agar adapter Redis aktif.*
2. ✔️ **SUDAH DIPERBAIKI** — **Konvensi env DB ganda.** `db/index.ts` kini menerima `DATABASE_URL || TURSO_DATABASE_URL` dan `DATABASE_AUTH_TOKEN || TURSO_AUTH_TOKEN`; `health/ready` menerima keduanya. *Tindak lanjut: pilih satu konvensi kanonik lalu bersihkan sisanya di kemudian hari.*

### 🟠 High
3. ✔️ **SEBAGIAN DIPERBAIKI** — **Sanitasi XSS lemah** (regex). `lib/sanitize.ts` kini menghapus blok `<script>`/`<style>` beserta isinya sebelum strip tag. *Catatan: tetap bukan pengganti sanitizer teruji; untuk keamanan penuh andalkan output-encoding React + pertimbangkan library server yang edge-safe.*
4. ✔️ **SEBAGIAN DIPERBAIKI** — **Test coverage.** (a) **Vitest** + **18 unit test** untuk logika inti murni: pemetaan akun jurnal (`getAccountCodeFromName`), matriks PBAC (`hasPermission`), sanitizer XSS (`sanitizeInput`) — `backend/tests/unit/`. (b) **Harness integrasi** (`backend/tests/integration/`, `vitest.integration.config.ts`) yang mem-`push` skema terkini ke SQLite throwaway (via `drizzle.config.test.ts`) lalu menjalankan **`TransactionService.createTransaction` sungguhan** — memverifikasi pengurangan stok, jurnal double-entry seimbang, DP→Piutang, dan rollback atomik saat stok kurang (3 test). CI menjalankan `npm test` + `npm run test:integration`; `tsc --noEmit` hijau (tsconfig exclude `tests/`). *Sisa: test integrasi untuk `AccountingService`/laporan, dan Playwright e2e di CI (butuh `@playwright/test` + server).*
5. ✔️ **SUDAH DIPERBAIKI** — **File DB SQLite ter-commit** (`backend/local.db`, `backend/sqlite.db`, `data/han-laptop.db` + sidecar `-wal`/`-shm`). Semua di-`git rm --cached` (tetap ada di disk lokal) dan pola `*.db*` ditambahkan ke `.gitignore` agar tak ter-commit lagi.

### 🟡 Medium
6. **Puluhan skrip one-off** bertebaran di `backend/` dan `backend/src/db/` (`inspect_*.js/ts`, `debug-*.ts`, `test-*.ts`, `fix-*.ts`, `migrate-*.ts`, `find_dbs_old.cjs`, dll.) — sebaiknya dipindah ke `backend/scripts/` dan didokumentasikan/dibersihkan. (`backend/`, `backend/src/db/`)
7. **Typing longgar** — `data: any` di `TransactionService`, banyak `as any` untuk `user.role`/`storeRole`. Definisikan tipe `AuthResult` yang benar. (`services/`, `lib/auth-guard.ts`)
8. **File besar / monolitik** — `AccountingService.ts` (1120), `validators.ts` (346), `TransactionService.ts` (489). Pertimbangkan pemecahan.
9. **Dokumen env stale** — README menyebut `TURSO_DATABASE_URL` sedangkan kode utama pakai `DATABASE_URL`.
10. **Folder `app/api/debug-db` kosong** — hapus bila tak dipakai. (`app/api/debug-db/`)

### 🟢 Low
11. Alamat/telepon toko **hard-coded** sebagai fallback di route transaksi. (`app/api/transactions/route.ts`)
12. String pesan campur Bahasa Indonesia & Inggris di error/log.
13. `console.log`/`console.warn` dipakai langsung di beberapa tempat alih-alih logger Pino terpusat.

---

## 5. SaaS Readiness (rincian)

| Dimensi | Status | Catatan |
| --- | --- | --- |
| Multi-tenancy | 🟢 Kuat | Store scoping + PBAC + tes isolasi. Model data siap multi-store/organisasi. |
| Scalability | 🟠 Sedang | Turso/serverless bagus, tapi rate limiter in-memory & beberapa query full-fetch jadi penghambat. |
| Maintainability | 🟠 Sedang | Service layer & validasi rapi; terkotori skrip one-off & `any`. |
| Extensibility | 🟢 Baik | PBAC matrix, journal mapping, dan schema modular mudah diperluas. |
| Observability | 🟢 Baik | Pino, request-id, Sentry, structured log. |
| Monitoring/Health | 🟢 Baik | `/health`, `/ready`, `/live`. |
| Deployment | 🟢 Baik | Vercel dual-service + cron backup. |
| CI/CD | 🟢 Baik | `.github/workflows/ci.yml` menjalankan lint/typecheck/build frontend + typecheck/**unit test (Vitest)**/build backend. Sisa: Playwright e2e di CI. |
| Production readiness | 🟠 Sedang | Perlu selesaikan Critical/High di atas. |

---

## 6. Rekomendasi Prioritas (urutan disarankan)

1. ✔️ **SELESAI** — Standarkan env DB (menerima kedua konvensi) + perbarui README/health check.
2. ✔️ **SELESAI (kode)** — Adapter Upstash Redis untuk rate limiter. *Tindak lanjut ops: set `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` di produksi.*
3. ✔️ **SELESAI** — Sanitasi/XSS diperkuat (script/style block) + **CSP `unsafe-eval` dihapus**. *Sisa opsional: hilangkan `'unsafe-inline'` dengan nonce/hash bila diperlukan.*
4. ✔️ **SELESAI** — Cron endpoint fail-closed di produksi + **hentikan tracking DB SQLite** ter-commit (git rm --cached + `.gitignore`).
5. ✔️ **SEBAGIAN** — **CI + test**: Vitest 18 unit test + 3 integration test (alur jual `TransactionService` di SQLite throwaway), keduanya di CI; `tsc` hijau. *Sisa: integrasi `AccountingService`/laporan + Playwright e2e di CI.*
6. **Optimasi laporan & list** — agregasi SQL untuk akuntansi, hindari full-fetch stores/settings per request, tambah pagination. *(Medium, terbuka)*
7. ✔️ **SEBAGIAN** — **Typing diperketat**: (a) tipe `AuthContext`/`AuthUser` di `auth-guard.ts`, return guard beranotasi, **35 cast `(authResult.user as any)` dihapus** di guard + 21 route; (b) `TransactionService.data` kini bertipe `TransactionInput` (`z.infer<typeof transactionSchema>`) alih-alih `any`, dan cabang `transactionType` yang tak-terjangkau (`"Pengeluaran Operasional"`) dibersihkan. *Sisa: rapikan skrip one-off ke `scripts/`.*

> Item bertanda ✔️ sudah dikerjakan pada sesi ini. Sisanya (CI test, optimasi query, typing, penataan skrip) bersifat perbaikan bertahap dan tidak mendesak untuk aplikasi yang belum dipakai.
