# BRIEF FASE 2 — Migrasi Transactions & Services ke Next.js App Router

> ✅ **SELESAI & HISTORIS.** Fase 2 (dan seluruh migrasi Vite→Next) rampung 2026-07-18 (`52fbc03`). Ini brief eksekusi historis — **jangan dijadikan instruksi berjalan**. Acuan terkini: [CLAUDE.md](CLAUDE.md).

> **Cara pakai:** paste seluruh isi file ini sebagai instruksi ke Antigravity. Ditulis berdasarkan audit nyata atas hasil Fase 1 — setiap "JANGAN" di sini adalah kesalahan yang **benar-benar terjadi** dan memakan waktu perbaikan. Ikuti persis; jangan berimprovisasi pada bagian yang sudah dibakukan.

---

## 0. Konteks singkat

Repo dua app: frontend Vite SPA (root `src/`, **masih permukaan utama untuk pengguna**) + backend Next.js 16 App Router (`backend/`, basePath `/_/backend`). Fase 1 sudah selesai & live: fondasi page-rendering, halaman publik, dan shell `(admin)` berisi **Dashboard, Inventory, Customers, Suppliers**.

**Tugas Fase 2: migrasi 2 modul — `Transactions` dan `Services` — ke app Next.** Ini modul **paling sensitif secara finansial** (uang, stok, jurnal, shift kasir). Utamakan benar daripada cepat.

Baca dulu: `MIGRATION_NEXTJS.md`, `CLAUDE.md`, `BUSINESS_RULES.md`.

---

## 1. Cakupan PERSIS (jangan melebar)

Migrasi **hanya** ini:

| Sumber (Vite) | Tujuan (Next) | Baris |
| --- | --- | --- |
| `src/pages/Transactions.tsx` | `backend/src/app/(admin)/transactions/{page.tsx,client.tsx}` | 291 |
| `src/pages/Services.tsx` | `backend/src/app/(admin)/services/{page.tsx,client.tsx}` | 1446 |
| `src/components/transactions/SalesTab.tsx` | `backend/src/components/transactions/` | 759 |
| `src/components/transactions/RestockTab.tsx` | idem | 641 |
| `src/components/transactions/TradeInTab.tsx` | idem | 594 |
| `src/components/transactions/ExpenseTab.tsx` | idem | 234 |
| `src/components/transactions/HistoryTab.tsx` | idem | 1038 |
| `src/components/transactions/PrintInvoicePortal.tsx` | idem | 295 |

> **JANGAN port `src/components/transactions/ServiceTab.tsx` (394 baris) — DEAD CODE.**
> Nol rujukan di seluruh `src/` dan `backend/src/`; tidak berubah sejak commit pertama repo. `Transactions.tsx` hanya mengimpor **6** tab (Sales, Restock, TradeIn, Expense, History, PrintInvoicePortal). Memindahkannya = membawa kode mati ke app baru, kebalikan dari tujuan konsolidasi.
> *(Versi awal brief ini keliru memasukkannya — daftar folder ≠ daftar import. **Selalu verifikasi lewat import, bukan isi direktori.**)*

**Lib yang perlu di-port** (belum ada di backend): `src/lib/printThermal.ts`, `src/lib/printServiceLabel.ts`, `src/lib/technician-data.ts`.

**Sudah ada di backend — PAKAI ULANG lewat `@/...`, JANGAN copy lagi dari `src/`:**
- `components/ShiftModal` → sudah mengekspor **`ShiftOpenModal` + `ShiftCloseModal`**. `Transactions` wajib mengimpor ini, bukan menyalin ulang.
- `components/ui/{button,card,input,autocomplete,badge,table,label,skeleton,confirm-dialog,modern-select,empty-state}`
- `lib/{api,utils,serviceParts,broadcast,session,app-url}`, `hooks/useUserRole`
- `components/{TenantProvider,ThemeProvider,Providers}`, `components/layout/*`

> Menyalin ulang komponen yang sudah ada menciptakan file kembar yang akan menyimpang diam-diam. Kalau butuh sesuatu yang mirip tapi beda, **tanya dulu**.

**DI LUAR CAKUPAN — jangan disentuh:** modul lain (Reports, Payroll, Settings, dll), SPA Vite di `src/` (biarkan hidup), `vercel.json`, penghapusan basePath, penghapusan `package.json` frontend. Itu PR terpisah nanti.

---

## 2. Pola WAJIB (sudah dibakukan di Fase 1 — ikuti persis)

### 2.1 Struktur halaman
```
app/(admin)/<modul>/page.tsx    -> Server Component: metadata + auth gate, TIDAK ADA "use client"
app/(admin)/<modul>/client.tsx  -> "use client": seluruh UI interaktif
```
`page.tsx` polanya persis seperti `app/(admin)/customers/page.tsx` yang sudah ada:
```tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";   // WAJIB — jangan panggil auth.api.getSession langsung
import XxxClient from "./client";

export const metadata = { title: "... | Han Laptop", robots: { index: false, follow: false } };

export default async function XxxPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <XxxClient user={session.user} />;
}
```
> `getSession()` di-`cache()` — layout dan page sama-sama gating, tanpa cache jadi 2× query DB per request.

### 2.2 Panggilan API — WAJIB `apiFetch`
```tsx
import { apiFetch } from "@/lib/api";
const res = await apiFetch(`/api/transactions`, { method: "POST", body: JSON.stringify(payload) });
```
**JANGAN PERNAH `fetch('/api/...')` mentah.** `apiFetch` yang menambahkan prefix basePath + header `x-store-id` + broadcast mutasi ke SWR. Di Fase 1 ada **25 pemanggilan `fetch` mentah** yang harus saya perbaiki: tanpa `x-store-id` mutasi bisa masuk ke store yang salah, tanpa broadcast cache jadi stale, dan di `next dev` 404 total.

Untuk SWR cukup key string; fetcher global sudah pakai `apiFetch`:
```tsx
const { data, mutate } = useSWR<Tx[]>('/api/transactions');
```

### 2.3 Aset statis — WAJIB `assetUrl`
```tsx
import { assetUrl } from "@/lib/utils";
<img src={assetUrl("/logo.png")} />
```
File taruh di `backend/public/`. **JANGAN** `src="/logo.png"` telanjang (404 di bawah basePath).
Kalau pakai `onError` fallback, **WAJIB** null-kan dulu:
```tsx
onError={(e) => { const img = e.target as HTMLImageElement; img.onerror = null; img.src = assetUrl("/logo.png"); }}
```
> Di Fase 1 fallback tanpa guard bikin **infinite request loop** yang membekukan halaman.

### 2.4 Routing
`react-router-dom` **dilarang** di `backend/`. Swap:
- `useNavigate()` → `useRouter()` dari `next/navigation`
- `<Link to>` → `<Link href>` dari `next/link`
- `useParams`/`useSearchParams` → dari `next/navigation`

`Transactions.tsx` & `Services.tsx` **keduanya** masih import `react-router-dom` — wajib dibersihkan.

### 2.5 URL absolut (canonical/OG/JSON-LD)
Pakai `getAppUrl()` dari `@/lib/app-url`. **JANGAN hardcode domain** (`hanlaptop.com` NXDOMAIN — pernah bikin canonical produksi menunjuk host mati).

---

## 3. ATURAN KERAS (langsung ditolak saat audit kalau dilanggar)

1. **Isolasi tenant.** Semua query data milik store WAJIB difilter `storeId` dari `authResult`/`userStoreAccess`. **JANGAN** `db.select().from(x)` tanpa filter lalu kirim ke client. Di Fase 1 `(admin)/layout.tsx` membocorkan **seluruh tabel `stores` semua tenant** ke setiap user login.
2. **Logika bisnis tetap di `backend/src/services/`**, bukan di komponen/route. Migrasi ini **UI saja** — `TransactionService`, `ServicePartsService`, `JournalMappingService` **JANGAN diubah/dipindah/di-refactor**. Kalau merasa perlu mengubahnya, **berhenti dan tanya**.
3. **JANGAN ubah API route** di `backend/src/app/api/**` kecuali murni bug. Kontraknya sudah dipakai SPA lama yang masih live — mengubahnya = merusak produksi.
4. **JANGAN sentuh skema DB / migrasi.** Tidak ada `db:generate`/`db:push` di tugas ini.
5. **Shift kasir**: `Transactions` punya guard shift (`ShiftOpenModal`, `enableCashierShift`, `activeShift`). Pertahankan **persis** — kasir tidak boleh transaksi tanpa shift terbuka.
6. **Uang/stok/jurnal**: jangan ubah perhitungan apa pun (HPP, diskon, DP/piutang, komisi, deduksi sparepart). Kalau ada yang tampak salah, **catat, jangan perbaiki diam-diam**.

---

## 4. Jebakan yang SUDAH TERBUKTI (jangan ulangi)

| # | Kesalahan nyata di Fase 1 | Aturan |
| --- | --- | --- |
| 1 | Dependency di-install tanpa tercatat → CI merah (`swr`, `recharts`, `xlsx`, dll) | **Selalu** `npm install <pkg>` (yang menulis ke `package.json`), lalu **commit `package.json` + `package-lock.json`**. |
| 2 | `react-is` phantom: build lokal hijau karena Turbopack **meminjam dari `node_modules` frontend** | **Build lokal bisa berbohong.** Uji dengan `rm -rf node_modules && npm ci` di `backend/` sebelum yakin. |
| 3 | `"type": "module"` mematahkan script CJS `postinstall` | Script Node ad-hoc **harus `.cjs`**. Jangan ubah `"type"`. |
| 4 | `turbopack.root` di-hardcode path Windows absolut | **Tidak boleh** path absolut mesin di config. |
| 5 | Test baru ditaruh di `tests/` → **diam-diam tidak jalan** | Unit test **wajib** di `backend/tests/unit/**`, integration di `backend/tests/integration/**`. Cek jumlah test bertambah. |
| 6 | `backend/public/` tidak ada → semua aset 404 | Aset yang dipakai → copy ke `backend/public/`. |
| 7 | Junk ikut ter-commit (`.agents/`, `check_users.js`, `task.md`, `tsbuildinfo`) | Commit **hanya** file migrasi. Cek `git status` sebelum commit. |

**Deps yang modul ini butuh & BELUM tercatat di `backend/package.json`:** `qrcode` (dipakai `printServiceLabel`/`printThermal`). Cek juga `@types/qrcode`. **`jspdf` TIDAK dipakai modul ini — jangan tambahkan.**

---

## 5. Catatan teknis khusus modul ini

- **`localStorage`**: `Services.tsx` (14×), `Transactions.tsx` (3×), `HistoryTab.tsx` (7×). Aman di Client Component — **biarkan apa adanya**, jangan pindah ke cookie. Pastikan **tidak** dipanggil di body render (hanya di `useEffect`/handler), supaya SSR tidak pecah.
- **`useSearchParams`**: kedua halaman **tidak** memakainya → tidak perlu `<Suspense>`. Kalau Anda menambahkannya, wajib bungkus `<Suspense>`.
- **`window`/`print`**: `PrintInvoicePortal`, `printThermal`, `printServiceLabel` pakai `window`/`document`. Pastikan hanya di handler/`useEffect`, bukan di render body.
- **`Services.tsx` (1446 baris)** adalah yang terbesar & terumit (Kanban FSM, drag-drop, sparepart, WA template, checkout Diambil). Kerjakan **terakhir**, dan pertahankan FSM transisi status apa adanya (validasi sesungguhnya ada di server).
- **Toast**: pakai `sonner` — `<Toaster>` sudah dipasang global di `Providers`. Jangan pasang lagi.

---

## 6. Urutan kerja yang diminta (1 PR per langkah)

1. **PR A — port lib & deps.** `printThermal`, `printServiceLabel`, `technician-data` ke `backend/src/lib/`; tambah dep `qrcode` (+ `@types/qrcode`). Tidak ada halaman baru. Verifikasi: `npm ci` bersih → `tsc` → `build`.
   > **Aset: tidak perlu copy apa pun.** `logo-print.png` dan `ttd.png` **sudah ada** di `backend/public/` (dibawa saat Fase 1); `printThermal`/`printServiceLabel` tidak merujuk aset hardcoded sama sekali. Yang perlu dikerjakan justru di PR B: bungkus rujukan `"/logo-print.png"` & `"/ttd.png"` di `PrintInvoicePortal.tsx` dengan `assetUrl()`.
   > **`qrcode` wajib mendarat di PR A** — dipakai `printThermal` + `printServiceLabel` (PR A) **dan** `PrintInvoicePortal` (PR B). Telat = PR B gagal build.
2. **PR B — Transactions.** Port `transactions/*` tabs + `page.tsx`/`client.tsx`. Rute: `/_/backend/transactions`.
3. **PR C — Services.** Port `Services.tsx` → `page.tsx`/`client.tsx`.

Setiap PR: kecil, satu topik, CI hijau, bisa di-rollback. **Jangan** satu PR raksasa untuk semuanya.

---

## 7. Definition of Done (saya akan audit tepat pada poin-poin ini)

Sebelum bilang "selesai", **buktikan** semua ini:

- [ ] `cd backend && rm -rf node_modules .next && npm ci && npx tsc --noEmit && npm test && npm run build` → **semua hijau** (ini menangkap phantom deps & test yang tak terkoleksi)
- [ ] `grep -rn "fetch('/api\|fetch(\`/api" backend/src` → **0 hasil** (semua lewat `apiFetch`)
- [ ] `grep -rn "react-router-dom" backend/src` → **0 hasil**
- [ ] `grep -rn "import.meta.env" backend/src` → **0 hasil**
- [ ] Tidak ada `db.select()` tanpa filter `storeId` di kode baru
- [ ] `git status` bersih dari junk sebelum commit
- [ ] **QA nyata di `npm run dev`** (jangan cuma build): buka `/_/backend/transactions` & `/_/backend/services`, cek console **tidak ada error**, dan laporkan apa yang benar-benar Anda lihat
- [ ] SPA lama di root **masih utuh** (`/transactions`, `/services` versi Vite tetap jalan)
- [ ] Laporkan file yang diubah + alasannya; **jangan** klaim sesuatu terverifikasi kalau belum dijalankan

---

## 8. Kalau ragu

**Berhenti dan tanya.** Lebih baik bertanya daripada:
- mengubah logika finansial "supaya rapi",
- me-refactor service/API yang sudah jalan,
- menghapus kode yang tampak tak terpakai,
- menambah dependency baru yang tidak diminta.

Semua itu akan ditolak saat audit dan harus dikerjakan ulang.
