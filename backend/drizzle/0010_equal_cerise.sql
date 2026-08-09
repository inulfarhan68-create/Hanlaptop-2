-- IF NOT EXISTS because the column already exists in at least one environment:
-- it was applied outside the migration runner (a `db:push`, which records
-- nothing), so this file is pending while its effect is already there. Without
-- the guard the next `db:migrate` aborts on "column already exists" — and takes
-- every later migration down with it, including 0009, which is still unapplied.
ALTER TABLE "transaction_items" ADD COLUMN IF NOT EXISTS "description" text;
