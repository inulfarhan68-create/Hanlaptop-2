import { pgTable, text, integer, doublePrecision, boolean, timestamp, index, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';
import { stores } from '@/db/schema/store';
import { user } from '@/db/schema/users';
import { customers, suppliers, serviceOrders } from '@/db/schema/crm';
import { inventory } from '@/db/schema/inventory';
import { cashierShifts, technicians } from '@/db/schema/hr';

export const transactions = pgTable("transactions", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().default("default").references(() => stores.id, { onDelete: 'cascade' }),
    transactionType: text("transaction_type").notNull(),
    amount: doublePrecision("amount").notNull(),
    description: text("description"),
    transactionDate: timestamp('transaction_date', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
    invoiceNumber: text("invoice_number"),
    customerName: text("customer_name"),
    customerId: text("customer_id").references(() => customers.id, { onDelete: 'set null' }),
    supplierId: text("supplier_id").references(() => suppliers.id, { onDelete: 'set null' }),
    paymentMethod: text("payment_method"),
    paymentStatus: text("payment_status"),
    dpAmount: doublePrecision("dp_amount").default(0),
    discountAmount: doublePrecision("discount_amount").default(0),
    dueDate: timestamp('due_date', { withTimezone: true }),
    originalTransactionId: text("original_transaction_id"),
    userId: text("user_id").references(() => user.id, { onDelete: 'set null' }),
    shiftId: text("shift_id").references(() => cashierShifts.id, { onDelete: 'set null' }),
    isVoided: boolean("is_voided").notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("transaction_store_id_idx").on(table.storeId),
    customerIdIdx: index("transaction_customer_id_idx").on(table.customerId),
    transactionDateIdx: index("transaction_date_idx").on(table.transactionDate),
    storeInvoiceIdx: uniqueIndex("transaction_store_invoice_idx").on(table.storeId, table.invoiceNumber),
    // SaaS Performance: Added missing indexes
    isVoidedIdx: index("transaction_is_voided_idx").on(table.isVoided),
    transactionTypeIdx: index("transaction_type_idx").on(table.transactionType),
    paymentStatusIdx: index("transaction_payment_status_idx").on(table.paymentStatus),
    userIdIdx: index("transaction_user_id_idx").on(table.userId),
}));

export const transactionItems = pgTable("transaction_items", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    transactionId: text("transaction_id").notNull().references(() => transactions.id, { onDelete: 'cascade' }),
    inventoryId: text("inventory_id").references(() => inventory.id, { onDelete: 'set null' }),
    quantity: integer("quantity").notNull(),
    unitPrice: doublePrecision("unit_price").notNull(),
    serialNumbers: text("serial_numbers"),
}, (table) => ({
    transactionIdIdx: index("transaction_items_tx_id_idx").on(table.transactionId),
    inventoryIdIdx: index("transaction_items_inv_id_idx").on(table.inventoryId),
}));

export const journalEntries = pgTable("journal_entries", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().default("default").references(() => stores.id, { onDelete: 'cascade' }),
    transactionId: text("transaction_id").notNull().references(() => transactions.id, { onDelete: 'cascade' }),
    accountName: text("account_name").notNull(),
    accountCode: text("account_code"),              // References chart_of_accounts.code (nullable for backward compatibility)
    debit: doublePrecision("debit").notNull().default(0),
    credit: doublePrecision("credit").notNull().default(0),
    isVoided: boolean("is_voided").notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("journal_entries_store_id_idx").on(table.storeId),
    transactionIdIdx: index("journal_entries_tx_id_idx").on(table.transactionId),
    createdAtIdx: index("journal_entries_created_at_idx").on(table.createdAt),
    accountCodeIdx: index("journal_entries_account_code_idx").on(table.accountCode),
    debitCheck: check("debit_check", sql`${table.debit} >= 0`),
    creditCheck: check("credit_check", sql`${table.credit} >= 0`),
}));

export const aiPricingLogs = pgTable("ai_pricing_logs", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    specs: text("specs").notNull(),
    condition: text("condition").notNull(),
    recommendedBuyPrice: doublePrecision("recommended_buy_price").notNull(),
    recommendedSellPrice: doublePrecision("recommended_sell_price").notNull(),
    confidenceScore: integer("confidence_score").notNull(),
    reasoning: text("reasoning"),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
});

export const approvalRequests = pgTable("approval_requests", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().default("default").references(() => stores.id, { onDelete: 'cascade' }),
    requesterId: text("requester_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
    actionType: text("action_type").notNull(),
    referenceId: text("reference_id"),
    payload: text("payload").notNull(),
    status: text("status").notNull().default("PENDING"),
    approverId: text("approver_id").references(() => user.id, { onDelete: 'set null' }),
    approvalNotes: text("approval_notes"),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("approval_requests_store_id_idx").on(table.storeId),
    statusIdx: index("approval_requests_status_idx").on(table.status),
}));

export const stockTransfers = pgTable("stock_transfers", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    transferNumber: text("transfer_number").notNull(),
    sourceStoreId: text("source_store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    targetStoreId: text("target_store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("PENDING"),
    notes: text("notes"),
    createdByUserId: text("created_by_user_id").notNull(),
    createdByUserName: text("created_by_user_name").notNull(),
    approvedByUserId: text("approved_by_user_id"),
    approvedByUserName: text("approved_by_user_name"),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    sourceStoreIdx: index("stock_transfer_source_store_idx").on(table.sourceStoreId),
    targetStoreIdx: index("stock_transfer_target_store_idx").on(table.targetStoreId),
    transferNumberIdx: uniqueIndex("stock_transfer_number_idx").on(table.transferNumber),
}));

export const stockTransferItems = pgTable("stock_transfer_items", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    transferId: text("transfer_id").notNull().references(() => stockTransfers.id, { onDelete: "cascade" }),
    inventoryId: text("inventory_id").notNull().references(() => inventory.id, { onDelete: "cascade" }),
    itemName: text("item_name").notNull(),
    quantity: integer("quantity").notNull(),
}, (table) => ({
    transferIdIdx: index("stock_transfer_items_transfer_idx").on(table.transferId),
}));

export const bankMutations = pgTable("bank_mutations", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
    date: text("date").notNull(),
    description: text("description").notNull(),
    amount: doublePrecision("amount").notNull(),
    type: text("type").notNull(),
    reconciled: integer("reconciled").notNull().default(0),
    reconciledTransactionId: text("reconciled_transaction_id").references(() => transactions.id, { onDelete: 'set null' }),
    reconciledServiceOrderId: text("reconciled_service_order_id").references(() => serviceOrders.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("bank_mutations_store_id_idx").on(table.storeId),
    reconciledIdx: index("bank_mutations_reconciled_idx").on(table.reconciled),
}));

export const warrantyClaims = pgTable("warranty_claims", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
    transactionId: text("transaction_id").notNull().references(() => transactions.id, { onDelete: 'cascade' }),
    customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: 'cascade' }),
    passportId: text("passport_id").references(() => devicePassports.id, { onDelete: 'set null' }), // Link to specific device
    technicianId: text("technician_id").references(() => technicians.id, { onDelete: 'set null' }),
    serviceOrderId: text("service_order_id").references(() => serviceOrders.id, { onDelete: 'set null' }),
    status: text("status").notNull().default('SUBMITTED'),
    issueDescription: text("issue_description").notNull(),
    resolutionNotes: text("resolution_notes"),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("warranty_claims_store_id_idx").on(table.storeId),
    transactionIdIdx: index("warranty_claims_transaction_id_idx").on(table.transactionId),
    passportIdIdx: index("warranty_claims_passport_id_idx").on(table.passportId),
    technicianIdIdx: index("warranty_claims_technician_id_idx").on(table.technicianId),
    // SaaS Performance: Added missing indexes
    statusIdx: index("warranty_claims_status_idx").on(table.status),
    customerIdIdx: index("warranty_claims_customer_id_idx").on(table.customerId),
}));

export const warrantyClaimParts = pgTable("warranty_claim_parts", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    claimId: text("claim_id").notNull().references(() => warrantyClaims.id, { onDelete: 'cascade' }),
    inventoryId: text("inventory_id").notNull().references(() => inventory.id, { onDelete: 'cascade' }),
    quantity: integer("quantity").notNull(),
    costPrice: doublePrecision("cost_price").notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
});

export const consignmentPayables = pgTable("consignment_payables", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
    supplierId: text("supplier_id").notNull().references(() => suppliers.id, { onDelete: 'cascade' }),
    inventoryId: text("inventory_id").notNull().references(() => inventory.id, { onDelete: 'cascade' }),
    transactionId: text("transaction_id").references(() => transactions.id, { onDelete: 'set null' }),
    amountDue: doublePrecision("amount_due").notNull(),
    status: text("status").notNull().default('UNPAID'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("consignment_payables_store_id_idx").on(table.storeId),
    supplierIdIdx: index("consignment_payables_supplier_id_idx").on(table.supplierId),
    statusIdx: index("consignment_payables_status_idx").on(table.status),
}));

export const devicePassports = pgTable("device_passports", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().default("default").references(() => stores.id, { onDelete: 'cascade' }),
    serialNumber: text("serial_number").notNull(),
    inventoryId: text("inventory_id").notNull().references(() => inventory.id, { onDelete: 'cascade' }),
    status: text("status").notNull().default("PROCURED"),
    grade: text("grade").notNull().default("NEW"),
    currentTransactionId: text("current_transaction_id").references(() => transactions.id, { onDelete: 'set null' }),
    originalCost: doublePrecision("original_cost").notNull().default(0),
    warrantyEndDate: timestamp("warranty_end_date", { withTimezone: true }),
    // Hardware identification fields
    imei: text("imei"),
    macAddress: text("mac_address"),
    windowsKey: text("windows_key"),
    batterySerial: text("battery_serial"),
    motherboardSerial: text("motherboard_serial"),
    // Device health tracking
    batteryHealth: integer("battery_health"),
    batteryCycle: integer("battery_cycle"),
    healthScore: integer("health_score"),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    snStoreIdx: uniqueIndex("device_passports_sn_store_idx").on(table.serialNumber, table.storeId),
    inventoryIdx: index("device_passports_inventory_idx").on(table.inventoryId),
    statusIdx: index("device_passports_status_idx").on(table.status),
}));

export const deviceLifecycleLogs = pgTable("device_lifecycle_logs", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    passportId: text("passport_id").notNull().references(() => devicePassports.id, { onDelete: 'cascade' }),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    actorId: text("actor_id").references(() => user.id, { onDelete: 'set null' }),
    referenceId: text("reference_id"),
    notes: text("notes"),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    passportIdx: index("device_lifecycle_logs_passport_idx").on(table.passportId),
    referenceIdx: index("device_lifecycle_logs_reference_idx").on(table.referenceId),
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

export const approvalRequestsRelations = relations(approvalRequests, ({ one }) => ({
    store: one(stores, {
        fields: [approvalRequests.storeId],
        references: [stores.id],
    }),
    requester: one(user, {
        fields: [approvalRequests.requesterId],
        references: [user.id],
    }),
    approver: one(user, {
        fields: [approvalRequests.approverId],
        references: [user.id],
    }),
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

export const devicePassportsRelations = relations(devicePassports, ({ one, many }) => ({
    store: one(stores, {
        fields: [devicePassports.storeId],
        references: [stores.id],
    }),
    inventory: one(inventory, {
        fields: [devicePassports.inventoryId],
        references: [inventory.id],
    }),
    currentTransaction: one(transactions, {
        fields: [devicePassports.currentTransactionId],
        references: [transactions.id],
    }),
    logs: many(deviceLifecycleLogs),
}));

export const deviceLifecycleLogsRelations = relations(deviceLifecycleLogs, ({ one }) => ({
    passport: one(devicePassports, {
        fields: [deviceLifecycleLogs.passportId],
        references: [devicePassports.id],
    }),
    actor: one(user, {
        fields: [deviceLifecycleLogs.actorId],
        references: [user.id],
    }),
}));
