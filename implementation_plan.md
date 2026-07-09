# Tahap 7: Keamanan Multi-Tenant & Penyempurnaan Sistem Laporan

## User Review Required
> [!IMPORTANT]
> - Sistem Pencegatan Transaksi (Void) kini aktif dan memerlukan persetujuan pemilik toko (Owner/Manager).
> - Antarmuka Laporan Keuangan telah dinetralisasi menjadi abu-abu Slate profesional agar menyerupai sistem ERP tingkat korporat.

## Proposed Changes

### 1. Dasbor Persetujuan
- **[NEW] Approvals.tsx**: Halaman di rute `/approvals` untuk meninjau pembatalan transaksi.
- **[MODIFY] Sidebar.tsx**: Menambahkan indikator notifikasi jumlah transaksi pending dengan pulse merah.
- **[MODIFY] App.tsx**: Registrasi rute persetujuan.

### 2. UI/UX Laporan Keuangan
- **[MODIFY] Reports.tsx**: Penggantian emoji tombol navigasi dengan Lucide icons.
- **[MODIFY] BalanceSheetReport.tsx & IncomeStatementReport.tsx**: Penyederhanaan palet warna, penghapusan gradien tebal, dan standardisasi ke Slate monokrom.
- **[MODIFY] AgingInventoryTab.tsx**: Standardisasi kartu ringkasan stok agar serasi dengan dashboard umum.

## Verification Plan
- **Kompilasi TypeScript**: Memastikan `npm run build` berjalan tanpa error.
- **Vercel Deployment**: Memastikan build produksi sukses dirilis secara publik.
