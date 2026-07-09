import { text, sqliteTable, index } from 'drizzle-orm/sqlite-core';
import crypto from 'crypto';
import { stores } from './store';
import { user } from './users';

export const auditLogs = sqliteTable('audit_logs', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text('store_id').notNull().references(() => stores.id),
    userId: text('user_id').notNull().references(() => user.id),
    action: text('action').notNull(), // CREATE, UPDATE, DELETE, APPROVE, dst
    entity: text('entity').notNull(), // INVENTORY, TRANSACTION, USER, dst
    entityId: text('entity_id').notNull(),
    oldValue: text('old_value'), // JSON stringified
    newValue: text('new_value'), // JSON stringified
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
    // SaaS Performance: Indexes for multi-tenant queries
    storeIdIdx: index("audit_logs_store_id_idx").on(table.storeId),
    userIdIdx: index("audit_logs_user_id_idx").on(table.userId),
    entityIdx: index("audit_logs_entity_idx").on(table.entity),
    createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
    storeCreatedIdx: index("audit_logs_store_created_idx").on(table.storeId, table.createdAt),
}));
