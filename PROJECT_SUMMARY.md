# Rangkuman Proyek: Han Laptop (Sistem Informasi Akuntansi & Inventaris Terintegrasi)

Dokumen ini disusun untuk memberikan pemahaman menyeluruh tentang proyek **Han Laptop** kepada **Claude Code** atau model AI lainnya agar dapat berkolaborasi secara efektif.

---

## 1. Profil Bisnis & Deskripsi Proyek
* **Nama Bisnis:** Han Laptop
* **Jenis Bisnis:** Jual-beli laptop bekas, penyedia sparepart, jasa servis, dan layanan tukar tambah (*buyback*).
* **Fungsi Aplikasi:** Aplikasi internal *back-office* dan POS (*Point of Sales*) yang menggabungkan manajemen stok fisik dengan sistem pencatatan keuangan akuntansi berpasangan (*double-entry bookkeeping*).
* **Fitur Utama:**
  * Penjualan barang & jasa servis dengan kalkulasi HPP otomatis (menggunakan metode Average/FIFO).
  * Inventaris multi-kategori (`Laptop Bekas` dan `Sparepart`) lengkap dengan sistem *Quality Control* (QC) dan Stock Opname.
  * Laporan Keuangan otomatis: Neraca (*Balance Sheet*), Laba Rugi (*Profit & Loss*), Arus Kas (*Cash Flow*), dan Perubahan Ekuitas.
  * Manajemen HR: Payroll/gaji karyawan, absensi, komisi teknisi, dan kasbon.
  * CRM: Database pelanggan, riwayat servis, poin keanggotaan (*membership*), dan pengingat janji.
  * Refurbish: Pelacakan siklus hidup unit laptop bekas dari dibeli, diperbaiki, hingga siap dijual (*Device Passport*).

---

## 2. Arsitektur & Teknologi (Tech Stack)

Aplikasi ini menggunakan struktur monorepo lokal dengan pembagian yang jelas antara Frontend dan Backend:

### A. Frontend (Direktori Root)
* **Framework:** React 19 + Vite 8 + TypeScript.
* **Routing:** React Router v7.
* **State Management:** Local React state, custom hooks, dan SWR untuk sinkronisasi data API.
* **Styling:** Tailwind CSS v4 + Radix UI primitives.
* **Komponen & Visualisasi:**
  * Recharts (untuk visualisasi grafik keuangan & analitik).
  * Lucide React (untuk ikon).
  * `jspdf` (untuk membuat invoice cetak/PDF).
  * `xlsx` (untuk ekspor laporan Excel).
* **Titik Masuk Utama:** `src/App.tsx` (konfigurasi routing), `src/main.tsx` (entry point).

### B. Backend (Direktori `/backend`)
* **Framework:** Next.js 16 (App Router) sebagai backend service dan API layer.
* **Database ORM:** Drizzle ORM & Kysely (query builder).
* **Database Engines:**
  * **Development:** SQLite (`local.db` atau `sqlite.db` di folder `/backend`).
  * **Production:** PostgreSQL (menjamin kepatuhan prinsip ACID akuntansi).
* **Authentication:** Better-Auth dengan adapter Drizzle.
* **Integrasi AI:** `@google/genai` untuk otomatisasi estimasi harga (*ai pricing*) dan parsing dokumen.
* **Caching & Rate Limiter:** Upstash Redis & Upstash Ratelimit.

---

## 3. Struktur Modul & Skema Database (`/backend/src/db/schema/`)

Setiap file skema Drizzle di backend mewakili satu modul fungsional sistem:

| File Skema | Deskripsi Modul & Tabel Utama |
| :--- | :--- |
| **`store.ts`** | Multi-tenant support (`organizations`, `stores`, `userStoreAccess`). |
| **`users.ts`** | Autentikasi user (`user`, `session`, `account`, `verification`). |
| **`inventory.ts`** | Manajemen stok (`inventory`), QC (`qcInspections`), Stock Opname (`stockOpnames`, `stockOpnameItems`). |
| **`crm.ts`** | Customer & Vendor (`customers`, `suppliers`), Servis (`serviceOrders`), Tukar Tambah (`buybackLeads`). |
| **`hr.ts`** | Karyawan & Gaji (`employees`, `payrolls`, `attendances`, `technicians`, `technicianCommissions`). |
| **`transactions.ts`** | Penjualan & Pembelian (`transactions`, `transactionItems`), Garansi (`warrantyClaims`), Jurnal Kas (`bankMutations`). |
| **`accounting.ts`** | Bagan Akun (`chartOfAccounts`), Jurnal Akuntansi (`journalEntries`), Aset & Depresiasi (`fixedAssets`, `depreciationEntries`), Tutup Buku (`closingEntries`). |
| **`refurbish.ts`** | Siklus perbaikan unit laptop (`deviceRefurbishments`). |
| **`audit.ts`** | Kepatuhan & Keamanan (`auditLogs`). |

---

## 4. Struktur Direktori Proyek

```text
Hanlaptop-2/
├── backend/                      # Backend Next.js & Database
│   ├── src/
│   │   ├── app/api/              # REST API Routes (CRM, HR, Accounting, dll.)
│   │   ├── db/                   # Database (Schema Drizzle, Seeds, Migrations)
│   │   └── services/             # Logika bisnis & integrasi AI
│   ├── local.db / sqlite.db      # SQLite database file untuk dev
│   └── package.json
├── src/                          # Frontend React SPA
│   ├── components/               # Komponen UI modular per kategori bisnis
│   ├── pages/                    # Halaman Dashboard, Inventaris, Keuangan, dll.
│   ├── lib/                      # Utilitas umum & pembantu logika
│   └── App.tsx                   # Konfigurasi routing frontend
├── prd.md                        # Dokumen persyaratan produk (PRD) asli
└── package.json                  # Konfigurasi package manager frontend
```

---

## 5. Command & Script Penting untuk Development

### Menjalankan Frontend (Vite)
Jalankan dari direktori **root**:
```powershell
npm run dev
# Menjalankan server development di http://localhost:5173
```

### Menjalankan Backend (Next.js)
Jalankan dari direktori **`/backend`**:
```powershell
cd backend
npm run dev
# Menjalankan server backend di http://localhost:3000
```

### Script Terkait Database (di folder `/backend`)
* Sinkronisasi skema ke SQLite local: `npx drizzle-kit push`
* Melakukan seeding data contoh/dummy: `npm run seed`
* Memeriksa isi database local: `npx tsx src/db/check-db.ts`
