import { pgTable, text, doublePrecision, timestamp, index } from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';
import { stores } from './store';
import { technicians } from './hr';
import { devicePassports } from './transactions';

// Device Refurbishments - Track cleaning, repairs, upgrades for each device
export const deviceRefurbishments = pgTable("device_refurbishments", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    passportId: text("passport_id").notNull().references(() => devicePassports.id, { onDelete: 'cascade' }),
    storeId: text("store_id").notNull().default("default").references(() => stores.id, { onDelete: 'cascade' }),
    technicianId: text("technician_id").references(() => technicians.id, { onDelete: 'set null' }),
    // Activity type enum
    activityType: text("activity_type").notNull(), // CLEANING, REPASTA, UPGRADE_RAM, UPGRADE_SSD, REPLACE_COMPONENT, OTHER
    description: text("description").notNull(), // e.g., "Upgrade RAM from 8GB to 16GB"
    cost: doublePrecision("cost").default(0), // Cost of repair/upgrade for asset valuation
    // Component details
    componentReplaced: text("component_replaced"), // e.g., "RAM", "SSD", "Battery"
    oldSpec: text("old_spec"), // e.g., "8GB DDR4"
    newSpec: text("new_spec"), // e.g., "16GB DDR4"
    notes: text("notes"),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    passportIdIdx: index("device_refurbishments_passport_idx").on(table.passportId),
    storeIdIdx: index("device_refurbishments_store_idx").on(table.storeId),
    technicianIdIdx: index("device_refurbishments_technician_idx").on(table.technicianId),
    activityTypeIdx: index("device_refurbishments_activity_idx").on(table.activityType),
}));

export const deviceRefurbishmentsRelations = relations(deviceRefurbishments, ({ one }) => ({
    passport: one(devicePassports, {
        fields: [deviceRefurbishments.passportId],
        references: [devicePassports.id],
    }),
    store: one(stores, {
        fields: [deviceRefurbishments.storeId],
        references: [stores.id],
    }),
    technician: one(technicians, {
        fields: [deviceRefurbishments.technicianId],
        references: [technicians.id],
    }),
}));
