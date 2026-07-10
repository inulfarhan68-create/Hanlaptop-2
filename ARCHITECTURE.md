# ARCHITECTURE.md

Arsitektur sistem **Han Laptop ERP & POS**. Ditulis dari pembacaan kode (bukan asumsi). Untuk struktur folder lihat [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md); untuk aturan bisnis lihat [BUSINESS_RULES.md](BUSINESS_RULES.md).

---

## 1. Gambaran Umum

Dua aplikasi terpisah dalam satu repo:

| | Frontend | Backend |
| --- | --- | --- |
| Lokasi | root (`src/`) | `/backend` |
| Framework | React 19 + Vite 8 SPA | Next.js 16 (App Router) |
| Port dev | 5173 | 3000 |
| Peran | UI, POS, dashboard | REST API + logika bisnis + DB |

Frontend memanggil backend lewat prefix `/api`. **Backend disajikan di basePath `/_/backend`** (bukan root).

### Alur request (dev)

```
Browser ──/api/*──▶ Vite dev server (5173)
                     └─ proxy ke ──▶ http://localhost:3000/_/backend/api/*  (Next.js)
                                      └─ middleware.ts (rate limit, CSRF, headers)
                                         └─ route handler ── auth-guard ── service ── Drizzle ── SQLite/Turso
```

### Alur request (produksi — Vercel, `vercel.json`)

- Frontend (Vite) di `routePrefix: "/"`, Backend (Next.js) di `routePrefix: "/_/backend"`.
- Rewrite: `/api/:match*` → `/_/backend/api/:match*`.
- Region: `hnd1` (Tokyo).

> **Penting:** karena basePath `/_/backend`, health check & smoke test harus memakai prefix tersebut. Better-Auth juga menormalkan `BETTER_AUTH_URL` untuk membuang `/_/backend` (lihat `backend/src/lib/auth.ts`).

---

## 2. Frontend

### Routing
- Semua route didefinisikan di `src/App.tsx` dengan `React.lazy` (code splitting). Menambah halaman = tambah lazy import + `<Route>` di sini.
- Route publik (tanpa auth): `/` (landing), `/login`, `/nota/:id`, `/nota-servis/:id`, `/catalog/:slug`.
- Route terproteksi: berada di bawah `<Route element={<Layout />}>`. **`Layout` (`src/components/layout/Layout.tsx`) adalah gerbang auth** — jika `useSession()` tidak ada session, redirect ke `/login`.

### Data fetching (SWR)
- Semua fetch memakai **`apiFetch` di `src/lib/api.ts`**, bukan `fetch` mentah. `apiFetch` menambahkan:
  - `credentials: 'include'` (cookie session),
  - header `x-store-id` (dari `localStorage.selectedStoreId`, default `"all"`),
  - `Content-Type: application/json` untuk mutasi (kecuali FormData).
- Config SWR global (`src/App.tsx`): `revalidateOnFocus: false` (hemat baca Turso), `dedupingInterval: 5000`, tidak retry pada 401/403.

### Sinkronisasi antar-tab
- Setiap mutasi (`POST/PUT/PATCH/DELETE`) yang sukses menyiarkan pesan lewat `BroadcastChannel` (`src/lib/broadcast.ts`).
- `App.tsx` mendengarkan pesan dan memanggil SWR `mutate` untuk route terkait, sehingga tab lain otomatis revalidate.

### UI & state
- Tailwind CSS v4 + primitives Radix (pola shadcn) di `src/components/ui/`.
- State: React state lokal + custom hooks + SWR (tidak ada Redux/Zustand).
- Ikon Lucide, chart Recharts, PDF `jspdf`, Excel `xlsx`, animasi `framer-motion`, toast `sonner`.

### PWA
- `vite-plugin-pwa` (`registerType: autoUpdate`). Service worker memakai **NetworkOnly** untuk `/api/*` (respons API tidak pernah di-cache SW).
- Vendor berat dipecah ke chunk manual (`vite.config.ts`): xlsx, recharts, framer-motion, jspdf/qr, radix, icons.

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
- Klien tunggal di `backend/src/db/index.ts` (di-cache di `globalThis` untuk hot-reload). Memakai `@libsql/client` + `drizzle-orm/libsql`.
- Env `DATABASE_URL` (`libsql://…` Turso) + `DATABASE_AUTH_TOKEN`. Bila bukan URL libsql → fallback file lokal `data/han-laptop.db`.
- **Catatan:** ada dua konvensi env yang bercampur di kode — `DATABASE_URL`/`DATABASE_AUTH_TOKEN` (dipakai `db/index.ts`) dan `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` (dipakai `migrate-add-indexes.ts`, `migrate-prd`, health `ready`). Perlu distandarkan.
- `backend/src/db/schema.ts` adalah barrel: re-export semua `schema/*` + definisi Drizzle `relations`. Import tabel dari `@/db/schema`.
- Soft delete: query dibungkus helper seperti `withActiveTransactions` (`db/query-helpers.ts`).

---

## 4. Authentication Flow

Menggunakan **Better-Auth** (email + password), adapter Drizzle (provider `sqlite`).

```
1. User submit login (frontend authClient.signIn → POST /api/auth/...)
2. Better-Auth catch-all handler (backend app/api/auth/[...all]/route.ts) memverifikasi kredensial
3. Session cookie di-set (dikirim otomatis karena apiFetch pakai credentials:'include')
4. Frontend Layout.tsx cek useSession(); jika kosong → redirect /login
5. Setiap request API: backend requireAuth() memanggil auth.api.getSession(headers)
```

Detail penting:
- Field tambahan `role` pada user (default `"kasir"`), didefinisikan di `additionalFields` (`backend/src/lib/auth.ts`).
- `trustedOrigins` mencakup localhost:5173/5174/3000 + domain vercel + `FRONTEND_URL`/`VERCEL_URL`.
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
| Turso (libSQL) | Database produksi | `DATABASE_URL`, `DATABASE_AUTH_TOKEN` |
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
