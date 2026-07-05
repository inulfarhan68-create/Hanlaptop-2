import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { stores } from '@/db/schema/store';
import { technicians } from '@/db/schema/hr';

export const customers = sqliteTable("customers", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().default("default").references(() => stores.id, { onDelete: 'cascade' }),
    name: text("name").notNull(),
    phone: text("phone"),
    address: text("address"),
    notes: text("notes"),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }), // SOFT DELETE
}, (table) => ({
    storeIdIdx: index("customer_store_id_idx").on(table.storeId),
    phoneIdx: index("customer_phone_idx").on(table.phone),
}));

export const suppliers = sqliteTable("suppliers", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().default("default").references(() => stores.id, { onDelete: 'cascade' }),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    notes: text("notes"),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }), // SOFT DELETE
}, (table) => ({
    storeIdIdx: index("supplier_store_id_idx").on(table.storeId),
}));

export const serviceOrders = sqliteTable("service_orders", {
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
    estimatedCost: real("estimated_cost").default(0),
    finalCost: real("final_cost").default(0),
    receivedDate: integer('received_date', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    completedDate: integer('completed_date', { mode: 'timestamp' }),
    warrantyUntil: integer('warranty_until', { mode: 'timestamp' }),
    notes: text("notes"),
    warrantyClaimed: integer('warranty_claimed', { mode: 'boolean' }).default(false),
    originalTransactionId: text("original_transaction_id"),
    rating: integer("rating"),
    ratingComment: text("rating_comment"),
    ratingAt: integer('rating_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("service_orders_store_id_idx").on(table.storeId),
}));

export const buybackLeads = sqliteTable("buyback_leads", {
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
    estimatedMarketPrice: real("estimated_market_price").notNull().default(0),
    estimatedOfferPriceMin: real("estimated_offer_price_min").notNull().default(0),
    estimatedOfferPriceMax: real("estimated_offer_price_max").notNull().default(0),
    status: text("status").notNull().default('PENDING'),
    type: text("type").notNull().default('JUAL_LAPTOP'),
    targetLaptopName: text("target_laptop_name"),
    targetLaptopPrice: real("target_laptop_price"),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("buyback_leads_store_id_idx").on(table.storeId),
    statusIdx: index("buyback_leads_status_idx").on(table.status),
    typeIdx: index("buyback_leads_type_idx").on(table.type),
}));

export const membershipPoints = sqliteTable("membership_points", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    customerId: text("customer_id").notNull().unique().references(() => customers.id, { onDelete: 'cascade' }),
    points: real("points").notNull().default(0),
    history: text("history"),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    customerIdIdx: index("membership_points_customer_id_idx").on(table.customerId),
}));

export const crmReminders = sqliteTable("crm_reminders", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
    customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: 'cascade' }),
    customerPhone: text("customer_phone"),
    type: text("type").notNull(),
    scheduledDate: text("scheduled_date").notNull(),
    sentAt: integer('sent_at', { mode: 'timestamp' }),
    status: text("status").notNull().default('PENDING'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
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
