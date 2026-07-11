import { pgTable, text, integer, doublePrecision, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { stores } from '@/db/schema/store';
import { technicians } from '@/db/schema/hr';

export const customers = pgTable("customers", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().default("default").references(() => stores.id, { onDelete: 'cascade' }),
    name: text("name").notNull(),
    phone: text("phone"),
    address: text("address"),
    notes: text("notes"),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }), // SOFT DELETE
}, (table) => ({
    storeIdIdx: index("customer_store_id_idx").on(table.storeId),
    phoneIdx: index("customer_phone_idx").on(table.phone),
}));

export const suppliers = pgTable("suppliers", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().default("default").references(() => stores.id, { onDelete: 'cascade' }),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    notes: text("notes"),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }), // SOFT DELETE
}, (table) => ({
    storeIdIdx: index("supplier_store_id_idx").on(table.storeId),
}));

export const serviceOrders = pgTable("service_orders", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().default("default").references(() => stores.id, { onDelete: 'cascade' }),
    customerId: text("customer_id").references(() => customers.id, { onDelete: 'set null' }),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone"),
    customerAddress: text("customer_address"),
    deviceName: text("device_name").notNull(),
    issue: text("issue").notNull(),
    status: text("status").notNull().default('Diterima'),
    technicianName: text("technician_name"),
    technicianId: text("technician_id").references(() => technicians.id, { onDelete: 'set null' }),
    estimatedCost: doublePrecision("estimated_cost").default(0),
    finalCost: doublePrecision("final_cost").default(0),
    receivedDate: timestamp('received_date', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
    completedDate: timestamp('completed_date', { withTimezone: true }),
    warrantyUntil: timestamp('warranty_until', { withTimezone: true }),
    notes: text("notes"),
    warrantyClaimed: boolean('warranty_claimed').default(false),
    originalTransactionId: text("original_transaction_id"),
    rating: integer("rating"),
    ratingComment: text("rating_comment"),
    ratingAt: timestamp('rating_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("service_orders_store_id_idx").on(table.storeId),
}));

export const buybackLeads = pgTable("buyback_leads", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().default("default").references(() => stores.id, { onDelete: 'cascade' }),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    brand: text("brand").notNull(),
    processor: text("processor").notNull(),
    ram: text("ram").notNull(),
    storage: text("storage").notNull(),
    condition: text("condition").notNull(),
    completeness: text("completeness").notNull(),
    estimatedMarketPrice: doublePrecision("estimated_market_price").notNull().default(0),
    estimatedOfferPriceMin: doublePrecision("estimated_offer_price_min").notNull().default(0),
    estimatedOfferPriceMax: doublePrecision("estimated_offer_price_max").notNull().default(0),
    status: text("status").notNull().default('PENDING'),
    type: text("type").notNull().default('JUAL_LAPTOP'),
    targetLaptopName: text("target_laptop_name"),
    targetLaptopPrice: doublePrecision("target_laptop_price"),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("buyback_leads_store_id_idx").on(table.storeId),
    statusIdx: index("buyback_leads_status_idx").on(table.status),
    typeIdx: index("buyback_leads_type_idx").on(table.type),
}));

export const membershipPoints = pgTable("membership_points", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    customerId: text("customer_id").notNull().unique().references(() => customers.id, { onDelete: 'cascade' }),
    points: doublePrecision("points").notNull().default(0),
    history: text("history"),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    customerIdIdx: index("membership_points_customer_id_idx").on(table.customerId),
}));

export const crmReminders = pgTable("crm_reminders", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
    customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: 'cascade' }),
    customerPhone: text("customer_phone"),
    type: text("type").notNull(),
    scheduledDate: text("scheduled_date").notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    status: text("status").notNull().default('PENDING'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("crm_reminders_store_id_idx").on(table.storeId),
    customerIdIdx: index("crm_reminders_customer_id_idx").on(table.customerId),
    statusIdx: index("crm_reminders_status_idx").on(table.status),
}));

export const serviceOrdersRelations = relations(serviceOrders, ({ one }) => ({
    store: one(stores, {
        fields: [serviceOrders.storeId],
        references: [stores.id],
    }),
    customer: one(customers, {
        fields: [serviceOrders.customerId],
        references: [customers.id],
    }),
    technician: one(technicians, {
        fields: [serviceOrders.technicianId],
        references: [technicians.id],
    }),
}));

export const buybackLeadsRelations = relations(buybackLeads, ({ one }) => ({
    store: one(stores, {
        fields: [buybackLeads.storeId],
        references: [stores.id],
    }),
}));

export const membershipPointsRelations = relations(membershipPoints, ({ one }) => ({
    customer: one(customers, {
        fields: [membershipPoints.customerId],
        references: [customers.id],
    }),
}));

export const crmRemindersRelations = relations(crmReminders, ({ one }) => ({
    store: one(stores, {
        fields: [crmReminders.storeId],
        references: [stores.id],
    }),
    customer: one(customers, {
        fields: [crmReminders.customerId],
        references: [customers.id],
    }),
}));
