/**
 * Display labels for activity-log rows.
 *
 * These live outside the component because the audit-log search runs on the
 * server now: the user types Indonesian ("Buat Transaksi"), while the column
 * stores raw codes ("CREATE_TRANSACTION"). The API resolves a search term back to
 * the codes whose label matches, so both sides must read the same map — a copy on
 * each side would drift and the search would quietly stop matching.
 */

export const ACTION_LABELS: Record<string, string> = {
    // Transactions
    'CREATE_TRANSACTION': 'Buat Transaksi',
    'EDIT_TRANSACTION': 'Edit Transaksi',
    'DELETE_TRANSACTION': 'Hapus Transaksi',
    'LUNASI_TRANSACTION': 'Pelunasan Piutang',
    'PAYOFF_TRANSACTION': 'Pelunasan Piutang',
    'RETURN_TRANSACTION': 'Retur Transaksi',

    // Inventory
    'CREATE_INVENTORY': 'Tambah Barang',
    'EDIT_INVENTORY': 'Edit Barang',
    'DELETE_INVENTORY': 'Hapus Barang',
    'UPDATE_INVENTORY': 'Update Barang',
    'CREATE_TRANSFER': 'Transfer Stok',
    'APPROVE_TRANSFER': 'Setujui Transfer',
    'CANCEL_TRANSFER': 'Batalkan Transfer',
    'COMPLETE_OPNAME': 'Stok Opname Selesai',

    // Settings / Stores
    'EDIT_SETTINGS': 'Edit Pengaturan',
    'UPDATE_SETTINGS': 'Update Pengaturan',
    'CREATE_STORE': 'Tambah Cabang',
    'UPDATE_STORE': 'Edit Cabang',
    'DELETE_STORE': 'Hapus Cabang',

    // Services
    'CREATE_SERVICE': 'Terima Servis',
    'UPDATE_SERVICE': 'Update Servis',
    'DELETE_SERVICE': 'Hapus Servis',

    // Shifts
    'OPEN_SHIFT': 'Buka Shift',
    'CLOSE_SHIFT': 'Tutup Shift',

    // Suppliers & Technicians
    'CREATE_SUPPLIER': 'Tambah Supplier',
    'UPDATE_SUPPLIER': 'Edit Supplier',
    'DELETE_SUPPLIER': 'Hapus Supplier',
    'CREATE_TECHNICIAN': 'Tambah Teknisi',
    'UPDATE_TECHNICIAN': 'Edit Teknisi',
    'DELETE_TECHNICIAN': 'Hapus Teknisi',

    // Employees & Payroll
    'CREATE_EMPLOYEE': 'Tambah Karyawan',
    'UPDATE_EMPLOYEE': 'Edit Karyawan',
    'DELETE_EMPLOYEE': 'Hapus Karyawan',
    'CREATE_LOAN': 'Catat Kasbon',
    'UPDATE_LOAN': 'Update Kasbon',
    'CREATE_PAYROLL': 'Generasi Gaji',
    'PAYOUT_PAYROLL': 'Bayar Gaji Karyawan',
};

export const ENTITY_LABELS: Record<string, string> = {
    'transaction': 'Transaksi',
    'inventory': 'Inventori/Stok',
    'settings': 'Pengaturan',
    'service_orders': 'Servis',
    'cashier_shifts': 'Shift Kasir',
    'employees': 'Karyawan',
    'employee_loans': 'Kasbon',
    'payrolls': 'Payroll/Gaji',
    'suppliers': 'Supplier',
    'technicians': 'Teknisi',
    'store': 'Cabang Toko',
    'stores': 'Cabang Toko',
};

/** Unmapped codes fall back to Title Case of the raw value. */
export function formatAction(action: string): string {
    return ACTION_LABELS[action]
        || action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

export function formatEntityType(entityType: string): string {
    return ENTITY_LABELS[entityType.toLowerCase()] || entityType;
}

/**
 * Action codes whose Indonesian label contains `term`, so a search for "Pelunasan"
 * can reach rows stored as LUNASI_TRANSACTION / PAYOFF_TRANSACTION.
 */
export function actionCodesMatching(term: string): string[] {
    const q = term.trim().toLowerCase();
    if (!q) return [];
    return Object.entries(ACTION_LABELS)
        .filter(([code, label]) => label.toLowerCase().includes(q) || code.toLowerCase().includes(q))
        .map(([code]) => code);
}

/** Entity types whose label contains `term`. */
export function entityTypesMatching(term: string): string[] {
    const q = term.trim().toLowerCase();
    if (!q) return [];
    return Object.entries(ENTITY_LABELS)
        .filter(([key, label]) => label.toLowerCase().includes(q) || key.toLowerCase().includes(q))
        .map(([key]) => key);
}

/**
 * The quick-filter groups the audit tab offers. Kept here so the server applies
 * exactly the categories the UI names.
 */
export const ACTION_GROUPS: Record<string, string[]> = {
    create: ['CREATE', 'ADD', 'OPEN'],
    edit: ['EDIT', 'UPDATE', 'LUNASI', 'PAYOFF', 'RETURN', 'APPROVE', 'CANCEL', 'CLOSE', 'PAYOUT'],
    delete: ['DELETE', 'HAPUS', 'RESET'],
    shift: ['SHIFT'],
};
