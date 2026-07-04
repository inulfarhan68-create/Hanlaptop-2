import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Better Auth built-in tables
export const user = sqliteTable("user", {
					id: text("id").primaryKey(),
					name: text('name').notNull(),
					email: text('email').notNull().unique(),
					emailVerified: integer('email_verified', { mode: 'boolean' }).notNull(),
					image: text('image'),
					role: text('role').notNull().default('kasir'),
					createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
					updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const session = sqliteTable("session", {
					id: text("id").primaryKey(),
					expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
					token: text('token').notNull().unique(),
					createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
					updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
					ipAddress: text('ip_address'),
					userAgent: text('user_agent'),
					userId: text('user_id').notNull().references(() => user.id)
});

export const account = sqliteTable("account", {
					id: text("id").primaryKey(),
					accountId: text('account_id').notNull(),
					providerId: text('provider_id').notNull(),
					userId: text('user_id').notNull().references(() => user.id),
					accessToken: text('access_token'),
					refreshToken: text('refresh_token'),
					idToken: text('id_token'),
					accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
					refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
					scope: text('scope'),
					password: text('password'),
					createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
					updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const verification = sqliteTable("verification", {
					id: text("id").primaryKey(),
					identifier: text('identifier').notNull(),
					value: text('value').notNull(),
					expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
					createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
					updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

// App-specific tables
export const organizations = sqliteTable("organizations", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const stores = sqliteTable("stores", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    name: text("name").notNull(),
    address: text("address"),
    phone: text("phone"),
    slug: text("slug"),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    slugIdx: uniqueIndex("store_slug_idx").on(table.slug),
}));

export const userStoreAccess = sqliteTable("user_store_access", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
    storeId: text("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
    role: text("role").notNull().default('kasir'), // 'owner' or 'kasir' at this store
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    userIdIdx: index("user_store_access_user_idx").on(table.userId),
    storeIdIdx: index("user_store_access_store_idx").on(table.storeId),
}));

export const inventory = sqliteTable("inventory", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().default("default").references(() => stores.id, { onDelete: 'cascade' }),
    itemName: text("item_name").notNull(),
    category: text("category").notNull(), // 'Laptop Bekas' or 'Sparepart'
    specs: text("specs"), // Laptop specifications
    barcode: text("barcode"), // Temporarily removed .unique() as barcode needs to be unique per store, not globally
    quantity: integer("quantity").notNull().default(0),
    minStock: integer("min_stock").notNull().default(2),
    costPrice: real("cost_price").notNull().default(0),
    sellingPrice: real("selling_price").notNull().default(0),
    isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(false),
    condition: text("condition").notNull().default('NEW'), // 'NEW', 'USED_A', 'USED_B', 'USED_C', 'BROKEN', 'IN_INSPECTION'
    isConsignment: integer('is_consignment', { mode: 'boolean' }).notNull().default(false),
    consignmentCommissionRate: real("consignment_commission_rate").default(10), // Percentage commission for consignment items (e.g., 10 = 10%)
    supplierId: text("supplier_id"),
    imageUrl: text("image_url"),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("inventory_store_id_idx").on(table.storeId),
    categoryIdx: index("inventory_category_idx").on(table.category),
}));

export const customers = sqliteTable("customers", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().default("default").references(() => stores.id, { onDelete: 'cascade' }),
    name: text("name").notNull(),
    phone: text("phone"),
    address: text("address"),
    notes: text("notes"),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
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
}, (table) => ({
    storeIdIdx: index("supplier_store_id_idx").on(table.storeId),
}));

export const technicians = sqliteTable("technicians", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().default("default").references(() => stores.id, { onDelete: 'cascade' }),
    name: text("name").notNull(),
    phone: text("phone"),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    commissionType: text("commission_type").notNull().default('percentage'), // 'percentage' or 'fixed'
    commissionValue: real("commission_value").notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("technician_store_id_idx").on(table.storeId),
}));

export const technicianCommissions = sqliteTable("technician_commissions", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().default("default").references(() => stores.id, { onDelete: 'cascade' }),
    technicianId: text("technician_id").notNull().references(() => technicians.id, { onDelete: 'cascade' }),
    serviceOrderId: text("service_order_id").notNull().references(() => serviceOrders.id, { onDelete: 'cascade' }),
    transactionId: text("transaction_id").references(() => transactions.id, { onDelete: 'set null' }),
    serviceAmount: real("service_amount").notNull().default(0),
    partsAmount: real("parts_amount").notNull().default(0),
    commissionAmount: real("commission_amount").notNull().default(0),
    status: text("status").notNull().default('UNPAID'), // 'UNPAID' | 'PAID'
    paidAt: integer('paid_at', { mode: 'timestamp' }),
    payoutTransactionId: text("payout_transaction_id").references(() => transactions.id, { onDelete: 'set null' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("technician_commission_store_id_idx").on(table.storeId),
    technicianIdIdx: index("technician_commission_tech_id_idx").on(table.technicianId),
    serviceOrderIdIdx: index("technician_commission_so_id_idx").on(table.serviceOrderId),
}));

export const cashierShifts = sqliteTable("cashier_shifts", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
    userName: text("user_name").notNull(),
    openedAt: integer('opened_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    closedAt: integer('closed_at', { mode: 'timestamp' }),
    openingBalance: real("opening_balance").notNull().default(0),
    closingBalance: real("closing_balance"),
    expectedBalance: real("expected_balance"),
    difference: real("difference"),
    status: text("status").notNull().default("OPEN"), // 'OPEN', 'CLOSED'
    notes: text("notes"),
}, (table) => ({
    storeIdIdx: index("cashier_shifts_store_id_idx").on(table.storeId),
    userIdIdx: index("cashier_shifts_user_id_idx").on(table.userId),
}));

export const transactions = sqliteTable("transactions", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().default("default").references(() => stores.id, { onDelete: 'cascade' }),
    transactionType: text("transaction_type").notNull(), // 'Penjualan', 'Jasa Servis', 'Pembelian Stok', 'Operasional', 'Modal Baru', 'Prive'
    amount: real("amount").notNull(),
    description: text("description"),
    transactionDate: integer('transaction_date', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    invoiceNumber: text("invoice_number"),
    customerName: text("customer_name"),
    customerId: text("customer_id").references(() => customers.id, { onDelete: 'set null' }),
    supplierId: text("supplier_id").references(() => suppliers.id, { onDelete: 'set null' }),
    paymentMethod: text("payment_method"), // 'Cash', 'Transfer', 'Tempo'
    paymentStatus: text("payment_status"), // 'Lunas', 'Belum Lunas'
    dpAmount: real("dp_amount").default(0), // Down payment amount
    discountAmount: real("discount_amount").default(0), // Discount amount
    dueDate: integer('due_date', { mode: 'timestamp' }), // Due date for Piutang
    originalTransactionId: text("original_transaction_id"), // Linked transaction for returns
    userId: text("user_id").references(() => user.id, { onDelete: 'set null' }),
    shiftId: text("shift_id").references(() => cashierShifts.id, { onDelete: 'set null' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("transaction_store_id_idx").on(table.storeId),
    customerIdIdx: index("transaction_customer_id_idx").on(table.customerId),
    transactionDateIdx: index("transaction_date_idx").on(table.transactionDate),
    storeInvoiceIdx: uniqueIndex("transaction_store_invoice_idx").on(table.storeId, table.invoiceNumber),
}));

export const transactionItems = sqliteTable("transaction_items", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    transactionId: text("transaction_id").notNull().references(() => transactions.id, { onDelete: 'cascade' }),
    inventoryId: text("inventory_id").references(() => inventory.id, { onDelete: 'set null' }),
    quantity: integer("quantity").notNull(),
    unitPrice: real("unit_price").notNull(),
    serialNumbers: text("serial_numbers"), // JSON array of SNs for tracking warranty
}, (table) => ({
    transactionIdIdx: index("transaction_items_tx_id_idx").on(table.transactionId),
    inventoryIdIdx: index("transaction_items_inv_id_idx").on(table.inventoryId),
}));

export const journalEntries = sqliteTable("journal_entries", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().default("default").references(() => stores.id, { onDelete: 'cascade' }),
    transactionId: text("transaction_id").notNull().references(() => transactions.id, { onDelete: 'cascade' }),
    accountName: text("account_name").notNull(), // 'Kas', 'Persediaan', 'Pendapatan', 'HPP', 'Modal', 'Beban Gaji', etc.
    debit: real("debit").notNull().default(0),
    credit: real("credit").notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("journal_entries_store_id_idx").on(table.storeId),
    transactionIdIdx: index("journal_entries_tx_id_idx").on(table.transactionId),
    createdAtIdx: index("journal_entries_created_at_idx").on(table.createdAt),
}));

export const storeSettings = sqliteTable("store_settings", {
    storeId: text("store_id").primaryKey().default("default").references(() => stores.id, { onDelete: 'cascade' }),
    storeName: text("store_name").notNull().default("HanLaptop"),
    storeAddress: text("store_address").notNull().default("Jl. Komputer Raya No.123"),
    storePhone: text("store_phone").notNull().default("0812-3456-7890"),
    storeLogo: text("store_logo"), // Base64 or URL
    storeSignature: text("store_signature"), // Base64 or URL
    storeFooter: text("store_footer").default("Terima kasih atas kunjungan Anda.\nBarang yang sudah dibeli\ntidak dapat ditukar/dikembalikan."),
    waTemplatePiutang: text("wa_template_piutang").default("Halo Kak {nama}, sekadar mengingatkan bahwa ada tagihan dari *{toko}* untuk nota *{nota}* senilai *{sisa}* yang jatuh tempo pada *{tempo}*. Terima kasih."),
    waTemplateUmum: text("wa_template_umum").default("Halo Kak {nama}, ini dengan *{toko}*. "),
    waTemplateNota: text("wa_template_nota"),
    waTemplateServiceDiterima: text("wa_template_service_diterima"),
    waTemplateServiceDikerjakan: text("wa_template_service_dikerjakan"),
    waTemplateServiceMenungguPart: text("wa_template_service_menunggu_part"),
    waTemplateServiceSelesai: text("wa_template_service_selesai"),
    waTemplateServiceBatal: text("wa_template_service_batal"),
    storeBanks: text("store_banks"), // JSON string of bank accounts array
    enableCashierShift: integer("enable_cashier_shift", { mode: "boolean" }).notNull().default(true),
    expenseCategories: text("expense_categories"),
    serviceIssues: text("service_issues"),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const activityLogs = sqliteTable("activity_logs", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().default("default").references(() => stores.id, { onDelete: 'cascade' }),
    userId: text("user_id").notNull(), // Should reference user.id but allowing loose link if user gets deleted
    userName: text("user_name").notNull(),
    action: text("action").notNull(), // e.g., 'CREATE_TRANSACTION', 'DELETE_INVENTORY', 'EDIT_SETTINGS'
    entityType: text("entity_type").notNull(), // e.g., 'transaction', 'inventory', 'settings'
    entityId: text("entity_id"),
    details: text("details"), // JSON payload
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("activity_logs_store_id_idx").on(table.storeId),
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
    status: text("status").notNull().default('Diterima'), // 'Diterima', 'Dikerjakan', 'Menunggu Part', 'Selesai', 'Diambil', 'Batal'
    technicianName: text("technician_name"),
    technicianId: text("technician_id").references(() => technicians.id, { onDelete: 'set null' }),
    estimatedCost: real("estimated_cost").default(0),
    finalCost: real("final_cost").default(0),
    receivedDate: integer('received_date', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    completedDate: integer('completed_date', { mode: 'timestamp' }),
    warrantyUntil: integer('warranty_until', { mode: 'timestamp' }),
    notes: text("notes"),
    warrantyClaimed: integer('warranty_claimed', { mode: 'boolean' }).default(false), // Is this service a free warranty claim?
    originalTransactionId: text("original_transaction_id"), // Link to the original sales transaction
    rating: integer("rating"),
    ratingComment: text("rating_comment"),
    ratingAt: integer('rating_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("service_orders_store_id_idx").on(table.storeId),
}));

// ── Stock Opname (Inventory Count) ──
export const stockOpnames = sqliteTable("stock_opnames", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().default("default").references(() => stores.id, { onDelete: 'cascade' }),
    userId: text("user_id").notNull(),
    userName: text("user_name").notNull(),
    status: text("status").notNull().default("DRAFT"), // 'DRAFT', 'COMPLETED'
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

// ── Drizzle Relations ──

export const organizationsRelations = relations(organizations, ({ many }) => ({
    stores: many(stores),
}));

export const storesRelations = relations(stores, ({ one, many }) => ({
    organization: one(organizations, {
        fields: [stores.organizationId],
        references: [organizations.id],
    }),
    users: many(userStoreAccess),
    inventory: many(inventory),
    customers: many(customers),
    suppliers: many(suppliers),
    technicians: many(technicians),
    transactions: many(transactions),
    serviceOrders: many(serviceOrders),
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

export const inventoryRelations = relations(inventory, ({ one, many }) => ({
    store: one(stores, {
        fields: [inventory.storeId],
        references: [stores.id],
    }),
    transactionItems: many(transactionItems),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
    store: one(stores, {
        fields: [customers.storeId],
        references: [stores.id],
    }),
    transactions: many(transactions),
    serviceOrders: many(serviceOrders),
}));

export const cashierShiftsRelations = relations(cashierShifts, ({ one, many }) => ({
    store: one(stores, {
        fields: [cashierShifts.storeId],
        references: [stores.id],
    }),
    user: one(user, {
        fields: [cashierShifts.userId],
        references: [user.id],
    }),
    transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
    store: one(stores, {
        fields: [transactions.storeId],
        references: [stores.id],
    }),
    items: many(transactionItems),
    journals: many(journalEntries),
    customer: one(customers, {
        fields: [transactions.customerId],
        references: [customers.id],
    }),
    supplier: one(suppliers, {
        fields: [transactions.supplierId],
        references: [suppliers.id],
    }),
    creator: one(user, {
        fields: [transactions.userId],
        references: [user.id],
    }),
    cashierShift: one(cashierShifts, {
        fields: [transactions.shiftId],
        references: [cashierShifts.id],
    }),
    serviceCommissions: many(technicianCommissions, { relationName: "commissionServiceTransaction" }),
    payoutCommissions: many(technicianCommissions, { relationName: "commissionPayoutTransaction" }),
}));

export const transactionItemsRelations = relations(transactionItems, ({ one }) => ({
    transaction: one(transactions, {
        fields: [transactionItems.transactionId],
        references: [transactions.id],
    }),
    inventoryItem: one(inventory, {
        fields: [transactionItems.inventoryId],
        references: [inventory.id],
    }),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one }) => ({
    store: one(stores, {
        fields: [journalEntries.storeId],
        references: [stores.id],
    }),
    transaction: one(transactions, {
        fields: [journalEntries.transactionId],
        references: [transactions.id],
    }),
}));

export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
    store: one(stores, {
        fields: [suppliers.storeId],
        references: [stores.id],
    }),
    transactions: many(transactions),
}));

export const techniciansRelations = relations(technicians, ({ one, many }) => ({
    store: one(stores, {
        fields: [technicians.storeId],
        references: [stores.id],
    }),
    serviceOrders: many(serviceOrders),
    commissions: many(technicianCommissions),
}));

export const technicianCommissionsRelations = relations(technicianCommissions, ({ one }) => ({
    store: one(stores, {
        fields: [technicianCommissions.storeId],
        references: [stores.id],
    }),
    technician: one(technicians, {
        fields: [technicianCommissions.technicianId],
        references: [technicians.id],
    }),
    serviceOrder: one(serviceOrders, {
        fields: [technicianCommissions.serviceOrderId],
        references: [serviceOrders.id],
    }),
    transaction: one(transactions, {
        fields: [technicianCommissions.transactionId],
        references: [transactions.id],
        relationName: "commissionServiceTransaction",
    }),
    payoutTransaction: one(transactions, {
        fields: [technicianCommissions.payoutTransactionId],
        references: [transactions.id],
        relationName: "commissionPayoutTransaction",
    }),
}));

export const serviceOrdersRelations = relations(serviceOrders, ({ one, many }) => ({
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

// ── Stock Transfer (Multi-Branch Mutasi) ──
export const stockTransfers = sqliteTable("stock_transfers", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    transferNumber: text("transfer_number").notNull(), // TRF/YYYYMMDD/XXXX
    sourceStoreId: text("source_store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    targetStoreId: text("target_store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("PENDING"), // 'PENDING', 'APPROVED', 'CANCELLED'
    notes: text("notes"),
    createdByUserId: text("created_by_user_id").notNull(),
    createdByUserName: text("created_by_user_name").notNull(),
    approvedByUserId: text("approved_by_user_id"),
    approvedByUserName: text("approved_by_user_name"),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    sourceStoreIdx: index("stock_transfer_source_store_idx").on(table.sourceStoreId),
    targetStoreIdx: index("stock_transfer_target_store_idx").on(table.targetStoreId),
    transferNumberIdx: uniqueIndex("stock_transfer_number_idx").on(table.transferNumber),
}));

export const stockTransferItems = sqliteTable("stock_transfer_items", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    transferId: text("transfer_id").notNull().references(() => stockTransfers.id, { onDelete: "cascade" }),
    inventoryId: text("inventory_id").notNull().references(() => inventory.id, { onDelete: "cascade" }),
    itemName: text("item_name").notNull(),
    quantity: integer("quantity").notNull(),
}, (table) => ({
    transferIdIdx: index("stock_transfer_items_transfer_idx").on(table.transferId),
}));

export const stockTransfersRelations = relations(stockTransfers, ({ one, many }) => ({
    sourceStore: one(stores, {
        fields: [stockTransfers.sourceStoreId],
        references: [stores.id],
        relationName: "sourceStore",
    }),
    targetStore: one(stores, {
        fields: [stockTransfers.targetStoreId],
        references: [stores.id],
        relationName: "targetStore",
    }),
    items: many(stockTransferItems),
}));

export const stockTransferItemsRelations = relations(stockTransferItems, ({ one }) => ({
    transfer: one(stockTransfers, {
        fields: [stockTransferItems.transferId],
        references: [stockTransfers.id],
    }),
    inventoryItem: one(inventory, {
        fields: [stockTransferItems.inventoryId],
        references: [inventory.id],
    }),
}));

// ── HR & Payroll Module Tables ──
export const employees = sqliteTable("employees", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    role: text("role").notNull().default('Lainnya'), // 'Kasir', 'Teknisi', 'Manager', 'Lainnya'
    userId: text("user_id").references(() => user.id, { onDelete: 'set null' }),
    technicianId: text("technician_id").references(() => technicians.id, { onDelete: 'set null' }),
    basicSalary: real("basic_salary").notNull().default(0),
    allowance: real("allowance").notNull().default(0),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("employees_store_id_idx").on(table.storeId),
    userIdIdx: index("employees_user_id_idx").on(table.userId),
    techIdIdx: index("employees_tech_id_idx").on(table.technicianId),
}));

export const employeeLoans = sqliteTable("employee_loans", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
    employeeId: text("employee_id").notNull().references(() => employees.id, { onDelete: 'cascade' }),
    amount: real("amount").notNull().default(0),
    paidAmount: real("paid_amount").notNull().default(0),
    status: text("status").notNull().default('UNPAID'), // 'UNPAID' | 'PARTIAL' | 'PAID'
    description: text("description"),
    loanDate: integer('loan_date', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("employee_loans_store_id_idx").on(table.storeId),
    employeeIdIdx: index("employee_loans_employee_id_idx").on(table.employeeId),
}));

export const payrolls = sqliteTable("payrolls", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
    employeeId: text("employee_id").notNull().references(() => employees.id, { onDelete: 'cascade' }),
    period: text("period").notNull(), // 'YYYY-MM'
    basicSalary: real("basic_salary").notNull().default(0),
    allowance: real("allowance").notNull().default(0),
    commissions: real("commissions").notNull().default(0),
    overtime: real("overtime").notNull().default(0),
    deductions: real("deductions").notNull().default(0),
    netSalary: real("net_salary").notNull().default(0),
    paymentMethod: text("payment_method").notNull().default('Cash'),
    paymentStatus: text("payment_status").notNull().default('UNPAID'), // 'UNPAID' | 'PAID'
    paidAt: integer('paid_at', { mode: 'timestamp' }),
    payoutTransactionId: text("payout_transaction_id").references(() => transactions.id, { onDelete: 'set null' }),
    notes: text("notes"),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("payrolls_store_id_idx").on(table.storeId),
    employeeIdIdx: index("payrolls_employee_id_idx").on(table.employeeId),
    periodIdx: index("payrolls_period_idx").on(table.period),
}));

// Relations
export const employeesRelations = relations(employees, ({ one, many }) => ({
    store: one(stores, {
        fields: [employees.storeId],
        references: [stores.id],
    }),
    user: one(user, {
        fields: [employees.userId],
        references: [user.id],
    }),
    technician: one(technicians, {
        fields: [employees.technicianId],
        references: [technicians.id],
    }),
    loans: many(employeeLoans),
    payrolls: many(payrolls),
}));

export const employeeLoansRelations = relations(employeeLoans, ({ one }) => ({
    store: one(stores, {
        fields: [employeeLoans.storeId],
        references: [stores.id],
    }),
    employee: one(employees, {
        fields: [employeeLoans.employeeId],
        references: [employees.id],
    }),
}));

export const payrollsRelations = relations(payrolls, ({ one }) => ({
    store: one(stores, {
        fields: [payrolls.storeId],
        references: [stores.id],
    }),
    employee: one(employees, {
        fields: [payrolls.employeeId],
        references: [employees.id],
    }),
    payoutTransaction: one(transactions, {
        fields: [payrolls.payoutTransactionId],
        references: [transactions.id],
    }),
}));

export const attendances = sqliteTable("attendances", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
    employeeId: text("employee_id").notNull().references(() => employees.id, { onDelete: 'cascade' }),
    date: text("date").notNull(), // YYYY-MM-DD
    clockIn: integer('clock_in', { mode: 'timestamp' }),
    clockOut: integer('clock_out', { mode: 'timestamp' }),
    status: text("status").notNull().default('HADIR'), // 'HADIR', 'SAKIT', 'IZIN', 'ALFA'
    photoIn: text("photo_in"),
    photoOut: text("photo_out"),
    locationIn: text("location_in"),
    locationOut: text("location_out"),
    notes: text("notes"),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("attendances_store_id_idx").on(table.storeId),
    employeeIdIdx: index("attendances_employee_id_idx").on(table.employeeId),
    dateIdx: index("attendances_date_idx").on(table.date),
}));

export const attendancesRelations = relations(attendances, ({ one }) => ({
    store: one(stores, {
        fields: [attendances.storeId],
        references: [stores.id],
    }),
    employee: one(employees, {
        fields: [attendances.employeeId],
        references: [employees.id],
    }),
}));

export const purchaseRequisitions = sqliteTable("purchase_requisitions", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
    requesterId: text("requester_id").notNull().references(() => employees.id, { onDelete: 'cascade' }),
    itemName: text("item_name").notNull(),
    quantity: real("quantity").notNull(),
    estimatedCost: real("estimated_cost").notNull(),
    supplierName: text("supplier_name"),
    status: text("status").notNull().default('PENDING'), // 'PENDING', 'APPROVED', 'REJECTED', 'RECEIVED'
    notes: text("notes"),
    approvedBy: text("approved_by"),
    approvedAt: integer('approved_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("purchase_requisitions_store_id_idx").on(table.storeId),
    statusIdx: index("purchase_requisitions_status_idx").on(table.status),
}));

export const purchaseRequisitionsRelations = relations(purchaseRequisitions, ({ one }) => ({
    store: one(stores, {
        fields: [purchaseRequisitions.storeId],
        references: [stores.id],
    }),
    requester: one(employees, {
        fields: [purchaseRequisitions.requesterId],
        references: [employees.id],
    }),
}));

export const membershipPoints = sqliteTable("membership_points", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    customerId: text("customer_id").notNull().unique().references(() => customers.id, { onDelete: 'cascade' }),
    points: real("points").notNull().default(0),
    history: text("history"), // JSON list of points log events
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    customerIdIdx: index("membership_points_customer_id_idx").on(table.customerId),
}));

export const membershipPointsRelations = relations(membershipPoints, ({ one }) => ({
    customer: one(customers, {
        fields: [membershipPoints.customerId],
        references: [customers.id],
    }),
}));

export const crmReminders = sqliteTable("crm_reminders", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
    customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: 'cascade' }),
    customerPhone: text("customer_phone"),
    type: text("type").notNull(), // 'SERVICE_MAINTENANCE_6M', 'BIRTHDAY', 'PROMO'
    scheduledDate: text("scheduled_date").notNull(), // YYYY-MM-DD
    sentAt: integer('sent_at', { mode: 'timestamp' }),
    status: text("status").notNull().default('PENDING'), // 'PENDING', 'SENT', 'FAILED'
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("crm_reminders_store_id_idx").on(table.storeId),
    customerIdIdx: index("crm_reminders_customer_id_idx").on(table.customerId),
    statusIdx: index("crm_reminders_status_idx").on(table.status),
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

export const bankMutations = sqliteTable("bank_mutations", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
    date: text("date").notNull(), // YYYY-MM-DD
    description: text("description").notNull(),
    amount: real("amount").notNull(),
    type: text("type").notNull(), // 'CR' | 'DB'
    reconciled: integer("reconciled").notNull().default(0), // 0 = false, 1 = true
    reconciledTransactionId: text("reconciled_transaction_id").references(() => transactions.id, { onDelete: 'set null' }),
    reconciledServiceOrderId: text("reconciled_service_order_id").references(() => serviceOrders.id, { onDelete: 'set null' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("bank_mutations_store_id_idx").on(table.storeId),
    reconciledIdx: index("bank_mutations_reconciled_idx").on(table.reconciled),
}));

export const bankMutationsRelations = relations(bankMutations, ({ one }) => ({
    store: one(stores, {
        fields: [bankMutations.storeId],
        references: [stores.id],
    }),
    reconciledTransaction: one(transactions, {
        fields: [bankMutations.reconciledTransactionId],
        references: [transactions.id],
    }),
    reconciledServiceOrder: one(serviceOrders, {
        fields: [bankMutations.reconciledServiceOrderId],
        references: [serviceOrders.id],
    }),
}));

export const qcInspections = sqliteTable("qc_inspections", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    inventoryId: text("inventory_id").notNull().references(() => inventory.id, { onDelete: 'cascade' }),
    technicianId: text("technician_id").notNull().references(() => technicians.id, { onDelete: 'cascade' }),
    grade: text("grade").notNull(), // 'A', 'B', 'C', 'REJECT'
    // Per-component checklist scores (0-100)
    screenScore: integer("screen_score").default(100), // White spot, dead pixel check
    batteryHealth: integer("battery_health").default(100), // Battery health percentage
    keyboardScore: integer("keyboard_score").default(100), // Keyboard functionality
    usbPortsScore: integer("usb_ports_score").default(100), // USB port functionality
    hingeScore: integer("hinge_score").default(100), // Hinge condition
    wifiScore: integer("wifi_score").default(100), // Wi-Fi module
    bodyScore: integer("body_score").default(100), // Physical body cosmetics
    // QC output metadata
    maxSellingPrice: real("max_selling_price"), // Price ceiling based on grade
    warrantyDays: integer("warranty_days"), // Warranty duration in days based on grade
    notes: text("notes"),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    inventoryIdIdx: index("qc_inspections_inventory_id_idx").on(table.inventoryId),
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

export const warrantyClaims = sqliteTable("warranty_claims", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
    transactionId: text("transaction_id").notNull().references(() => transactions.id, { onDelete: 'cascade' }),
    customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: 'cascade' }),
    technicianId: text("technician_id").references(() => technicians.id, { onDelete: 'set null' }), // Assigned technician
    serviceOrderId: text("service_order_id").references(() => serviceOrders.id, { onDelete: 'set null' }), // Linked service order for repair
    status: text("status").notNull().default('SUBMITTED'), // 'SUBMITTED', 'INSPECTING', 'REPAIRING', 'COMPLETED', 'RETURNED', 'REJECTED'
    issueDescription: text("issue_description").notNull(),
    resolutionNotes: text("resolution_notes"),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("warranty_claims_store_id_idx").on(table.storeId),
    transactionIdIdx: index("warranty_claims_transaction_id_idx").on(table.transactionId),
    technicianIdIdx: index("warranty_claims_technician_id_idx").on(table.technicianId),
}));

export const warrantyClaimParts = sqliteTable("warranty_claim_parts", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    claimId: text("claim_id").notNull().references(() => warrantyClaims.id, { onDelete: 'cascade' }),
    inventoryId: text("inventory_id").notNull().references(() => inventory.id, { onDelete: 'cascade' }),
    quantity: integer("quantity").notNull(),
    costPrice: real("cost_price").notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const warrantyClaimsRelations = relations(warrantyClaims, ({ one, many }) => ({
    store: one(stores, {
        fields: [warrantyClaims.storeId],
        references: [stores.id],
    }),
    transaction: one(transactions, {
        fields: [warrantyClaims.transactionId],
        references: [transactions.id],
    }),
    customer: one(customers, {
        fields: [warrantyClaims.customerId],
        references: [customers.id],
    }),
    technician: one(technicians, {
        fields: [warrantyClaims.technicianId],
        references: [technicians.id],
    }),
    serviceOrder: one(serviceOrders, {
        fields: [warrantyClaims.serviceOrderId],
        references: [serviceOrders.id],
    }),
    parts: many(warrantyClaimParts),
}));

export const warrantyClaimPartsRelations = relations(warrantyClaimParts, ({ one }) => ({
    claim: one(warrantyClaims, {
        fields: [warrantyClaimParts.claimId],
        references: [warrantyClaims.id],
    }),
    inventory: one(inventory, {
        fields: [warrantyClaimParts.inventoryId],
        references: [inventory.id],
    }),
}));

export const consignmentPayables = sqliteTable("consignment_payables", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
    supplierId: text("supplier_id").notNull().references(() => suppliers.id, { onDelete: 'cascade' }),
    inventoryId: text("inventory_id").notNull().references(() => inventory.id, { onDelete: 'cascade' }),
    transactionId: text("transaction_id").references(() => transactions.id, { onDelete: 'set null' }),
    amountDue: real("amount_due").notNull(),
    status: text("status").notNull().default('UNPAID'), // 'UNPAID', 'PAID'
    paidAt: integer('paid_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("consignment_payables_store_id_idx").on(table.storeId),
    supplierIdIdx: index("consignment_payables_supplier_id_idx").on(table.supplierId),
    statusIdx: index("consignment_payables_status_idx").on(table.status),
}));

export const consignmentPayablesRelations = relations(consignmentPayables, ({ one }) => ({
    store: one(stores, {
        fields: [consignmentPayables.storeId],
        references: [stores.id],
    }),
    supplier: one(suppliers, {
        fields: [consignmentPayables.supplierId],
        references: [suppliers.id],
    }),
    inventory: one(inventory, {
        fields: [consignmentPayables.inventoryId],
        references: [inventory.id],
    }),
    transaction: one(transactions, {
        fields: [consignmentPayables.transactionId],
        references: [transactions.id],
      }),
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
    status: text("status").notNull().default('PENDING'), // 'PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'
    type: text("type").notNull().default('JUAL_LAPTOP'), // 'JUAL_LAPTOP', 'TUKAR_TAMBAH'
    targetLaptopName: text("target_laptop_name"),
    targetLaptopPrice: real("target_laptop_price"),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("buyback_leads_store_id_idx").on(table.storeId),
    statusIdx: index("buyback_leads_status_idx").on(table.status),
    typeIdx: index("buyback_leads_type_idx").on(table.type),
}));

export const buybackLeadsRelations = relations(buybackLeads, ({ one }) => ({
    store: one(stores, {
        fields: [buybackLeads.storeId],
        references: [stores.id],
    }),
}));

