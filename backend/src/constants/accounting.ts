/**
 * ACCOUNT_CODES
 * 
 * Centralized mapping of Chart of Accounts (COA) numbers.
 * Use these constants instead of hardcoding account strings across the application.
 * This guarantees type safety and simplifies future COA migrations.
 */
export const ACCOUNT_CODES = {
  // Aset Lancar
  KAS: '1110',
  BANK: '1120',
  QRIS: '1130',
  PIUTANG_USAHA: '1140',
  PIUTANG_KARYAWAN: '1141',
  PERSEDIAAN_LAPTOP: '1150',
  PERSEDIAAN_SPAREPART: '1160',
  PERSEDIAAN_AKSESORIS: '1165',
  PERSEDIAAN_BARANG_SERVIS: '1170',
  BARANG_DALAM_PENGIRIMAN: '1180',
  UANG_MUKA_PEMBELIAN: '1190',
  PPN_MASUKAN: '1195',

  // Aset Tetap & Tak Berwujud
  ASET_TETAP: '1210',
  AKUMULASI_PENYUSUTAN: '1220',
  DEPOSIT_SEWA: '1230',
  ASET_DALAM_PERBAIKAN: '1240', // Akun baru (Enterprise)
  GOODWILL: '1250', // Akun baru (SaaS)

  // Liabilitas
  HUTANG_USAHA: '2110',
  HUTANG_GAJI: '2120',
  HUTANG_BANK: '2130',
  HUTANG_KONSINYASI: '2140',
  CADANGAN_GARANSI: '2150', // Akun baru
  VOUCHER_GIFT_CARD: '2160', // Akun baru

  // Ekuitas
  MODAL_AWAL: '3110',
  PRIVE: '3120',
  LABA_DITAHAN: '3130',

  // Pendapatan
  PENJUALAN_LAPTOP: '4110',
  PENJUALAN_SPAREPART: '4120',
  PENJUALAN_AKSESORIS: '4130',
  PENDAPATAN_SERVIS: '4140',
  PENJUALAN_SOFTWARE_LISENSI: '4150', // Akun baru
  PENDAPATAN_TRADE_IN: '4160', // Akun baru
  PENDAPATAN_REFURBISH: '4170', // Akun baru
  PENDAPATAN_GARANSI: '4180', // Akun baru
  PENDAPATAN_INSTALASI: '4190', // Akun baru
  PENDAPATAN_LAIN_LAIN: '4210',

  // Harga Pokok Penjualan (HPP)
  HPP_LAPTOP: '5110',
  HPP_SPAREPART: '5120',
  HPP_AKSESORIS: '5130',
  HPP_SERVIS: '5140',
  HPP_REFURBISH: '5150', // Akun baru
  HPP_TRADE_IN: '5160', // Akun baru

  // Beban Operasional
  BEBAN_GAJI: '5210',
  BEBAN_LISTRIK_AIR: '5220',
  BEBAN_SEWA_GEDUNG: '5230',
  BEBAN_MARKETING: '5240',
  BEBAN_PENYUSUTAN: '5250',
  BEBAN_TRANSPORTASI: '5260',
  BEBAN_LAIN_LAIN: '5270',
  BEBAN_PERBAIKAN: '5280',

  // Beban SaaS / Digital Enterprise (Akun Baru)
  BEBAN_HOSTING: '5310',
  BEBAN_AI_API: '5320',
  BEBAN_PAYMENT_GATEWAY: '5330',
  BEBAN_DOMAIN: '5340',
  BEBAN_CLOUD_STORAGE: '5350',
} as const;

export type AccountCodeValues = typeof ACCOUNT_CODES[keyof typeof ACCOUNT_CODES];

/**
 * Grouped Constants for convenience
 */
export const CASH_EQUIVALENTS = [
  ACCOUNT_CODES.KAS,
  ACCOUNT_CODES.BANK,
  ACCOUNT_CODES.QRIS
];
