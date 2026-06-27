Berikut adalah dokumen lengkap yang siap Anda salin (*copy-paste*) ke aplikasi pengolah kata seperti Microsoft Word, Google Docs, atau Notion. Format di bawah ini sudah disesuaikan agar rapi dan profesional saat diunduh.

---

# PROJECT REQUIREMENTS DOCUMENT (PRD)

**Nama Proyek:** Sistem Informasi Akuntansi & Inventaris Terintegrasi “Han Laptop”

**Versi:** 1.0

**Tanggal:** 29 Mei 2026

**Status:** Siap Eksekusi (*Vibe Coding Ready*)

---

## 1. Overview

### 1.1 Ringkasan Produk

Han Laptop adalah aplikasi web *back-office* internal yang menggabungkan fungsi Manajemen Inventaris (Stok) dan Sistem Informasi Akuntansi (SIA). Aplikasi ini dirancang khusus untuk operasional bisnis jual-beli laptop bekas, penyediaan sparepart, dan jasa servis.

### 1.2 Masalah & Solusi

* **Masalah:** Pencatatan stok dan keuangan yang terpisah sering menyebabkan inkonsistensi data. Pemilik kesulitan mengetahui Harga Pokok Penjualan (HPP) riil dari laptop bekas yang skema belinya fluktuatif, serta sulit memantau performa keuangan secara standar akuntansi tanpa keahlian finansial yang dalam.
* **Solusi:** Sistem otomatisasi di mana setiap transaksi (pembelian stok, penjualan barang, jasa servis) langsung memperbarui jumlah inventaris secara *real-time* dan menjurnal otomatis ke dalam Laporan Laba Rugi serta Neraca (*Balance Sheet*).

### 1.3 Tujuan Proyek

Membangun aplikasi web tangguh yang *reliable*, memiliki fungsi *double-entry bookkeeping* otomatis di latar belakang, dan memberikan visualisasi KPI bisnis yang akurat bagi pemilik melalui interaksi UI yang sederhana.

---

## 2. Requirements

### 2.1 Fungsional Keuangan (Akuntansi)

* Sistem harus menerapkan prinsip dasar persamaan akuntansi secara konsisten:

$$\text{Aset} = \text{Kewajiban} + \text{Ekuitas}$$


* Setiap transaksi harus mencatat nominal debit dan kredit secara otomatis di latar belakang (*Automated Journaling*).
* Perhitungan HPP (Harga Pokok Penjualan) menggunakan metode **Average** atau **FIFO** yang konsisten untuk mendeteksi profit riil per unit laptop yang terjual.

### 2.2 Fungsional Inventaris

* Stok tidak boleh bernilai negatif ($< 0$). Sistem wajib menolak transaksi penjualan jika kuantitas barang di invoice melebihi stok fisik yang tersedia.
* Setiap barang harus memiliki pelacakan kuantitas yang jelas, dengan pemisahan kategori yang tegas antara unit laptop bekas dan sparepart biasa.

### 2.3 Non-Fungsional

* **Keamanan:** Autentikasi berbasis email aman menggunakan enkripsi standar industri dan manajemen sesi (*Session Management*).
* **Performa:** Pengisian invoice dan pencarian stok harus responsif dengan waktu muat di bawah 2 detik.
* **Ekspor Data:** Laporan keuangan dan dokumen invoice harus dapat diunduh atau dicetak dalam format PDF yang rapi.

---

## 3. Core Features

### 3.1 Autentikasi Akun

* Halaman login aman menggunakan Email & Password.
* Proteksi rute halaman (*Middleware*): Pengguna yang belum login otomatis dialihkan kembali ke halaman `/login`.

### 3.2 Dashboard KPI (Multi-Filter)

* Filter utama berdasarkan pilihan **Bulan** dan **Tahun**.
* *Metrics Cards:* Total Pendapatan, Total Pengeluaran, Laba Bersih, dan Nilai Aset Inventaris Aktif.
* *Chart:* Grafik tren bulanan (Batang/Garis) membandingkan omzet Penjualan vs Jasa Servis vs Pengeluaran Operasional.

### 3.3 Manajemen Stok Inventory

* Tabel CRUD (*Create, Read, Update, Delete*) untuk manajemen barang.
* Kategori barang dipisahkan menjadi: `Laptop Bekas` dan `Sparepart`.
* Kolom data meliputi: SKU/ID, Nama Barang, Kategori, Qty, Harga Modal (HPP), Harga Jual, dan Status Stok (*In Stock, Low Stock, Out of Stock*).

### 3.4 Transaksi & Generator Invoice

* **Modul Input Transaksi Multi-Form:**
1. *Penjualan / Servis:* Pengisian item, harga, diskon, nama pelanggan $\rightarrow$ Mengurangi stok otomatis $\rightarrow$ Menghasilkan Invoice ID.
2. *Pembelian Stok:* Input barang baru atau menambah kuantitas $\rightarrow$ Menambah stok otomatis $\rightarrow$ Mencatat pengeluaran kas untuk aset.
3. *Biaya Operasional:* Pencatatan beban bulanan (Gaji, Listrik, Sewa Tempat).
4. *Ekuitas:* Input Modal Baru dari pemilik atau Prive (Penarikan Pribadi pemilik).


* **Modul Invoice:** Halaman riwayat seluruh invoice dengan fitur cetak PDF bersih untuk pelanggan.

### 3.5 Laporan Keuangan Otomatis

* **Laporan Laba Rugi (Profit & Loss):** Menampilkan total pendapatan (penjualan + servis) dikurangi HPP untuk menghasilkan Laba Kotor, kemudian dikurangi biaya operasional untuk menghasilkan Laba Bersih.
* **Laporan Neraca (Balance Sheet):** Menampilkan posisi keuangan yang seimbang antara Aset (Kas + Nilai Inventaris) dengan Ekuitas (Modal Awal - Prive + Laba Ditahan).

---

## 4. User Flow

### 4.1 Flow Penjualan & Invoice

```
[User Login] ──> [Dashboard] ──> [Menu Transaksi] ──> [Klik "Tambah Penjualan"]
                                                               │
                                                               ▼
[Invoice Dicetak] <── [Stok Berkurang &] <── [Simpan] <── [Isi Data Pelanggan &]
                      [Jurnal Akuntansi]   Transaksi      [Pilih Item dari Stok]

```

1. Admin masuk ke Menu **Invoice / Transaksi Baru**.
2. Ketik nama pelanggan, lalu pilih barang dari *dropdown search* (mengambil data langsung dari tabel `inventory`).
3. Jika Qty yang dimasukkan valid (stok mencukupi), klik **Selesaikan Transaksi**.
4. Sistem otomatis mengurangi Qty di tabel `inventory`, mencatat penjualan di tabel `transactions`, membuat invoice PDF, dan memperbarui grafik Dashboard secara *real-time*.

### 4.2 Flow Pembelian Stok (Restock)

1. Admin masuk ke Menu Transaksi $\rightarrow$ Pilih **Pembelian Stok**.
2. Mengisi form: Nama barang, Kategori, Jumlah (Qty), dan Harga Beli per Unit.
3. Klik **Simpan**:
* Jika barang sudah ada di tabel `inventory`, nilai Qty akan bertambah. Jika barang baru, sistem membuat baris data baru.
* Kas di Laporan Neraca otomatis berkurang, dan nilai Aset Persediaan bertambah.



---

## 5. Architecture

Aplikasi menggunakan arsitektur **Client-Server modern (Serverless backend)** yang sangat optimal untuk instruksi *vibe coding* karena meminimalkan konfigurasi infrastruktur manual.

```
┌────────────────────────────────────────────────────────┐
│                      CLIENT SIDE                       │
│  Next.js (React) App Router / Tailwind CSS / Shadcn UI │
└───────────────────────────┬────────────────────────────┘
                            │
               HTTPS / WebSockets (Realtime)
                            │
┌───────────────────────────▼────────────────────────────┐
│                    BACKEND & DATABASE                  │
│  Supabase (Auth, PostgreSQL Relational Database, RLS)  │
└────────────────────────────────────────────────┘

```

* **Frontend Layer:** Komponen React yang memanfaatkan *state management* lokal untuk mengelola keranjang belanja (*cart item*) pada invoice sebelum disimpan ke database.
* **Database Layer:** PostgreSQL menjamin integritas data akuntansi menggunakan *Database Triggers* atau *Stored Procedures* untuk memastikan bahwa pengurangan stok dan pencatatan kas terjadi dalam satu transaksi aman (*ACID Compliance*). Jika salah satu proses gagal, seluruh transaksi otomatis dibatalkan (*rollback*).

---

## 6. Database Schema

Berikut adalah rancangan skema tabel database relasional (PostgreSQL) yang siap dieksekusi oleh AI:

```sql
-- 1. Tabel Inventaris / Stok
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) CHECK (category IN ('Laptop Bekas', 'Sparepart')),
    quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    cost_price NUMERIC(15, 2) NOT NULL DEFAULT 0, -- Harga modal (HPP)
    selling_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabel Transaksi Utama
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_type VARCHAR(50) CHECK (transaction_type IN ('Penjualan', 'Jasa Servis', 'Pembelian Stok', 'Operasional', 'Modal Baru', 'Prive')),
    amount NUMERIC(15, 2) NOT NULL,
    description TEXT,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    invoice_number VARCHAR(100) UNIQUE 
);

-- 3. Tabel Detail Transaksi (Item di dalam Invoice/Pembelian)
CREATE TABLE transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    inventory_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(15, 2) NOT NULL -- Harga saat transaksi terjadi
);

-- 4. Tabel Jurnal Akuntansi (Double-Entry Ledger Otomatis)
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    account_name VARCHAR(100) NOT NULL, -- 'Kas', 'Persediaan', 'Pendapatan', 'HPP', 'Modal', dll
    debit NUMERIC(15, 2) DEFAULT 0,
    credit NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

```

---

## 7. Tech Stack

Komponen *tech stack* berikut dipilih karena memiliki ekosistem komponen siap pakai yang melimpah, mempercepat pembuatan kode oleh AI (*Vibe Coding Velocity*):

* **Framework:** `Next.js (App Router)` atau `Vite + React` (Sangat cepat di-kompilasi oleh AI).
* **Database & Auth:** `Supabase` (Menyediakan PostgreSQL langsung dengan sistem autentikasi siap pakai).
* **Styling & UI:** `Tailwind CSS` + `Shadcn UI` (Untuk tampilan tabel, dialog, form, dan dashboard modern yang bersih).
* **Charts/Grafik:** `Recharts` atau `Chart.js` (Sangat baik untuk visualisasi KPI keuangan).
* **PDF Generator:** `jspdf` atau `@react-pdf/renderer` (Untuk fungsi cetak invoice langsung menjadi file PDF).