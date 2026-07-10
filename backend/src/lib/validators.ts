import { z } from "zod";

// 1. Inventory Validation Schema
export const inventorySchema = z.object({
    itemName: z.string().min(1, "Nama barang wajib diisi"),
    category: z.string().min(1, "Kategori wajib diisi"),
    quantity: z.number().int("Stok harus berupa bilangan bulat").nonnegative("Stok tidak boleh negatif").default(0),
    minStock: z.number().int("Batas minimum harus berupa bilangan bulat").nonnegative("Batas minimum tidak boleh negatif").optional().default(2),
    costPrice: z.number().nonnegative("Harga modal tidak boleh negatif").default(0),
    sellingPrice: z.number().nonnegative("Harga jual tidak boleh negatif").default(0),
    specs: z.string().nullable().optional(),
    barcode: z.string().nullable().optional(),
    isPublished: z.boolean().optional().default(false),
    condition: z.enum(['NEW', 'USED_A', 'USED_B', 'USED_C', 'BROKEN', 'IN_INSPECTION']).optional().default('NEW'),
    isConsignment: z.boolean().optional().default(false),
    tracksSerialNumber: z.boolean().optional().default(false),
    supplierId: z.string().nullable().optional(),
    imageUrl: z.string().nullable().optional(),
});

// 2. Transaction Item Schema
export const transactionItemSchema = z.object({
    inventoryId: z.string().nullable().optional(),
    quantity: z.number().int("Jumlah harus bulat").positive("Jumlah harus lebih dari 0"),
    unitPrice: z.number().nonnegative("Harga satuan tidak boleh negatif"),
    serialNumbers: z.array(z.string()).nullable().optional(),
    // Fields for restock of new items
    itemName: z.string().optional(),
    category: z.string().optional(),
    sellingPrice: z.number().nonnegative().optional(),
    specs: z.string().nullable().optional(),
    tracksSerialNumber: z.boolean().optional().default(false),
});

// 3. Transaction Validation Schema
export const transactionSchema = z.object({
    transactionType: z.enum([
        "Penjualan", 
        "Jasa Servis", 
        "Pembelian Stok", 
        "Operasional", 
        "Modal Baru", 
        "Prive",
        "Pinjaman Bank",
        "Pelunasan Hutang",
        "Pembelian Aset Tetap",
        "Penjualan Aset Tetap",
        "Retur Penjualan",
        "Transfer Keluar",
        "Transfer Masuk",
        "Tukar Tambah",
        "Buyback",
        "Pembayaran Konsinyasi"
    ]),
    amount: z.number().nonnegative("Total nominal transaksi tidak boleh negatif"),
    description: z.string().nullable().optional(),
    paymentMethod: z.string().nullable().optional(),
    paymentStatus: z.string().nullable().optional(),
    dpAmount: z.number().nonnegative("DP tidak boleh negatif").default(0),
    discountAmount: z.number().nonnegative("Diskon tidak boleh negatif").default(0),
    dueDate: z.string().nullable().optional().transform(val => val ? new Date(val) : null),
    customerName: z.string().nullable().optional(),
    customerPhone: z.string().nullable().optional(),
    customerAddress: z.string().nullable().optional(),
    customerId: z.string().nullable().optional(),
    supplierId: z.string().nullable().optional(),
    metadata: z.any().optional(),
    items: z.array(transactionItemSchema).optional().default([]),
});

/** Validated transaction payload — the output type of {@link transactionSchema}. */
export type TransactionInput = z.infer<typeof transactionSchema>;
/** Validated single line-item — the output type of {@link transactionItemSchema}. */
export type TransactionItemInput = z.infer<typeof transactionItemSchema>;

// 4. Customer Validation Schema
export const customerSchema = z.object({
    name: z.string().min(1, "Nama pelanggan wajib diisi"),
    phone: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
});

// 4b. Supplier Validation Schema
export const supplierSchema = z.object({
    name: z.string().min(1, "Nama supplier wajib diisi"),
    phone: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
});

// 4c. Technician Validation Schema
export const technicianSchema = z.object({
    name: z.string().min(1, "Nama teknisi wajib diisi"),
    phone: z.string().nullable().optional(),
    isActive: z.boolean().optional().default(true),
    commissionType: z.enum(["percentage", "fixed"]).optional().default("percentage"),
    commissionValue: z.number().nonnegative("Nilai komisi tidak boleh negatif").optional().default(0),
});

// 5. Service Order Validation Schema
export const serviceOrderSchema = z.object({
    customerId: z.string().nullable().optional(),
    customerName: z.string().min(1, "Nama pelanggan wajib diisi"),
    customerPhone: z.string().nullable().optional(),
    customerAddress: z.string().nullable().optional(),
    deviceName: z.string().min(1, "Nama unit/device wajib diisi"),
    issue: z.string().min(1, "Kerusakan/masalah wajib diisi"),
    status: z.string().default("Diterima"),
    technicianName: z.string().nullable().optional(),
    technicianId: z.string().nullable().optional(),
    estimatedCost: z.number().nonnegative("Estimasi biaya tidak boleh negatif").default(0),
    finalCost: z.number().nonnegative("Biaya final tidak boleh negatif").default(0),
    notes: z.string().nullable().optional(),
    warrantyClaimed: z.boolean().optional().default(false),
    originalTransactionId: z.string().nullable().optional(),
    completedDate: z.string().nullable().optional().transform(val => val ? new Date(val) : null),
    warrantyUntil: z.string().nullable().optional().transform(val => val ? new Date(val) : null),
});

// 6. Store Settings Validation Schema
export const storeSettingsSchema = z.object({
    storeName: z.string().min(1, "Nama toko wajib diisi"),
    storeAddress: z.string().min(1, "Alamat toko wajib diisi"),
    storePhone: z.string().min(1, "No Telepon toko wajib diisi"),
    storeLogo: z.string().nullable().optional(),
    storeSignature: z.string().nullable().optional(),
    storeFooter: z.string().nullable().optional(),
    waTemplatePiutang: z.string().nullable().optional(),
    waTemplateUmum: z.string().nullable().optional(),
    waTemplateNota: z.string().nullable().optional(),
    waTemplateServiceDiterima: z.string().nullable().optional(),
    waTemplateServiceDikerjakan: z.string().nullable().optional(),
    waTemplateServiceMenungguPart: z.string().nullable().optional(),
    waTemplateServiceSelesai: z.string().nullable().optional(),
    waTemplateServiceBatal: z.string().nullable().optional(),
    storeBanks: z.union([z.string(), z.array(z.any())]).nullable().optional(),
    enableCashierShift: z.boolean().optional(),
    expenseCategories: z.union([z.string(), z.array(z.string())]).nullable().optional(),
    serviceIssues: z.union([z.string(), z.array(z.any())]).nullable().optional(),
    applyToAllBranches: z.boolean().optional(),
});

// 7. Stock Transfer Validation Schema
export const stockTransferItemSchema = z.object({
    inventoryId: z.string().min(1, "Inventory ID barang wajib diisi"),
    itemName: z.string().min(1, "Nama barang wajib diisi"),
    quantity: z.number().int("Kuantitas harus bulat").positive("Kuantitas harus lebih dari 0"),
});

export const stockTransferSchema = z.object({
    targetStoreId: z.string().min(1, "Cabang tujuan wajib diisi"),
    notes: z.string().nullable().optional(),
    items: z.array(stockTransferItemSchema).min(1, "Minimal harus ada satu barang yang ditransfer"),
});

// 8. Opname Schemas
export const createOpnameSchema = z.object({
    notes: z.string().nullable().optional(),
});

export const updateOpnameItemSchema = z.object({
    id: z.string().min(1, "Item ID wajib diisi"),
    physicalQty: z.number().int("Stok fisik harus bilangan bulat").nonnegative("Stok fisik tidak boleh negatif"),
    note: z.string().nullable().optional(),
});

export const updateOpnameSchema = z.object({
    items: z.array(updateOpnameItemSchema).min(1, "Minimal harus ada satu item"),
    notes: z.string().nullable().optional(),
});

// 9. Cashier Shift Schemas
export const openShiftSchema = z.object({
    openingBalance: z.number().nonnegative("Modal awal tidak boleh negatif"),
    notes: z.string().nullable().optional(),
});

export const closeShiftSchema = z.object({
    closingBalance: z.number().nonnegative("Uang fisik aktual tidak boleh negatif"),
    notes: z.string().nullable().optional(),
});

// 10. Store Schemas
export const createStoreSchema = z.object({
    name: z.string().min(1, "Nama cabang wajib diisi"),
    address: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
});

export const updateStoreSchema = z.object({
    name: z.string().min(1, "Nama cabang wajib diisi").optional(),
    address: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
});

// 11. User Management Schemas
export const createUserSchema = z.object({
    name: z.string().min(1, "Nama wajib diisi"),
    email: z.string().email("Format email tidak valid"),
    password: z.string().min(6, "Password minimal 6 karakter"),
    role: z.enum(["owner", "manager", "kasir", "investor"], {
        message: "Role harus owner, manager, kasir, atau investor",
    }),
    storeId: z.string().optional(),
    storeIds: z.array(z.string()).optional(),
});

export const updateUserSchema = z.object({
    name: z.string().min(1, "Nama wajib diisi"),
    role: z.enum(["owner", "manager", "kasir", "investor"], {
        message: "Role harus owner, manager, kasir, atau investor",
    }),
});

export const assignStoreSchema = z.object({
    storeIds: z.array(z.string().min(1)).optional(),
    storeId: z.string().optional(),
    role: z.string().optional(),
});

export const updateEmailSchema = z.object({
    newEmail: z.string().email("Format email tidak valid"),
});

// 12. Factory Reset Schema
export const resetDbSchema = z.object({
    confirmation: z.literal("HAPUS SEMUA DATA", {
        message: "Konfirmasi harus tepat: HAPUS SEMUA DATA",
    }),
});

// 13. Backup Restore Schema
export const restoreBackupSchema = z.object({
    version: z.literal("1.0", { message: "Versi backup tidak kompatibel" }),
    storeId: z.string().optional(),
    backupDate: z.string().optional(),
    data: z.object({
        storeSettings: z.any().nullable().optional(),
        customers: z.array(z.any()).optional().default([]),
        inventory: z.array(z.any()).optional().default([]),
        transactions: z.array(z.any()).optional().default([]),
        transactionItems: z.array(z.any()).optional().default([]),
        journalEntries: z.array(z.any()).optional().default([]),
        serviceOrders: z.array(z.any()).optional().default([]),
        activityLogs: z.array(z.any()).optional().default([]),
    }),
});

// 14. Return Transaction Schema
export const returnItemSchema = z.object({
    inventoryId: z.string().min(1, "Inventory ID wajib diisi"),
    quantity: z.number().int("Jumlah retur harus bilangan bulat").positive("Jumlah retur harus lebih dari 0"),
    unitPrice: z.number().nonnegative("Harga satuan tidak boleh negatif"),
    serialNumbers: z.array(z.string()).nullable().optional(),
});

export const returnTransactionSchema = z.object({
    items: z.array(returnItemSchema).min(1, "Minimal harus ada satu item untuk diretur"),
    refundMethod: z.string().min(1, "Metode refund wajib diisi"),
    refundAmount: z.number().nonnegative("Nominal refund tidak boleh negatif"),
    reason: z.string().nullable().optional(),
});

// 15. Employee Validation Schema
export const employeeSchema = z.object({
    name: z.string().min(1, "Nama wajib diisi"),
    phone: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    role: z.string().min(1, "Jabatan wajib diisi"),
    userId: z.string().nullable().optional(),
    technicianId: z.string().nullable().optional(),
    basicSalary: z.number().nonnegative("Gaji pokok tidak boleh negatif").default(0),
    allowance: z.number().nonnegative("Tunjangan tidak boleh negatif").default(0),
    isActive: z.boolean().optional().default(true),
});

// 16. Employee Loan Validation Schema
export const employeeLoanSchema = z.object({
    employeeId: z.string().min(1, "Karyawan wajib dipilih"),
    amount: z.number().positive("Nominal pinjaman harus lebih besar dari 0"),
    description: z.string().nullable().optional(),
    loanDate: z.string().nullable().optional().transform(val => val ? new Date(val) : new Date()),
});

// 17. Payroll Validation Schema
export const payrollSchema = z.object({
    employeeId: z.string().min(1, "Karyawan wajib dipilih"),
    period: z.string().min(1, "Periode bulan wajib diisi"), // 'YYYY-MM'
    basicSalary: z.number().nonnegative().default(0),
    allowance: z.number().nonnegative().default(0),
    commissions: z.number().nonnegative().default(0),
    overtime: z.number().nonnegative().default(0),
    deductions: z.number().nonnegative().default(0),
    notes: z.string().nullable().optional(),
});

// 18. QC Inspection Schema
export const qcInspectionSchema = z.object({
    inventoryId: z.string().min(1, "Inventory ID wajib diisi"),
    technicianId: z.string().min(1, "Teknisi pemeriksa wajib dipilih"),
    // Per-component scores (0-100)
    screenScore: z.number().int().min(0).max(100).default(100), // Layar: white spot, dead pixel
    batteryHealth: z.number().int().min(0).max(100).default(100), // Baterai health %
    keyboardScore: z.number().int().min(0).max(100).default(100), // Keyboard functionality
    usbPortsScore: z.number().int().min(0).max(100).default(100), // Port USB
    hingeScore: z.number().int().min(0).max(100).default(100), // Engsel
    wifiScore: z.number().int().min(0).max(100).default(100), // Wi-Fi
    bodyScore: z.number().int().min(0).max(100).default(100), // Fisik body / cosmetics
    // Battery cycle count
    batteryCycle: z.number().int().min(0).optional().default(0),
    // Component status checks (PASS/FAIL/NOT_TESTED)
    touchpadStatus: z.enum(['PASS', 'FAIL', 'NOT_TESTED']).default('NOT_TESTED'),
    speakerStatus: z.enum(['PASS', 'FAIL', 'NOT_TESTED']).default('NOT_TESTED'),
    micStatus: z.enum(['PASS', 'FAIL', 'NOT_TESTED']).default('NOT_TESTED'),
    bluetoothStatus: z.enum(['PASS', 'FAIL', 'NOT_TESTED']).default('NOT_TESTED'),
    webcamStatus: z.enum(['PASS', 'FAIL', 'NOT_TESTED']).default('NOT_TESTED'),
    hdmiStatus: z.enum(['PASS', 'FAIL', 'NOT_TESTED']).default('NOT_TESTED'),
    chargingStatus: z.enum(['PASS', 'FAIL', 'NOT_TESTED']).default('NOT_TESTED'),
    fingerprintStatus: z.enum(['PASS', 'FAIL', 'NOT_TESTED']).default('NOT_TESTED'),
    // Grade is auto-calculated but can be overridden
    grade: z.enum(['A', 'B', 'C', 'REJECT'], { message: "Grade tidak valid" }).optional(),
    notes: z.string().nullable().optional(),
});

// 19. Warranty Claim Schema
export const warrantyClaimSchema = z.object({
    transactionId: z.string().min(1, "ID Transaksi wajib diisi"),
    customerId: z.string().min(1, "ID Pelanggan wajib diisi"),
    issueDescription: z.string().min(1, "Deskripsi keluhan wajib diisi"),
    technicianId: z.string().nullable().optional(), // Optional: assign technician at creation
});

// 20. Warranty Resolution Schema
export const warrantyResolutionSchema = z.object({
    status: z.enum(['INSPECTING', 'REPAIRING', 'COMPLETED', 'RETURNED', 'REJECTED']),
    technicianId: z.string().nullable().optional(),
    resolutionNotes: z.string().nullable().optional(),
    partsUsed: z.array(z.object({
        inventoryId: z.string(),
        quantity: z.number().int().positive(),
        costPrice: z.number().nonnegative()
    })).optional().default([]),
});

// 21. Consignment Payment Schema
export const consignmentPaymentSchema = z.object({
    payableIds: z.array(z.string()).min(1, "Pilih minimal satu tagihan konsinyasi untuk dibayar"),
});
