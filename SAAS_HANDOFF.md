# SAAS_HANDOFF.md — turning Han Laptop ERP into multi-tenant SaaS

Portable handoff for continuing the SaaS build in any environment (this repo is self-contained). Companion to [ROADMAP.md](ROADMAP.md) & [CLAUDE.md](CLAUDE.md). Written 2026-07-19.

## Status snapshot

| Item | State |
| --- | --- |
| Migrasi Vite→Next | ✅ SELESAI (single-app Next di `backend/`, live) |
| **Fase 1 — plans + feature-flags + landing/pricing** | ✅ MERGED (PR #34, main `6f9ca26`) — pricing **v1** |
| **Pricing v2** (tier granular + add-ons) | ⏳ **PR #35 OPEN, CI hijau — MERGE INI DULU.** main masih pricing v1 sampai #35 di-merge |
| **Fase 2a — org-aware core** | 🔧 di PR `feat/saas-phase2-isolation` (schema `user.organizationId`, `platform_admin`, `AuthContext` org-aware, `getOrgStoreIds`/`requirePlatformAdmin`/`storeScope`, fix hardcode `org-default`, skrip backfill). Additif — perilaku single-org tak berubah |
| **Fase 2b — scope 64 query** | ⏳ WAJIB sebelum Register: ganti 154 situs `storeId !== "all" ? eq() : undefined` → `storeScope()`. Mekanis |
| Fase 3–7 | belum mulai |

Cabang: `feat/saas-pricing-v2` (= PR #35). Setelah merge, hapus cabang & lanjut Fase 2.

## Keputusan produk (JANGAN dilitigasi ulang)

- **Tenant = tabel `organizations`.** Billing/plan/usage menempel di sini.
- **Billing scaffold-first** — model plan/subscription/invoice + gating, TANPA gateway live. Seam Midtrans/Xendit = stub. (Jangan tangani kredensial pembayaran asli.)
- **Landing SaaS di `/product`** (route group `(marketing)`). `/` tetap storefront Han Laptop (tenant flagship). JANGAN ubah `/`.
- **Platform super-admin**: peran baru `platform_admin` = satu-satunya peran global sejati.
- **⚠️ Isolasi-core WAJIB sebelum Register live** (lihat Fase 2). Tanpa itu, tenant ke-2 bocor lihat data tenant lain.
- **AI = add-on** (biaya variabel), bukan flag tier. Sudah tak ada di tier mana pun.
- **Storage murah → JANGAN di-gate.** Foto katalog = `inventory.imageUrl` (1/item, opsional, gate `isPublished`). Cleanup saat item dihapus/qty-0-manual sudah ada; jalur JUAL tidak → follow-up opsional: kompres upload di `api/upload/route.ts` (pakai sharp).
- **Feature flags kelas-satu** (`backend/src/lib/features.ts`): gate `hasFeature(plan, "service")`, JANGAN `plan.key === "pro"`.
- **Akuntansi**: mesin jurnal jalan di SEMUA plan (integritas data); yang di-gate hanya UI laporan/COA. **POS jual+jasa (Starter) ≠ Modul Servis (Pro)** — Starter bisa tagih jasa di kasir, work-order penuh di Pro.

## Pricing v2 (di PR #35 — sumber kebenaran `PLAN_SEED` di `lib/features.ts`)

Starter Rp69k (1u/1cabang) · **Pro Rp159k (3u/1cabang) "Paling Populer"** · Business Rp349k (10u/3cabang) · Enterprise Custom (∞). Fitur kumulatif granular (37 flag): Starter core ops → Pro (servis, katalog, buyback, akuntansi, tim) → Business (multi-cabang, kontrol operasional, akuntansi lanjutan, HR) → Enterprise (API, white-label). Add-on: AI OCR, AI Pricing, Storage, WhatsApp API, Custom Domain. Angka dikunci `tests/unit/features.test.ts`.

## Roadmap (GTM-order; isolasi-core disisipkan sebelum Register)

1. ✅ Plans + feature-flags + landing `/product` + pricing + `/register` placeholder.
2. **Isolasi-core** (kritis — detail di bawah).
3. Register + onboarding self-serve (aman setelah #2).
4. Enforcement feature-flag (`hasFeature` di UI+API) + usage-limit (soft 80/90/100).
5. Subscription lifecycle + billing scaffold (+`subscriptionEvents`, email-queue, jobs — semua stub).
6. Super-admin console + impersonation (teraudit, time-boxed, banner) + announcements.
7. 3 dummy tenant (Han Laptop bekas / Bandung Laptop servis / Demo Komputer retail) + demo read-only + E2E hardening.
*(Nanti: beta 10–20 tenant → Midtrans/Xendit go-live di balik seam → invoice PDF, analytics.)*

## FASE 2 — Isolasi-core (spec detail, security-critical)

**Masalah sekarang (single-tenant terselubung):**
- `api/stores/route.ts` **hardcode `organizationId: 'org-default'`** → cuma 1 org.
- `lib/auth-guard.ts`: `session.user.role === "owner"` = **GLOBAL** (`storeId:"all"` lintas SEMUA org; `requirePermission` bypass total). Aman untuk 1 tenant, BOCOR untuk banyak.

**2a — SUDAH DIKERJAKAN** (PR `feat/saas-phase2-isolation`, additif & aman — single-org tak berubah):
1. ✅ `platform_admin` di `permissions.ts` (all-perms). `owner` = tenant-scoped.
2. ✅ `user.organizationId` (kolom nullable, migrasi `0005`) + `auth.ts` additionalFields (ikut ke sesi).
3. ✅ `auth-guard.ts`: `AuthContext` kini bawa `organizationId`, `isPlatformAdmin`, `accessibleStoreIds` (null=platform_admin global; owner=semua store org-nya via `getOrgStoreIds`; lain=store-nya). Guard `requirePlatformAdmin()`. Helper **`storeScope(authResult, col)`** (null→undefined; kosong→`sql\`false\``; else `inArray(col, ids)`).
4. ✅ `api/stores`: pakai `authResult.organizationId` (fallback `org-default`).
5. ✅ Backfill: `src/db/migrate-tenancy.ts` — jalankan sekali `PLATFORM_ADMIN_EMAIL=you@x.com tsx src/db/migrate-tenancy.ts` (rename org-default→Han Laptop, backfill user.organizationId, tunjuk platform_admin). Idempoten.

⚠️ **Sengaja BELUM diubah** (aman single-org, ubah di 2b): bypass `requirePermission` untuk `owner` masih ada. Link subscription/plan Han Laptop = fase billing.

**2b — SISA (mekanis, WAJIB sebelum Register live):**
- Ganti tiap situs `authResult.storeId !== "all" ? eq(col, authResult.storeId) : undefined` (+ varian `=== "all"`) → **`storeScope(authResult, col)`** dari `@/lib/auth-guard`, bungkus di `and(...)`. **154 baris di 64 file** (`grep -rn '"all"' src/app/api src/services`). Untuk platform_admin tak memfilter (global); untuk tenant dibatasi ke store org-nya.
- Ubah bypass `requirePermission`: `if (globalRole === "owner")` → `if (authResult.isPlatformAdmin)`.
- **Tes + CI**: perluas `tests/e2e/multi-tenant.spec.ts` → cross-ORG (owner org A tak lihat data org B). Wire Playwright ke `.github/workflows/ci.yml` (20 e2e keamanan yang ada BELUM di CI).

## Konvensi & file kunci (ikuti pola)

- Feature flags: `backend/src/lib/features.ts` (`hasFeature`, `FEATURES`, `PLAN_SEED`, `buildFeatures`). Loader publik: `lib/public/plans.ts` (fallback ke `PLAN_SEED` kalau tabel kosong). Seed: `db/seed-plans.ts`.
- Guard: `requireX() → AuthContext | NextResponse`, WAJIB narrow `if (x instanceof NextResponse) return x;` (`lib/auth-guard.ts`).
- Schema baru: `db/schema/saas.ts` (sudah ada `plans`; tambah `subscriptions`/`subscriptionEvents`/`usageCounters`/`invoices` di fase-nya) + daftar di barrel `db/schema.ts` + relations.
- UI: halaman admin = `app/(admin)/<modul>/page.tsx` (Server, gate `getSession()`) + `<modul>-client.tsx`. Client pakai `apiFetch` (bukan `fetch`) & `useSessionUser()` (bukan `useSession()` — crash SSR). Reuse `seedStoreCoa` (`db/seed-coa.ts`) untuk tiap store baru.
- DB: edit `db/schema/*` → `npm run db:generate` (commit file migrasi) → `npm run db:migrate`. **JANGAN `db:push` ke DB shared.**

## Gotchas (biar tak buang waktu)

- **`npm run dev` error resolve `../../tailwind.config.js`** = cache `.next` basi (pasca ubah `turbopack.root` di #31), BUKAN bug. Fix: **`rm -rf backend/.next`** lalu `npm run dev`. Build produksi selalu benar.
- **CI adalah gerbang jujur.** Build lokal bisa "hijau palsu" (phantom dependency era dua-app sudah tak relevan, tapi tetap: `npm ci` bersih di CI yang benar). CI jalan pada PR/push ke main saja.
- **Isolasi `storeId`/`organizationId`**: tiap query data milik store/org WAJIB filter — ini inti keamanan multi-tenant.
- Verifikasi: `cd backend`, `npm install`, `npx tsc --noEmit`, `npm test`, `npm run test:integration` (butuh Postgres), `npm run build`. Halaman previewable → jalankan `npm run dev` & cek di browser.

## Cara lanjut
1. Merge PR #35 (pricing v2) → `git checkout main && git pull`.
2. `git checkout -b feat/saas-phase2-isolation`, kerjakan Fase 2 spec di atas.
3. Satu fase = satu PR: port/build → tsc+test+build → QA → PR → CI hijau → merge.
