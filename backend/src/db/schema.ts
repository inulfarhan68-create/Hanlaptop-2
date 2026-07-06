export * from './schema/users';
export * from './schema/store';
export * from './schema/inventory';
export * from './schema/hr';
export * from './schema/crm';
export * from './schema/transactions';
export * from './schema/accounting';

import { organizations, stores, userStoreAccess, activityLogs, storeSettings } from './schema/store';
import { user, session, account, verification } from './schema/users';
import { inventory, qcInspections, stockOpnames, stockOpnameItems } from './schema/inventory';
import { customers, suppliers, serviceOrders, buybackLeads, membershipPoints, crmReminders } from './schema/crm';
import { technicians, technicianCommissions, cashierShifts, employees, employeeLoans, payrolls, attendances, purchaseRequisitions } from './schema/hr';
import { transactions, transactionItems, journalEntries, aiPricingLogs, approvalRequests, stockTransfers, stockTransferItems, bankMutations, warrantyClaims, warrantyClaimParts, consignmentPayables, devicePassports, deviceLifecycleLogs } from './schema/transactions';
import { chartOfAccounts, fiscalPeriods, fixedAssets, depreciationEntries, closingEntries } from './schema/accounting';
import { relations } from 'drizzle-orm';

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
    chartOfAccounts: many(chartOfAccounts),
    fiscalPeriods: many(fiscalPeriods),
    fixedAssets: many(fixedAssets),
    depreciationEntries: many(depreciationEntries),
    closingEntries: many(closingEntries),
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

export const buybackLeadsRelations = relations(buybackLeads, ({ one }) => ({
    store: one(stores, {
        fields: [buybackLeads.storeId],
        references: [stores.id],
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

// ── Accounting Relations ─────────────────────────────────────────────────────
export const chartOfAccountsRelations = relations(chartOfAccounts, ({ one, many }) => ({
    store: one(stores, {
        fields: [chartOfAccounts.storeId],
        references: [stores.id],
    }),
    parent: one(chartOfAccounts, {
        fields: [chartOfAccounts.parentId],
        references: [chartOfAccounts.id],
        relationName: "accountHierarchy",
    }),
    children: many(chartOfAccounts, { relationName: "accountHierarchy" }),
}));

export const fiscalPeriodsRelations = relations(fiscalPeriods, ({ one, many }) => ({
    store: one(stores, {
        fields: [fiscalPeriods.storeId],
        references: [stores.id],
    }),
    closedByUser: one(user, {
        fields: [fiscalPeriods.closedBy],
        references: [user.id],
    }),
    depreciationEntries: many(depreciationEntries),
    closingEntry: one(closingEntries, {
        fields: [fiscalPeriods.id],
        references: [closingEntries.fiscalPeriodId],
    }),
}));

export const fixedAssetsRelations = relations(fixedAssets, ({ one, many }) => ({
    store: one(stores, {
        fields: [fixedAssets.storeId],
        references: [stores.id],
    }),
    depreciationEntries: many(depreciationEntries),
}));

export const depreciationEntriesRelations = relations(depreciationEntries, ({ one }) => ({
    store: one(stores, {
        fields: [depreciationEntries.storeId],
        references: [stores.id],
    }),
    fixedAsset: one(fixedAssets, {
        fields: [depreciationEntries.fixedAssetId],
        references: [fixedAssets.id],
    }),
    fiscalPeriod: one(fiscalPeriods, {
        fields: [depreciationEntries.fiscalPeriodId],
        references: [fiscalPeriods.id],
    }),
}));

export const closingEntriesRelations = relations(closingEntries, ({ one }) => ({
    store: one(stores, {
        fields: [closingEntries.storeId],
        references: [stores.id],
    }),
    fiscalPeriod: one(fiscalPeriods, {
        fields: [closingEntries.fiscalPeriodId],
        references: [fiscalPeriods.id],
    }),
    closedByUser: one(user, {
        fields: [closingEntries.closedBy],
        references: [user.id],
    }),
}));
