import { pgTable, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { organizations } from '@/db/schema/store';

/**
 * SaaS subscription plans (pricing tiers).
 *
 * Feature gating is **first-class and module-level**: a plan carries a `features`
 * JSON map ({"inventory":true,"accounting":false,...}) so code gates on
 * `hasFeature(plan, "payroll")` — never `plan.key === "business"`. Changing a
 * plan's price or renaming a tier therefore never ripples through the codebase.
 * Feature keys + per-plan defaults live in `@/lib/features`.
 *
 * Later phases add `subscriptions`, `subscriptionEvents`, `usageCounters`, and
 * `invoices` to this file; kept out of the first migration to stay contained.
 */
export const plans = pgTable("plans", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    // Stable machine key (starter | business | growth | internal). Seeds and UI
    // reference this, not the display name (which is free to change).
    key: text("key").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    // Monthly price in IDR (integer rupiah). 0 for free/internal plans, NULL for
    // custom-priced tiers (Enterprise → "Hubungi kami").
    priceMonthly: integer("price_monthly"),
    // Quotas — NULL means unlimited.
    maxStores: integer("max_stores"),
    maxUsers: integer("max_users"),
    maxTransactionsPerMonth: integer("max_transactions_per_month"),
    storageLimitMb: integer("storage_limit_mb"),
    // Module feature flags as a JSON string, e.g. {"inventory":true,"payroll":false}.
    // Missing keys default to false via hasFeature(). Stored as text (matches the
    // codebase convention of JSON-in-text columns, e.g. storeSettings.storeBanks).
    features: text("features").notNull().default("{}"),
    // Whether the plan is currently offered (false = grandfathered/retired).
    isActive: boolean("is_active").notNull().default(true),
    // Whether the plan shows on the public pricing page (internal/unlimited = false).
    isPublic: boolean("is_public").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
});

export const subscriptions = pgTable("subscriptions", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    planKey: text("plan_key").notNull().references(() => plans.key),
    status: text("status", { enum: ['trialing', 'active', 'past_due', 'canceled', 'unpaid'] }).notNull().default('trialing'),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
});

export const subscriptionEvents = pgTable("subscription_events", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    type: text("type").notNull(), // e.g. trial_started, upgraded, payment_failed, canceled
    payload: text("payload"), // JSON payload
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
});

export const usageCounters = pgTable("usage_counters", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    resource: text("resource").notNull(), // e.g. transactions
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
});

export const invoices = pgTable("invoices", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    amount: integer("amount").notNull(), // in IDR
    status: text("status", { enum: ['unpaid', 'paid', 'void'] }).notNull().default('unpaid'),
    description: text("description"),
    paymentUrl: text("payment_url"), // e.g. Midtrans/Xendit checkout URL (stub)
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
});
