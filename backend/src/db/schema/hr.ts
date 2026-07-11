import { pgTable, text, doublePrecision, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { stores } from '@/db/schema/store';
import { user } from '@/db/schema/users';
import { serviceOrders } from '@/db/schema/crm';
import { transactions } from '@/db/schema/transactions';

export const technicians = pgTable("technicians", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().default("default").references(() => stores.id, { onDelete: 'cascade' }),
    name: text("name").notNull(),
    phone: text("phone"),
    isActive: boolean('is_active').notNull().default(true),
    commissionType: text("commission_type").notNull().default('percentage'),
    commissionValue: doublePrecision("commission_value").notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("technician_store_id_idx").on(table.storeId),
}));

export const technicianCommissions = pgTable("technician_commissions", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().default("default").references(() => stores.id, { onDelete: 'cascade' }),
    technicianId: text("technician_id").notNull().references(() => technicians.id, { onDelete: 'cascade' }),
    serviceOrderId: text("service_order_id").notNull().references(() => serviceOrders.id, { onDelete: 'cascade' }),
    transactionId: text("transaction_id").references(() => transactions.id, { onDelete: 'set null' }),
    serviceAmount: doublePrecision("service_amount").notNull().default(0),
    partsAmount: doublePrecision("parts_amount").notNull().default(0),
    commissionAmount: doublePrecision("commission_amount").notNull().default(0),
    status: text("status").notNull().default('UNPAID'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    payoutTransactionId: text("payout_transaction_id").references(() => transactions.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("technician_commission_store_id_idx").on(table.storeId),
    technicianIdIdx: index("technician_commission_tech_id_idx").on(table.technicianId),
    serviceOrderIdIdx: index("technician_commission_so_id_idx").on(table.serviceOrderId),
}));

export const cashierShifts = pgTable("cashier_shifts", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
    userName: text("user_name").notNull(),
    openedAt: timestamp('opened_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    openingBalance: doublePrecision("opening_balance").notNull().default(0),
    closingBalance: doublePrecision("closing_balance"),
    expectedBalance: doublePrecision("expected_balance"),
    difference: doublePrecision("difference"),
    status: text("status").notNull().default("OPEN"),
    notes: text("notes"),
}, (table) => ({
    storeIdIdx: index("cashier_shifts_store_id_idx").on(table.storeId),
    userIdIdx: index("cashier_shifts_user_id_idx").on(table.userId),
}));

export const employees = pgTable("employees", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    role: text("role").notNull().default('Lainnya'),
    userId: text("user_id").references(() => user.id, { onDelete: 'set null' }),
    technicianId: text("technician_id").references(() => technicians.id, { onDelete: 'set null' }),
    basicSalary: doublePrecision("basic_salary").notNull().default(0),
    allowance: doublePrecision("allowance").notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("employees_store_id_idx").on(table.storeId),
    userIdIdx: index("employees_user_id_idx").on(table.userId),
    techIdIdx: index("employees_tech_id_idx").on(table.technicianId),
}));

export const employeeLoans = pgTable("employee_loans", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
    employeeId: text("employee_id").notNull().references(() => employees.id, { onDelete: 'cascade' }),
    amount: doublePrecision("amount").notNull().default(0),
    paidAmount: doublePrecision("paid_amount").notNull().default(0),
    status: text("status").notNull().default('UNPAID'),
    description: text("description"),
    loanDate: timestamp('loan_date', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("employee_loans_store_id_idx").on(table.storeId),
    employeeIdIdx: index("employee_loans_employee_id_idx").on(table.employeeId),
}));

export const payrolls = pgTable("payrolls", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
    employeeId: text("employee_id").notNull().references(() => employees.id, { onDelete: 'cascade' }),
    period: text("period").notNull(),
    basicSalary: doublePrecision("basic_salary").notNull().default(0),
    allowance: doublePrecision("allowance").notNull().default(0),
    commissions: doublePrecision("commissions").notNull().default(0),
    overtime: doublePrecision("overtime").notNull().default(0),
    deductions: doublePrecision("deductions").notNull().default(0),
    netSalary: doublePrecision("net_salary").notNull().default(0),
    paymentMethod: text("payment_method").notNull().default('Cash'),
    paymentStatus: text("payment_status").notNull().default('UNPAID'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    payoutTransactionId: text("payout_transaction_id").references(() => transactions.id, { onDelete: 'set null' }),
    notes: text("notes"),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("payrolls_store_id_idx").on(table.storeId),
    employeeIdIdx: index("payrolls_employee_id_idx").on(table.employeeId),
    periodIdx: index("payrolls_period_idx").on(table.period),
}));

export const attendances = pgTable("attendances", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
    employeeId: text("employee_id").notNull().references(() => employees.id, { onDelete: 'cascade' }),
    date: text("date").notNull(),
    clockIn: timestamp('clock_in', { withTimezone: true }),
    clockOut: timestamp('clock_out', { withTimezone: true }),
    status: text("status").notNull().default('HADIR'),
    photoIn: text("photo_in"),
    photoOut: text("photo_out"),
    locationIn: text("location_in"),
    locationOut: text("location_out"),
    notes: text("notes"),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("attendances_store_id_idx").on(table.storeId),
    employeeIdIdx: index("attendances_employee_id_idx").on(table.employeeId),
    dateIdx: index("attendances_date_idx").on(table.date),
}));

export const purchaseRequisitions = pgTable("purchase_requisitions", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
    requesterId: text("requester_id").notNull().references(() => employees.id, { onDelete: 'cascade' }),
    itemName: text("item_name").notNull(),
    quantity: doublePrecision("quantity").notNull(),
    estimatedCost: doublePrecision("estimated_cost").notNull(),
    supplierName: text("supplier_name"),
    status: text("status").notNull().default('PENDING'),
    notes: text("notes"),
    approvedBy: text("approved_by"),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    storeIdIdx: index("purchase_requisitions_store_id_idx").on(table.storeId),
    statusIdx: index("purchase_requisitions_status_idx").on(table.status),
}));

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
