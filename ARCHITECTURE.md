# ARCHITECTURE.md

Arsitektur sistem **Han Laptop ERP & POS**. Ditulis dari pembacaan kode (bukan asumsi). Untuk struktur folder lihat [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md); untuk aturan bisnis lihat [BUSINESS_RULES.md](BUSINESS_RULES.md).

---

## 1. Gambaran Umum

**Satu aplikasi Next.js 16 (App Router)** di `backend/`, disajikan di **root** produksi — UI (Server/Client Components) + REST API menyatu: satu framework, satu deploy, satu domain.

| | Aplikasi |
| --- | --- |
| Lokasi | `backend/` (kode di `backend/src/`) |
| Framework | Next.js 16 (App Router) + React 19 |
| Port dev | 3000 |
| URL prod | root `/` (`hanlaptop-front.vercel.app`) |

Client memanggil API lewat prefix `/api` (**root-relative** — tanpa basePath/proxy/rewrite).

> Dulu dua-app (SPA Vite di root + Next di `/backend` basePath `/_/backend`). Migrasi ke Next **selesai 2026-07-18** (`52fbc03`): Vite dihapus, basePath dicabut (path lama 404). Riwayat: [MIGRATION_NEXTJS.md](MIGRATION_NEXTJS.md).

### Alur request

```
Browser ──/api/*──▶ Next.js (root: dev :3000 / prod Vercel)
                     └─ middleware.ts (rate limit, CSRF, headers)
                        └─ route handler ── auth-guard ── service ── Drizzle ── Supabase (Postgres)
```

### Produksi (Vercel, `vercel.json`)

- Satu service Next di `routePrefix: "/"` (`experimentalServices.backend`).
- Region: `hnd1` (Tokyo).

> **Catatan:** semua root-relative — health check & smoke test pakai `/api/...` (bukan lagi `/_/backend/...`). Better-Auth menormalkan `BETTER_AUTH_URL` (lihat `backend/src/lib/auth.ts`).

---

## 2. UI (Client Components)

### Routing (Next App Router)
- Halaman = folder di `backend/src/app/`. Admin di grup `app/(admin)/<modul>/`; shell `app/(admin)/layout.tsx` = **gerbang auth** (server-side `getSession()` → redirect `/login` bila tak ada sesi). Menambah halaman = `app/(admin)/<modul>/page.tsx` (Server Component: metadata + gate) + `<modul>-client.tsx` (`"use client"`).
- Route publik (tanpa auth): `/` (landing), `/login`, `/nota/[id]`, `/nota-servis/[id]`, `/catalog/[slug]`.
- Sesi di komponen shell lewat **`useSessionUser()`** (context dari sesi server, `SessionUserProvider`). **Jangan** `useSession()` better-auth — crash saat SSR (`null.useRef`).

### Data fetching (SWR)
- Semua fetch memakai **`apiFetch` di `backend/src/lib/api.ts`**, bukan `fetch` mentah. `apiFetch` menambahkan:
  - `credentials: 'include'` (cookie session),
  - header `x-store-id` (dari `localStorage.selectedStoreId`, default `"all"`),
  - `Content-Type: application/json` untuk mutasi (kecuali FormData);
  - 401 → redirect `/login`. Semua path root-relative (tanpa basePath).
- Config SWR global (`components/Providers.tsx`): `revalidateOnFocus: false` (hemat koneksi DB), `dedupingInterval: 5000`, tidak retry pada 401/403.

### Sinkronisasi antar-tab
- Setiap mutasi (`POST/PUT/PATCH/DELETE`) yang sukses menyiarkan pesan lewat `BroadcastChannel` (`backend/src/lib/broadcast.ts`).
- `components/Providers.tsx` mendengarkan pesan dan memanggil SWR `mutate` untuk route terkait, sehingga tab lain otomatis revalidate.

### UI & state
- Tailwind CSS v4 + primitives Radix (pola shadcn) di `backend/src/components/ui/`.
- State: React state lokal + custom hooks + SWR (tidak ada Redux/Zustand).
- Ikon Lucide, chart Recharts, PDF `jspdf`, Excel `xlsx`, animasi `framer-motion`, toast `sonner`.

### PWA
- Manifest native `app/manifest.ts`; service worker **tulis-tangan** `public/sw.js` (diregistrasi `ServiceWorkerRegister.tsx`, produksi saja — bundler-agnostic vs Turbopack).
- SW: `/api/*` **NetworkOnly** (respons API tak pernah di-cache), navigasi network-first + fallback offline, aset cache-first.

---

## 3. Backend

### Middleware (`backend/src/middleware.ts`)
Berjalan pada semua path kecuali `/api/health`:
1. Generate `X-Request-ID` (UUID) + structured logging (JSON ke console).
2. Rate limiting per-IP berdasarkan kategori (`auth` / `mutations` / `public`).
3. CSRF: validasi `Origin` pada method mutasi (tolak jika origin ≠ host dan bukan localhost).
4. Security headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, HSTS, dan **Content-Security-Policy**.

### Pola route handler (konvensi wajib)
Setiap route handler mengikuti pola:

```ts
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const authResult = await requirePermission(Permissions.TRANSACTION_CREATE); // atau requireAuth()
    if (authResult instanceof NextResponse) return authResult;   // guard mengembalikan error ATAU hasil auth

    // Untuk mutasi: cek requireWriteAccess(authResult) bila perlu (blokir investor)
    const body = await request.json();
    const parsed = someSchema.safeParse(body);                   // validasi Zod
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });

    // Logika lintas-entitas dipanggil dari services/, dibungkus db.transaction()
    const result = await SomeService.doThing({ storeId: authResult.storeId, userId: authResult.user.id, data: parsed.data });
    return NextResponse.json(result, { status: 201 });
}
```

### Service layer
Logika bisnis yang menyentuh banyak tabel **tidak** ditulis inline di route — diletakkan di `backend/src/services/`:
- `TransactionService` — pembuatan transaksi (stok, jurnal, passport, poin) dalam satu `db.transaction()`.
- `AccountingService` — laporan (neraca, laba rugi, arus kas, trial balance, general ledger), saldo akun, periode fiskal (fungsi-fungsi ter-export, bukan class statis).
- `InventoryService` — markdown + jurnal penurunan nilai.
- `JournalMappingService` — pemetaan `accountName` → `accountCode` (COA).
- `PeriodClosingService` — tutup buku periode fiskal.
- `AuditService` — penulisan audit log.

Aturan ACID: operasi yang mengubah **inventory + accounting bersamaan wajib** dalam satu blok `db.transaction(async (tx) => { ... })`.

### Database
- Klien tunggal di `backend/src/db/index.ts` (di-cache di `globalThis` untuk hot-reload). Memakai `postgres` (postgres-js) + `drizzle-orm/postgres-js`.
- Env `DATABASE_URL` (Supabase Postgres pooler, port 6543). `DIRECT_URL` untuk migrasi via `drizzle-kit push` (port 5432).
- `backend/src/db/schema.ts` adalah barrel: re-export semua `schema/*` + definisi Drizzle `relations`. Import tabel dari `@/db/schema`.
- Soft delete: query dibungkus helper seperti `withActiveTransactions` (`db/query-helpers.ts`).

---

## 4. Authentication Flow

Menggunakan **Better-Auth** (email + password), adapter Drizzle (provider `pg`).

```
1. User submit login (frontend authClient.signIn → POST /api/auth/...)
2. Better-Auth catch-all handler (backend app/api/auth/[...all]/route.ts) memverifikasi kredensial
3. Session cookie di-set (dikirim otomatis karena apiFetch pakai credentials:'include')
4. Frontend Layout.tsx cek useSession(); jika kosong → redirect /login
5. Setiap request API: backend requireAuth() memanggil auth.api.getSession(headers)
```

Detail penting:
- Field tambahan `role` pada user (default `"kasir"`), didefinisikan di `additionalFields` (`backend/src/lib/auth.ts`).
- `trustedOrigins` mencakup localhost dev (3000; sisa 5173/5174 era Vite — harmless) + domain vercel (`hanlaptop`, `hanlaptop-front`) + `FRONTEND_URL`/`VERCEL_URL`/`VERCEL_BRANCH_URL` (dua terakhir agar login preview tak "403 Invalid origin").
- `BETTER_AUTH_SECRET` wajib di runtime produksi Vercel (crash bila hilang saat runtime, hanya warning saat build).

---

## 5. Authorization Flow

Tiga lapis, semuanya di `backend/src/lib/`:

### a. Guard (`auth-guard.ts`)
Guard mengembalikan **hasil auth ATAU `NextResponse` error** — handler harus `if (authResult instanceof NextResponse) return authResult`.
- `requireAuth()` — cek session + resolusi store (`x-store-id`).
- `requireOwner()` / `requireOwnerOnly()` (owner global) / `requireOwnerOrManager()`.
- `requireReportAccess()` — owner/manager/investor (tolak kasir).
- `requireWriteAccess(authResult)` — blokir role `investor` (read-only).
- `requirePermission(Permission)` — cek PBAC granular.

### b. Multi-tenancy (store scoping)
- Store aktif dikirim via header `x-store-id` (dari `localStorage.selectedStoreId`). Owner boleh `"all"`.
- `requireAuth` mencocokkan `x-store-id` dengan tabel `userStoreAccess`; jika tak cocok → fallback ke store pertama yang dapat diakses.
- **Setiap query data milik store wajib difilter `storeId`** (kecuali owner dengan `"all"`). Inilah jaminan isolasi tenant / proteksi IDOR yang diuji di `tests/e2e/multi-tenant.spec.ts`.

### c. PBAC (`permissions.ts`)
- Role: `owner`, `manager`, `kasir`, `teknisi`, `investor`.
- Matriks `RolePermissionsMatrix` memetakan role → daftar permission granular (mis. `inventory.create`, `transaction.void`, `ledger.export`). Owner global mendapat semua permission.

### d. Field-level masking
Contoh di `transactions/route.ts`: bila `storeRole === "kasir"`, `costPrice` item disamarkan menjadi `0` sebelum dikirim ke klien (kasir tidak boleh lihat harga modal).

---

## 6. Integrasi Eksternal

| Layanan | Kegunaan | Env terkait |
| --- | --- | --- |
| Supabase (Postgres) | Database produksi & dev | `DATABASE_URL`, `DIRECT_URL` |
| Google Gemini (`@google/genai`, `gemini-2.5-flash`) | Parsing nota/invoice (import-ai), estimasi harga (ai/pricing), estimasi buyback | `GEMINI_API_KEY` |
| Vercel Blob | Upload gambar/file (`app/api/upload`) | `BLOB_READ_WRITE_TOKEN`, `BLOB_STORE_ID` |
| Sentry | Error monitoring (frontend + backend) | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` |
| Upstash Redis | Tersedia sebagai dependency; **rate limiter default masih LRU in-memory** | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| S3 / Cloudflare R2 / local | Tujuan backup (`backup-service.ts`, cron) | `AWS_*`, `CLOUDFLARE_*`, `BACKUP_STORAGE`, `BACKUP_LOCAL_PATH` |
| Vercel Cron | `/api/cron/backup`, `/api/cron/cleanup` | `CRON_SECRET` |

---

## 7. Observability & Ops
- **Logging:** Pino (`lib/logger.ts`) + structured JSON log di middleware. `LOG_LEVEL` mengatur level.
- **Health:** `/api/health` (liveness dasar), `/api/health/ready` (cek dependency + env), `/api/health/live`.
- **Instrumentation:** `backend/src/instrumentation.ts` (Sentry init via Next.js hook).
- **Rate limiting:** kategori `auth` (5/10menit), `mutations` (30/menit), `public` (100/menit) — adapter LRU in-memory (`lib/rate-limiter/`).
