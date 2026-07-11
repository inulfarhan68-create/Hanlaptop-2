# MIGRATION_SUPABASE.md

Rencana migrasi **database dari SQLite/Turso → Supabase (Postgres)**, dengan **tetap memakai Drizzle + Better-Auth**. Supabase dipakai sebagai **penyedia Postgres + Storage**, bukan mengganti Auth (lihat keputusan di [ROADMAP.md](ROADMAP.md)). Auth = pintu identitas; business logic tetap di service layer.

> Status: **rencana** — belum dieksekusi. Kerjakan di **branch terpisah** (`feat/supabase-postgres`), jangan di `main`. Karena app **belum dipakai**, tidak ada migrasi data — hanya konversi kode + schema.

---

## 0. Prasyarat (yang perlu kamu sediakan)

1. Buat project Supabase → dari **Project Settings → Database** ambil dua connection string:
   - **Pooler / Transaction mode** (host `...pooler.supabase.com`, port **6543**) → untuk **runtime** (Vercel serverless). Simpan sebagai `DATABASE_URL`.
   - **Direct connection** (port **5432**) → untuk **migrasi / `drizzle-kit`**. Simpan sebagai `DIRECT_URL`.
2. Set keduanya di `.env.local` (dev) dan Vercel (prod).

> ⚠️ **Gotcha #1 (paling sering bikin gagal):** di serverless **wajib** pakai pooler transaction mode (6543). Koneksi langsung (5432) akan menghabiskan slot koneksi Postgres → API 500. Prepared statement tidak didukung di transaction pooling → klien harus `prepare: false`.

---

## 1. Prinsip & Strategi

- **Pertahankan Drizzle** — hanya ganti dialect. Semua `services/`, `validators`, pola route handler **tidak berubah**.
- **Pertahankan Better-Auth** — cukup ganti `provider: "sqlite"` → `"pg"`.
- **Fased & terverifikasi** — tiap fase punya gerbang verifikasi (typecheck / drizzle-kit / test).
- Konversi schema bisa **diverifikasi offline** dengan `drizzle-kit generate` (menghasilkan SQL tanpa konek DB) + `tsc`. Cut-over runtime baru butuh koneksi Supabase.

---

## 2. Peta Perubahan File

| File | Perubahan |
| --- | --- |
| `backend/package.json` | + `postgres` (postgres-js); nanti hapus `@libsql/client`, `better-sqlite3` |
| `backend/src/db/index.ts` | Klien `libsql` → `postgres-js` |
| `backend/drizzle.config.ts` | `dialect: "turso"` → `"postgresql"`, pakai `DIRECT_URL` |
| `backend/src/db/schema/*.ts` (9 file) | `sqliteTable`→`pgTable`, konversi tipe kolom (lihat §4) |
| `backend/src/lib/auth.ts` | Better-Auth `provider: "sqlite"` → `"pg"` |
| `backend/src/app/api/health/ready/route.ts` | `db.run(sql\`SELECT 1\`)` → `db.execute(...)` |
| Query dengan `like()` untuk pencarian teks | pertimbangkan `ilike()` (lihat Gotcha #3) |
| `backend/drizzle.config.test.ts` + harness integrasi | target SQLite → Postgres (lihat §6) |
| `.github/workflows/ci.yml` | tambah service container `postgres` untuk integration test |

---

## 3. Konfigurasi Klien & Config (Fase 1)

**`backend/src/db/index.ts`** (baru):
```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

// Cache across hot-reload / serverless invocations to avoid exhausting connections.
const g = globalThis as unknown as { _pg?: ReturnType<typeof postgres> };
// prepare:false → wajib untuk Supabase transaction pooler (6543).
const client = g._pg ?? postgres(connectionString, { prepare: false, max: 1 });
if (process.env.NODE_ENV !== "production") g._pg = client;

export const db = drizzle(client, { schema });
```

**`backend/drizzle.config.ts`** (baru):
```ts
import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Migrasi pakai DIRECT connection (5432), BUKAN pooler.
  dbCredentials: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL! },
});
```

Install: `npm i postgres` (di `/backend`).

---

## 4. Konversi Schema (Fase 2) — bagian paling teliti

Ganti import `drizzle-orm/sqlite-core` → `drizzle-orm/pg-core` dan fungsi `sqliteTable`→`pgTable`. Tabel pemetaan tipe:

| SQLite (sekarang) | Postgres (target) | Catatan |
| --- | --- | --- |
| `text("x")` | `text("x")` | sama |
| `integer("x", { mode: "timestamp" })` | `timestamp("x", { withTimezone: true })` | `$defaultFn(() => new Date())` tetap; atau `.defaultNow()` |
| `integer("x", { mode: "boolean" })` | `boolean("x")` | |
| `real("x")` **untuk UANG/nominal** | **`doublePrecision("x")`** | drop-in, tetap `number` (lihat Gotcha #2) |
| `integer("x")` untuk kuantitas kecil (qty, minStock, skor QC) | `integer("x")` | aman (< 2,1 miliar) |
| `text().primaryKey().$defaultFn(() => crypto.randomUUID())` | sama, atau `.default(sql\`gen_random_uuid()\`)` | Supabase punya `pgcrypto` |
| `uniqueIndex(...)` / `index(...)` | sama di `pg-core` (API mirip) | |

> ### ✅ Gotcha #2 — uang di schema ini ternyata `real`, bukan `integer`
> Ternyata semua kolom nominal (`amount`, `costPrice`, `sellingPrice`, `unitPrice`, `debit`, `credit`, `dpAmount`, `openingBalance`, dst.) sudah bertipe **`real`** di SQLite (mis. `costPrice` sengaja pecahan karena rata-rata bergerak). Jadi konversi yang benar & drop-in adalah **`real` → `doublePrecision`** (float8) — tetap `number` di JS, perilaku identik. **Tidak perlu `bigint`** (yang hanya relevan jika uang disimpan sebagai `integer`). Kolom `integer` yang tersisa semuanya hitungan kecil (qty, skor QC 0–100, cycle) → tetap `integer`.
>
> *Peningkatan masa depan (opsional): pindah uang ke `numeric` untuk presisi desimal eksak — perlu penanganan tipe string Drizzle, jadi bukan drop-in.*

**Contoh konversi (`schema/store.ts` — tabel `stores`):**
```ts
// SEBELUM (sqlite-core)
export const stores = sqliteTable("stores", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// SESUDAH (pg-core)
export const stores = pgTable("stores", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().$defaultFn(() => new Date()),
});
```

Ulangi untuk 9 file: `store, users, inventory, crm, hr, transactions, accounting, refurbish, audit`. `schema.ts` (barrel + relations) **tidak berubah**.

**Verifikasi Fase 2 (offline, tanpa DB):**
```bash
npx drizzle-kit generate   # hasilkan SQL Postgres dari schema — gagal jika ada tipe salah
npx tsc --noEmit           # pastikan kompilasi
```

---

## 5. Better-Auth (Fase 3)

Di `backend/src/lib/auth.ts`:
```ts
database: drizzleAdapter(db, {
  provider: "pg",   // dari "sqlite"
  schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
}),
```
Tidak ada perubahan lain — tabel `user/session/account/verification` ikut ter-`push` sebagai Postgres. (Password hash Better-Auth tetap; tidak ada user lama untuk dimigrasi.)

---

## 6. Adaptasi Harness Test ke Postgres (Fase 4)

Harness integrasi sekarang push skema SQLite. Untuk Postgres:
- **Lokal:** `supabase start` (Postgres via Docker) atau container `postgres:16`.
- `drizzle.config.test.ts`: `dialect: "postgresql"`, `url` = Postgres test (mis. `postgres://postgres:postgres@localhost:54322/postgres`).
- `tests/setup/integration-global-setup.ts`: jalankan `drizzle-kit push --config drizzle.config.test.ts` ke DB test; teardown drop schema/tabel.
- Mock `@/db` di test → `drizzle(postgres(TEST_URL, { max: 1 }), { schema })`.
- **CI** (`.github/workflows/ci.yml`) job backend: tambah service container:
  ```yaml
  services:
    postgres:
      image: postgres:16
      env: { POSTGRES_PASSWORD: postgres }
      ports: ["5432:5432"]
      options: >-
        --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5
  ```
- Isolasi tenant test tetap sama (seed org/store/user). FK Postgres enforced (sama seperti sekarang).

> Catatan: di Postgres, `db.transaction()` (interactive) jalan penuh — malah lebih realistis dari SQLite.

---

## 7. Gotchas Wajib Dicek (ringkasan)

1. **Connection pooler (6543, `prepare:false`) untuk runtime; DIRECT (5432) untuk migrasi.** #1 penyebab gagal di Vercel.
2. **Uang → `doublePrecision`** (kolom nominal sudah `real` di SQLite, jadi drop-in; `bigint` tidak diperlukan).
3. **`LIKE` case-sensitivity:** SQLite `LIKE` *case-insensitive* (ASCII); Postgres `LIKE` *case-sensitive*. Nomor invoice (`INV/...`, huruf besar) aman, tapi **pencarian nama/teks user → ganti `like()` → `ilike()`** agar perilaku tetap. Audit semua pemakaian `like(`.
4. **`db.run()` → `db.execute()`** (health check, dan skrip lain yang pakai `db.run`).
5. **Boolean & timestamp** kini tipe asli Postgres — filter `eq(col, true)` dan perbandingan tanggal tetap jalan via mode Drizzle.
6. **JSON as text** (`storeBanks`, `metadata`, `serialNumbers`) tetap `text` — boleh; migrasi ke `jsonb` opsional nanti.
7. **`crypto.randomUUID()`** di `$defaultFn` tetap jalan (dihitung di app). Alternatif DB-side: `gen_random_uuid()`.
8. **Konvensi env DB:** setelah pindah, `DATABASE_URL` (pooler) + `DIRECT_URL`. Bersihkan sisa `TURSO_*` (lihat item Critical ROADMAP yang sudah dibereskan).

---

## 8. Urutan Eksekusi & Gerbang Verifikasi

| Fase | Aksi | Gerbang lulus |
| --- | --- | --- |
| 0 | Buat project Supabase, set `DATABASE_URL`+`DIRECT_URL`, branch `feat/supabase-postgres` | env terisi |
| 1 | Ganti `db/index.ts` + `drizzle.config.ts`, `npm i postgres` | `tsc` hijau |
| 2 | Konversi 9 schema file (tipe + `bigint` uang) | `drizzle-kit generate` sukses + `tsc` hijau |
| 3 | Better-Auth `provider: "pg"` | `tsc` hijau |
| 4 | `drizzle-kit push` ke Supabase (pakai `DIRECT_URL`) | 47 tabel dibuat di Supabase |
| 5 | Adaptasi harness test → Postgres | `npm run test:integration` hijau |
| 6 | Audit `like`→`ilike`, `db.run`→`db.execute` | unit+integration hijau |
| 7 | Jalankan app dev end-to-end (login, buat transaksi) | smoke: sale→journal→stock OK |
| 8 | Deploy Vercel (env pooler), smoke prod | `/api/health/ready` 200 |

**Rollback:** karena di branch & belum ada data, rollback = kembali ke `main` (Turso). Tidak ada risiko data.

---

## 9. Sesudahnya (opsional, arah SaaS)
- **RLS** untuk isolasi tenant di level DB (jaring kedua atas storeId scoping). Dengan Better-Auth, terapkan via `SET LOCAL app.current_store = ...` per-transaksi.
- **Supabase Storage** menggantikan Vercel Blob (opsional).
- **Better-Auth organization plugin** saat mulai membangun multi-tenant SaaS.

---

### Ringkasan
Migrasi ini **terkontrol dan reversibel**: Drizzle & Better-Auth tetap, perubahan terbesar = konversi tipe schema (dengan **`bigint` untuk uang** sebagai detail paling kritis) + **connection pooler** untuk serverless. Bisa dikerjakan & diverifikasi sebagian **offline** sebelum menyentuh Supabase.
