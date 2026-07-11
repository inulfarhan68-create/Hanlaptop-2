import { pgTable, text, timestamp, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from '@/db/schema/users';

export const organizations = pgTable("organizations", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
});

export const stores = pgTable("stores", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    name: text("name").notNull(),
    address: text("address"),
    phone: text("phone"),
    slug: text("slug"),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    slugIdx: uniqueIndex("store_slug_idx").on(table.slug),
}));

export const userStoreAccess = pgTable("user_store_access", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
    storeId: text("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
    role: text("role").notNull().default('kasir'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    userIdIdx: index("user_store_access_user_idx").on(table.userId),
    storeIdIdx: index("user_store_access_store_idx").on(table.storeId),
}));

export const storeSettings = pgTable("store_settings", {
    storeId: text("store_id").primaryKey().default("default").references(() => stores.id, { onDelete: 'cascade' }),
    storeName: text("store_name").notNull().default("HanLaptop"),
    storeAddress: text("store_address").notNull().default("Jl. Komputer Raya No.123"),
    storePhone: text("store_phone").notNull().default("0812-3456-7890"),
    storeLogo: text("store_logo"),
    storeSignature: text("store_signature"),
    storeFooter: text("store_footer").default("Terima kasih atas kunjungan Anda.\nBarang yang sudah dibeli\ntidak dapat ditukar/dikembalikan."),
    waTemplatePiutang: text("wa_template_piutang").default("Halo Kak {nama}, sekadar mengingatkan bahwa ada tagihan dari *{toko}* untuk nota *{nota}* senilai *{sisa}* yang jatuh tempo pada *{tempo}*. Terima kasih."),
    waTemplateUmum: text("wa_template_umum").default("Halo Kak {nama}, ini dengan *{toko}*. "),
    waTemplateNota: text("wa_template_nota"),
    waTemplateServiceDiterima: text("wa_template_service_diterima"),
    waTemplateServiceDikerjakan: text("wa_template_service_dikerjakan"),
    waTemplateServiceMenungguPart: text("wa_template_service_menunggu_part"),
    waTemplateServiceSelesai: text("wa_template_service_selesai"),
    waTemplateServiceBatal: text("wa_template_service_batal"),
    storeBanks: text("store_banks"),
    enableCashierShift: boolean("enable_cashier_shift").notNull().default(true),
    expenseCategories: text("expense_categories"),
    serviceIssues: text("service_issues"),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
});

export const activityLogs = pgTable("activity_logs", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().default("default").references(() => stores.id, { onDelete: 'cascade' }),
    userId: text("user_id").notNull(),
    userName: text("user_name").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    details: text("details"),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("activity_logs_store_id_idx").on(table.storeId),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
    stores: many(stores),
}));

export const userStoreAccessRelations = relations(userStoreAccess, ({ one }) => ({
    user: one(user, {
        fields: [userStoreAccess.userId],
        references: [user.id],
    }),
    store: one(stores, {
        fields: [userStoreAccess.storeId],
        references: [stores.id],
    }),
}));

// storesRelations will be defined in index.ts since it references many other entities to avoid circular dependencies
