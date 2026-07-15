# Migrasi Frontend → Next.js — Audit & Rencana Bertahap

> Status: **fondasi terpasang** (PR #12). Sudah hidup di app Next (di bawah basePath `/_/backend`): landing, catalog/[slug] (ISR+metadata+JSON-LD), nota/[id] & nota-servis/[id] (SSR+metadata), login, dan shell (admin) dengan 4 modul — Dashboard, Inventory, Customers, Suppliers. Diaudit penuh: Critical C1–C5 + Recommended R1–R6 selesai (tenant-filter store, apiFetch konsisten, cache() dedup, Suspense catalog, metadata landing, theme pre-paint, asset basePath + guard onError-loop). SPA Vite di root masih permukaan utama; modul lain menyusul per-PR.
>
> Tujuan akhir: melipat frontend Vite SPA ke dalam app Next.js yang **sudah ada** (`/backend`) — satu framework, satu deploy, satu domain. **Bukan** rewrite dari nol — ini konsolidasi.

---

## 0. TL;DR / Verdict

- **Destinasi: full Next.js (frontend + backend satu app). BERKOMITMEN selesai** — bukan sekadar halaman publik. Alasan utama bukan SSR/SEO, tapi **menghapus pajak maintenance dua-stack selama 3-5 tahun**: satu upgrade treadmill (React/TS/ESLint/Tailwind sekali, bukan dua kali), satu CI/deploy, satu mental model.
- **Metode: bertahap (strangler fig), bukan big-bang** — bahkan tanpa tekanan waktu. Alasan: **risiko** (modul finansial baru dikeraskan) + app **selalu jalan**.
- **Dua aliran nilai, dua timing:**
  - **Fase 1 — Halaman publik** (5 rute): nilai *front-loaded* (SEO, satu domain, auth same-origin). Kerjakan lebih dulu.
  - **Fase 2 — POS/back-office** (~22 rute): nilai maintenance **back-loaded — baru terbukukan saat `package.json` frontend DIHAPUS** (garis finish). Berhenti setelah Fase 1 = dapat SEO tapi dua stack tetap hidup, jadi pajaknya belum hilang. Karena itu Fase 2 **berkomitmen selesai**, dikerjakan sebagai pekerjaan latar per-modul.

---

## 1. Inventaris Rute (dari `src/App.tsx`)

### Publik (target Fase 1) — 5 rute
| Rute | Komponen | Catatan |
| --- | --- | --- |
| `/` | `LandingPage.tsx` | Marketing — SEO paling bernilai |
| `/catalog/:slug` | `PublicCatalog.tsx` | Katalog toko — SEO bernilai |
| `/nota/:id` | `PublicInvoice.tsx` | Nota transaksi publik (per-id) |
| `/nota-servis/:id` | `PublicServiceReceipt.tsx` | Nota servis publik (per-id) |
| `/login` | `Login.tsx` | Auth (better-auth client) |

### Privat (di balik `<Layout>` + login) — ~22 rute (target Fase 2 / opsional)
`/admin` `/dashboard` `/inventory` `/passports` `/transactions` `/piutang` `/hutang` `/customers` `/suppliers` `/services` `/opname` `/transfer` `/reports` `/settings` `/approvals` `/audit` `/payroll` `/procurement` `/crm` `/reconciliation` + redirect (`/technicians`, `/financial`) + `NotFound` (`*`).

---

## 2. Inventaris Touchpoint (angka nyata dari kode)

| Pola | Jumlah | File | Yang harus dilakukan di Next |
| --- | --- | --- | --- |
| `import.meta.env` | **180** | 59 | Mayoritas `import.meta.env.VITE_API_URL` untuk prefix `fetch`. **Same-origin di Next → cukup `fetch('/api/...')`, prefix bisa DIHAPUS** (bukan rename). Sisanya → `process.env.NEXT_PUBLIC_*`. |
| `localStorage` / `sessionStorage` | **214** | 37 | **Tetap jalan di Client Component** (`'use client'`). Hanya jadi masalah untuk halaman yang mau di-SSR (tak ada `window` di server) → pindah ke cookie, atau baca di `useEffect`. Untuk POS (client) → sebagian besar tak perlu diubah. |
| `react-router-dom` | 23 file | 23 | Ganti ke Next: `Link`→`next/link`, `useNavigate`→`useRouter()` (`next/navigation`), `useParams`→`useParams()` Next, `<Routes>`/`<Route>`→file-system routing. |
| `window.` / `document.` | tersebar | banyak | Aman di Client Component; untuk SSR harus di-guard (`useEffect`/`typeof window`). |

**Insight penting:** angka besar (180/214) **menakutkan di atas kertas tapi tidak seluruhnya "harus diubah".** Lift-and-shift POS jadi Client Component: mayoritas cukup tambah `'use client'` + swap import router + rapikan env. `localStorage`/`window` kebanyakan jalan apa adanya. Effort riil POS = **besar tapi mekanis**; ROI-nya yang rendah, bukan kesulitannya.

**Halaman publik jauh lebih ringan** (skope Fase 1):
| Halaman | `import.meta.env` | `localStorage` |
| --- | --- | --- |
| `PublicServiceReceipt` | 4 | 0 |
| `PublicInvoice` | 1 | 0 |
| `PublicCatalog` | 1 | 0 |
| `LandingPage` | 7 | 2 |
| `Login` | 1 | 5 |

Ketiga nota/katalog nyaris tanpa state browser — kandidat SSR bersih.

---

## 3. Perubahan Konfigurasi (Vite → Next)

| Sekarang (Vite) | Menjadi (Next) |
| --- | --- |
| `vite.config.ts` proxy `/api` → `localhost:3000/_/backend` | Hilang — same-origin, `fetch('/api/...')` |
| `vercel.json` dual-service + rewrite `/api/:match*` → `/_/backend/api/*` | Hilang — satu app, satu `routePrefix: /` |
| basePath `/_/backend` | **Dihapus** — backend pindah ke root app |
| `import.meta.env.VITE_*` | `process.env.NEXT_PUBLIC_*` (atau hapus untuk API same-origin) |
| `vite-plugin-pwa` (Workbox, manifest) | `@ducanh2912/next-pwa` / `next-pwa`, atau manifest manual + service worker |
| `BrowserRouter` + lazy `import()` | File-system routing App Router (`app/**/page.tsx`) |
| SWR `SWRConfig` global | Tetap bisa dipakai di Client Component; atau server fetch untuk halaman publik |
| `manualChunks` (xlsx/recharts/jspdf/...) | Next handle code-splitting otomatis; dynamic `import()` untuk lib berat |
| Path alias `@` → `src/` | `tsconfig` paths di app Next (`@/*`) |

---

## 4. Fase 1 — Halaman Publik (rencana per-PR)

Tujuan: satu domain + SEO untuk permukaan publik, **tanpa menyentuh modul finansial**.

- **PR 1 — Skeleton & routing publik.** Buat rute App Router di app Next untuk `/`, `/catalog/[slug]`, `/nota/[id]`, `/nota-servis/[id]`. Pindahkan komponen, tambah `'use client'` seperlunya, swap import `react-router-dom` → `next/navigation` + `next/link`. Fetch same-origin (`/api/...`). Verifikasi tiap halaman render (data sudah dari API publik yang ada: `api/public/*`).
- **PR 2 — SSR nota & katalog.** Ubah `nota/[id]`, `nota-servis/[id]`, `catalog/[slug]` jadi Server Component yang fetch di server (data per-id/slug) → HTML ter-render + `generateMetadata` untuk title/OG. Bagian interaktif (approve estimasi, rating) tetap Client Component anak.
- **PR 3 — Login same-origin.** Pindahkan `/login`; better-auth client point ke same-origin (hapus dua-domain `trustedOrigins`, `VITE_API_URL`). Verifikasi login + set cookie.
- **PR 4 — Landing + SEO.** Landing sebagai Server Component; metadata, sitemap, `robots.txt`. Ganti `vite-plugin-pwa` untuk permukaan publik bila perlu.
- **PR 5 — Potong dual-service.** Setelah publik stabil di Next: hapus `vercel.json` rewrite + `experimentalServices`, hapus basePath `/_/backend`, satu project Vercel, satu domain. **Titik tanpa-balik — lakukan setelah semua verifikasi hijau.**

Setiap PR: satu topik, di-verify (build + live via Chrome), bisa di-rollback.

---

## 5. Fase 2 — POS / Back-office (berkomitmen, pekerjaan latar)

- **Definisi selesai (finish line):** `package.json` frontend + Vite + `vite-plugin-pwa` + React Router **dihapus**. Di titik inilah pajak maintenance dua-stack benar-benar hilang — sebelum itu belum terbukukan.
- **Pendekatan:** per-modul (Inventory, Transactions, Services, Reports, …), tiap modul 1 PR. Lift-and-shift jadi Client Component: `'use client'`, swap router, rapikan env. SWR + `localStorage` sebagian besar tetap (jalan apa adanya di Client Component).
- **Sekuens:** pekerjaan latar di sela-sela fitur. **Tetap dahulukan fitur yang menaikkan nilai jual** — konsolidasi ini payoff nyata tapi tidak mendesak.
- **Guardrail:** jangan pernah kondisi "setengah pindah" berminggu-minggu. Dua permukaan hidup berdampingan (publik di Next, POS masih SPA) sampai satu modul benar-benar selesai & terverifikasi.
- **Kalibrasi jujur:** yang benar-benar hilang = Vite + double-upgrade tooling bersama + dua CI/deploy. Yang **tidak** hilang = lib berat (`recharts`, `jspdf`, `xlsx`, `@radix-ui`, `framer-motion`, SWR) — tetap dependency di app Next. Jadi penghematan = "tax steady moderat + kesederhanaan satu-stack", bukan ratusan jam. Tetap layak untuk komitmen 3-5 tahun.

---

## 6. Risiko & Guardrail

- **Modul finansial** (accounting, stok, invoice) baru dikeraskan + diverifikasi live. Migrasi POS menyentuh halaman yang memanggilnya → risiko regresi. Mitigasi: per-modul, integration test backend tetap jadi jaring pengaman (logika bisnis ada di `services/`, tidak ikut pindah).
- **PWA/offline**: bila diandalkan, uji ulang service worker di Next sebelum memotong Vite.
- **Auth session**: verifikasi cookie same-origin sebelum menghapus konfigurasi dua-domain.
- **Selalu punya app yang jalan**: jangan hapus permukaan Vite sampai penggantinya di Next terverifikasi.

---

## 7. Rekomendasi Akhir

Destinasi **berkomitmen: full Next.js satu stack** (alasan: maintenance jangka panjang solo dev). Kerjakan **Fase 1** dulu (dampak front-loaded, cakupan kecil, nol sentuhan finansial), lalu **Fase 2 per-modul sebagai pekerjaan latar** sampai `package.json` frontend dihapus — di situ pajak dua-stack baru benar-benar lunas. Selama perjalanan, prioritas utama tetap **fitur yang menaikkan nilai jual**; migrasi ini payoff compounding, bukan mendesak.
