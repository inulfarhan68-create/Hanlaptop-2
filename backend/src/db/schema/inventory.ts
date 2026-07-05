import { sqliteTable, text, integer, real, index, check } from 'drizzle-orm/sqlite-core';
import { sql, relations } from 'drizzle-orm';
import { stores } from '@/db/schema/store';
import { technicians } from '@/db/schema/hr';

export const inventory = sqliteTable("inventory", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().default("default").references(() => stores.id, { onDelete: 'cascade' }),
    itemName: text("item_name").notNull(),
    category: text("category").notNull(),
    specs: text("specs"),
    barcode: text("barcode"),
    quantity: integer("quantity").notNull().default(0),
    minStock: integer("min_stock").notNull().default(2),
    costPrice: real("cost_price").notNull().default(0),
    sellingPrice: real("selling_price").notNull().default(0),
    isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(false),
    condition: text("condition").notNull().default('NEW'),
    isConsignment: integer('is_consignment', { mode: 'boolean' }).notNull().default(false),
    consignmentCommissionRate: real("consignment_commission_rate").default(10),
    supplierId: text("supplier_id"),
    imageUrl: text("image_url"),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }), // SOFT DELETE
}, (table) => ({
    storeIdIdx: index("inventory_store_id_idx").on(table.storeId),
    categoryIdx: index("inventory_category_idx").on(table.category),
    quantityCheck: check("quantity_check", sql`${table.quantity} >= 0`),
}));

export const qcInspections = sqliteTable("qc_inspections", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    inventoryId: text("inventory_id").notNull().references(() => inventory.id, { onDelete: 'cascade' }),
    technicianId: text("technician_id").notNull().references(() => technicians.id, { onDelete: 'cascade' }),
    grade: text("grade").notNull(),
    screenScore: integer("screen_score").default(100),
    batteryHealth: integer("battery_health").default(100),
    keyboardScore: integer("keyboard_score").default(100),
    usbPortsScore: integer("usb_ports_score").default(100),
    hingeScore: integer("hinge_score").default(100),
    wifiScore: integer("wifi_score").default(100),
    bodyScore: integer("body_score").default(100),
    maxSellingPrice: real("max_selling_price"),
    warrantyDays: integer("warranty_days"),
    notes: text("notes"),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    inventoryIdIdx: index("qc_inspections_inventory_id_idx").on(table.inventoryId),
}));

export const stockOpnames = sqliteTable("stock_opnames", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().default("default").references(() => stores.id, { onDelete: 'cascade' }),
    userId: text("user_id").notNull(),
    userName: text("user_name").notNull(),
    status: text("status").notNull().default("DRAFT"),
    notes: text("notes"),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    completedAt: integer('completed_at', { mode: 'timestamp' }),
}, (table) => ({
    storeIdIdx: index("stock_opnames_store_id_idx").on(table.storeId),
}));

export const stockOpnameItems = sqliteTable("stock_opname_items", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    opnameId: text("opname_id").notNull().references(() => stockOpnames.id, { onDelete: 'cascade' }),
    inventoryId: text("inventory_id").notNull().references(() => inventory.id, { onDelete: 'cascade' }),
    systemQty: integer("system_qty").notNull(),
    physicalQty: integer("physical_qty").notNull(),
    difference: integer("difference").notNull(),
    note: text("note"),
}, (table) => ({
    opnameIdIdx: index("stock_opname_items_opname_id_idx").on(table.opnameId),
}));

export const qcInspectionsRelations = relations(qcInspections, ({ one }) => ({
    inventory: one(inventory, {
        fields: [qcInspections.inventoryId],
        references: [inventory.id],
    }),
    technician: one(technicians, {
        fields: [qcInspections.technicianId],
        references: [technicians.id],
    }),
}));

export const stockOpnamesRelations = relations(stockOpnames, ({ one, many }) => ({
    store: one(stores, {
        fields: [stockOpnames.storeId],
        references: [stores.id],
    }),
    items: many(stockOpnameItems),
}));

export const stockOpnameItemsRelations = relations(stockOpnameItems, ({ one }) => ({
    opname: one(stockOpnames, {
        fields: [stockOpnameItems.opnameId],
        references: [stockOpnames.id],
    }),
    inventoryItem: one(inventory, {
        fields: [stockOpnameItems.inventoryId],
        references: [inventory.id],
    }),
}));
