# GO_LIVE_CHECKLIST.md — Supabase Production Cutover

Practical, checkbox runbook for taking the Supabase Postgres migration to production. Companion to [MIGRATION_SUPABASE.md](MIGRATION_SUPABASE.md) (the technical migration) and [DEPLOYMENT.md](DEPLOYMENT.md) (general Vercel deploy).

> Because the app was migrated **pre-launch with no data**, there is no data migration and rollback is trivial.

---

## 0. Pre-merge (done ✅)
- [x] PR green in CI — `tsc`, `next build`, `vite build`, 18 unit + 3 integration tests (integration ran against a `postgres:16` service container)
- [x] Verified end-to-end on Supabase: 47 tables, login, inventory read, POS sale → **balanced trial balance**

---

## 1. Vercel environment variables
Set in **Project Settings → Environment Variables** (Production, and Preview if you use it):

| Var | Value | Notes |
| --- | --- | --- |
| `DATABASE_URL` | transaction pooler, port **6543** | Runtime. Code sets `prepare:false` for pgBouncer transaction mode. |
| `DIRECT_URL` | session pooler, port **5432** (`…pooler.supabase.com`) | Migrations (`drizzle-kit`). **Not** the `db.<ref>.supabase.co` direct host — that's IPv6-only and fails on many networks/CI. |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` | Required at runtime in production. |
| `BETTER_AUTH_URL` | `https://<your-domain>` | Correct auth cookies/redirects. |
| `GEMINI_API_KEY` | your key | AI features (import-nota, pricing). |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | optional | Error monitoring. |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | optional | Enables the **distributed** rate limiter (else in-memory LRU per instance). |
| `CRON_SECRET` | optional but recommended | Required to call `/api/cron/*` in prod (fail-closed). |
| Backup: `BACKUP_STORAGE`, `AWS_*` / `CLOUDFLARE_*` | optional | For automated backups. |

---

## 2. Push schema to the production Supabase project
Only if prod uses a **different** Supabase project than the one already pushed:
```bash
cd backend
DIRECT_URL="<prod session pooler url>" npx drizzle-kit push --config drizzle.config.ts
```
- [ ] Confirms 47 tables created.

---

## 3. Deploy
- [ ] Merge the PR → Vercel auto-deploys (or `vercel --prod`).
- [ ] Build logs green (both frontend `/` and backend `/_/backend`).

---

## 4. Production smoke test
Health (no auth):
- [ ] `GET /api/health/ready` → 200; `database: healthy`, `environment: healthy`

Auth:
- [ ] First owner exists (see §5) and can **log in**.

Inventory:
- [ ] Inventory list loads; add/edit an item persists.

POS / Sales:
- [ ] Create a **sale** → stock decrements, invoice `INV/YYYY/MM/NNN` generated.
- [ ] (If SN-tracked) serial numbers required = quantity.

Accounting:
- [ ] **Trial balance** balances (total debit = total credit).
- [ ] Income statement / balance sheet render with the sale reflected.

Services / Warranty / CRM:
- [ ] Create a service order; create a customer.

Ops:
- [ ] Backup cron (if configured): `GET /api/cron/backup` with `Authorization: Bearer <CRON_SECRET>` → 200.

Security (multi-tenant):
- [ ] A non-owner scoped to store A **cannot** read store B data.
- [ ] A `kasir` user does **not** see `costPrice` on inventory.

---

## 5. First-tenant bootstrap
1. **Create the first owner.** Sign up the admin account, then ensure its `role = owner` (sign-up defaults to `kasir`). Then log in.
2. **Create your store in the UI.** Store creation now **auto-seeds** the 72-account Chart of Accounts + current fiscal period (`seedStoreCoa`), so accounting works immediately.
3. Add inventory and you're live.

> ⚠️ Security follow-up: email/password **sign-up is open** by default. For an internal ERP, restrict or disable public sign-up once your accounts exist.

---

## 6. Rollback (if needed)
- Revert the merge / redeploy the previous Vercel build, **or** point env back to the pre-migration commit (Turso).
- No data migration was performed, so there is nothing to un-migrate.

---

## 7. Post-stability follow-ups (after a few stable days)
- [ ] Delete the obsolete SQLite/Turso one-off scripts (`backend/**/migrate-*.ts`, `inspect_*.ts`, etc.) — kept as reference until prod is proven.
- [ ] Enable Upstash Redis so rate limiting works across serverless instances.
- [ ] Consider **RLS** (Row-Level Security) for defense-in-depth tenant isolation.
- [ ] Chip away at the pre-existing ESLint debt (~1.9k warnings/errors, unrelated to this migration).
- [ ] Move money columns to `numeric` if exact-decimal accounting is ever required (currently `doublePrecision`, fine for whole-Rupiah).
