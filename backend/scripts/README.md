# backend/scripts

One-off operational and debugging scripts. These are **not** part of the app build:
`tsconfig.json` only includes `src/**`, so nothing here is type-checked or bundled,
and CI never runs it.

## Running

Run from the **`backend/` directory**, not from here:

```bash
npx tsx scripts/db-check.ts
```

That matters: the scripts that call `dotenv.config({ path: "./.env" })` resolve the
env file relative to the current working directory, so running them from anywhere
else silently loads no configuration. The ones that build their path from
`__dirname` (`path.join(__dirname, "..", ".env")`) work either way.

Some load no env at all — `clear.ts`, `db-check.ts`, `inspect_jul_sales.ts`,
`seed-dummy.ts`, `query_jul.js`. They expect `DATABASE_URL` to already be in the
environment and otherwise fail with *"DATABASE_URL or DIRECT_URL is required"*.
Supply it inline or via a loader:

```bash
npx dotenv -e .env.local -- npx tsx scripts/db-check.ts
```

> ⚠️ Most of these write to whatever `DATABASE_URL` points at. Check which database
> you are pointed at before running anything that seeds, clears or fixes data.

## What's here

| Script | Purpose |
| --- | --- |
| `create-admin.ts` | Create an admin user. |
| `grant_store_access.ts` | Grant a user access to a store (`userStoreAccess`). |
| `populate_slugs.ts` | Backfill catalog slugs. |
| `db-check.ts` | Dump the `user` table — quick "is the DB reachable and seeded" check. |
| `db-inspect.ts` | Inspect users, store access and stores together. |
| `seed-dummy.ts` | Add extra dummy inventory/transactions **without** deleting existing rows. |
| `debug-seed.ts` | Drive `DemoSeeder` against a real store, for debugging demo data. |
| `clear.ts` | ⚠️ Delete transactions, transaction items, journal entries and inventory. |
| `test-reset.ts` | Exercise the reset path. |
| `test-business-logic.ts` | Seed a mock org/store/user and run business-logic checks. |
| `test-ai-parser.ts` | Try the Gemini invoice-parsing prompt against a document (needs `GEMINI_API_KEY`). |
| `inspect_jul_sales.ts` | Ad-hoc: cross-check July journals against transactions. |
| `query_jul.js` | Ad-hoc: group July journal entries by account name. |
| `fix-rizaldy.ts` | Ad-hoc: repair one user's store access. |
| `reset_inulfarhan.ts` | Ad-hoc: reset one specific account. |
| `_security_check.cjs` | Ad-hoc security sweep. |

The bottom group is throwaway debugging from past incidents, kept only because the
queries are occasionally handy to crib from. Deleting them loses nothing that git
history doesn't already hold.

## Not in here

- `patch-kysely.cjs` stays at the backend root — `package.json`'s `postinstall`
  runs it by that path.
- `src/db/reset-tables.ts` is application code: `app/api/reset/route.ts` imports it.
- `src/db/seed.ts`, `seed-coa.ts`, `seed-plans.ts`, `seed-demo-tenant.ts` are
  referenced by npm scripts and the test global-setup.
