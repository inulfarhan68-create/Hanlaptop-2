/**
 * PBAC (Permission-Based Access Control) Matrix
 * Maps legacy Roles to Granular Permissions.
 * In the future, this matrix can be moved to the database (role_permissions table)
 * for a fully dynamic UI-controlled permission system.
 */

export const Permissions = {
    // Inventory
    INVENTORY_READ: "inventory.read",
    INVENTORY_CREATE: "inventory.create",
    INVENTORY_EDIT: "inventory.edit",
    INVENTORY_DELETE: "inventory.delete",
    INVENTORY_ADJUST: "inventory.adjust", // stock opname
    
    // Transactions
    TRANSACTION_READ: "transaction.read",
    TRANSACTION_CREATE: "transaction.create",
    TRANSACTION_EDIT_METADATA: "transaction.edit.metadata",
    TRANSACTION_VOID: "transaction.void",
    
    // Finance / Ledger
    LEDGER_READ: "ledger.read",
    LEDGER_EXPORT: "ledger.export",
    
    // Services
    SERVICE_READ: "service.read",
    SERVICE_CREATE: "service.create",
    SERVICE_UPDATE_STATUS: "service.update.status",
    
    // CRM
    CUSTOMER_READ: "customer.read",
    CUSTOMER_CREATE: "customer.create",
    CUSTOMER_EDIT: "customer.edit",

    // Settings
    SETTINGS_READ: "settings.read",
    SETTINGS_EDIT: "settings.edit",
} as const;

export type Permission = typeof Permissions[keyof typeof Permissions];

// The Role -> Permission Mapping
export const RolePermissionsMatrix: Record<string, Permission[]> = {
    // Platform operator (SaaS admin) — the only truly global role. Manages tenants.
    "platform_admin": Object.values(Permissions),
    "owner": Object.values(Permissions), // Tenant owner — full permissions within their org
    "manager": [
        Permissions.INVENTORY_READ,
        Permissions.INVENTORY_CREATE,
        Permissions.INVENTORY_EDIT,
        Permissions.INVENTORY_ADJUST,
        Permissions.TRANSACTION_READ,
        Permissions.TRANSACTION_CREATE,
        Permissions.TRANSACTION_EDIT_METADATA,
        Permissions.TRANSACTION_VOID,
        Permissions.LEDGER_READ,
        Permissions.SERVICE_READ,
        Permissions.SERVICE_CREATE,
        Permissions.SERVICE_UPDATE_STATUS,
        Permissions.CUSTOMER_READ,
        Permissions.CUSTOMER_CREATE,
        Permissions.CUSTOMER_EDIT,
        Permissions.SETTINGS_READ,
    ],
    "kasir": [
        Permissions.INVENTORY_READ,
        Permissions.TRANSACTION_READ,
        Permissions.TRANSACTION_CREATE,
        Permissions.TRANSACTION_EDIT_METADATA,
        Permissions.SERVICE_READ,
        Permissions.SERVICE_CREATE,
        Permissions.SERVICE_UPDATE_STATUS, // Kasir should be able to update status
        Permissions.CUSTOMER_READ,
        Permissions.CUSTOMER_CREATE,
        Permissions.CUSTOMER_EDIT,
    ],
    "teknisi": [
        Permissions.SERVICE_READ,
        Permissions.SERVICE_UPDATE_STATUS,
        Permissions.INVENTORY_READ, // To check sparepart stock
    ],
    "investor": [
        Permissions.INVENTORY_READ,
        Permissions.TRANSACTION_READ,
        Permissions.LEDGER_READ,
        Permissions.LEDGER_EXPORT,
        Permissions.SERVICE_READ,
        Permissions.CUSTOMER_READ,
        Permissions.SETTINGS_READ,
    ]
};

/**
 * Helper to check if a role has a specific permission.
 */
export function hasPermission(role: string, permission: Permission): boolean {
    const perms = RolePermissionsMatrix[role] || [];
    return perms.includes(permission);
}
