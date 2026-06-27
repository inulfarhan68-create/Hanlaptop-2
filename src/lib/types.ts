// ── Shared TypeScript types for Han Laptop POS ──

// Inventory
export interface InventoryItem {
  id: string
  itemName: string
  category: "Laptop Bekas" | "Sparepart" | "Aksesoris" | "Jasa Servis"
  specs?: string | null
  barcode?: string | null
  quantity: number
  costPrice: number
  sellingPrice: number
  createdAt: string
}

// Transaction
export type TransactionType =
  | "Penjualan"
  | "Jasa Servis"
  | "Pembelian Stok"
  | "Operasional"
  | "Modal Baru"
  | "Prive"
  | "Pinjaman Bank"
  | "Pelunasan Hutang"
  | "Pembelian Aset Tetap"
  | "Penjualan Aset Tetap"

export type PaymentMethod = "Cash" | "Transfer" | "Tempo" | "QRIS"
export type PaymentStatus = "Lunas" | "Belum Lunas"

export interface Transaction {
  id: string
  transactionType: TransactionType
  amount: number
  description?: string | null
  transactionDate: string
  invoiceNumber?: string | null
  customerName?: string | null
  paymentMethod?: PaymentMethod | null
  paymentStatus?: PaymentStatus | null
  dpAmount?: number
  createdAt: string
  items?: TransactionItem[]
}

export interface TransactionItem {
  id: string
  transactionId: string
  inventoryId?: string | null
  quantity: number
  unitPrice: number
  inventoryItem?: InventoryItem | null
  itemName?: string
}

// Journal
export interface JournalEntry {
  id: string
  transactionId: string
  accountName: string
  debit: number
  credit: number
  createdAt: string
}

// User
export type UserRole = "owner" | "kasir"

export interface User {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image?: string | null
  role: UserRole
  createdAt: string
  updatedAt: string
}

// Cart item (frontend-only)
export interface CartItem {
  id: string
  name: string
  price: number
  qty: number
}

// Restock item (frontend-only)
export interface RestockItem {
  id?: string
  name: string
  category?: string
  qty: number
  buyPrice: number
  sellPrice?: number
  isNew: boolean
  specs?: string
}

// Dashboard data
export interface DashboardData {
  userRole: UserRole
  netProfit: number
  revenue: number
  expenses: number
  cogs: number
  grossMargin: string
  totalAssets: number
  kas: number
  bank: number
  qris: number
  kasLiquid: number
  piutang: number
  inventoryStats: {
    laptopQty: number
    laptopValue: number
    spareQty: number
    spareValue: number
    aksesorisQty: number
    aksesorisValue: number
    totalQty: number
    totalValue: number
  }
  liabilities: number
  equity: number
  revenueDetails: {
    laptop: number
    sparepart: number
    aksesoris: number
    servis: number
  }
  grossMarginDetails: {
    laptop: number
    sparepart: number
    aksesoris: number
    servis: number
  }
  opexDetails: Record<string, number>
  totalTransactions: number
  recentTransactions: Transaction[]
  monthlyData: MonthlyData[]
  monthlyMarginData: MonthlyMarginData[]
  brandSalesData: { name: string; value: number }[]
  topSellingProducts: { name: string; sold: number; revenue: number }[]
}

export interface MonthlyData {
  name: string
  sales: number
  service: number
  aksesoris: number
  totalRevenue: number
  expense: number
  margin: number
  marginValue: number
}

export interface MonthlyMarginData {
  name: string
  laptop: number
  sparepart: number
  aksesoris: number
  servis: number
}

// Store Settings (for future migration to DB)
export interface StoreSettings {
  storeName: string
  storeLogo: string
  storeAddress: string
  storePhone: string
  storeFooter: string
  banks: BankAccount[]
}

export interface BankAccount {
  bank: string
  account: string
  name: string
}
