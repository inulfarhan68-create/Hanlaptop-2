# BUSINESS_RULES.md

Aturan bisnis yang **ditemukan langsung di kode** (bukan tebakan). Sumber utama: `backend/src/services/TransactionService.ts`, `InventoryService.ts`, `JournalMappingService.ts`, `lib/digital-passport.ts`, `lib/validators.ts`, dan route handler terkait. Jika suatu aturan tidak tercantum di sini, berarti belum dikonfirmasi dari kode.

---

## 1. Jenis Transaksi

`transactionType` (dari `validators.ts` → `transactionSchema`) memiliki 16 nilai:

`Penjualan`, `Jasa Servis`, `Pembelian Stok`, `Operasional`, `Modal Baru`, `Prive`, `Pinjaman Bank`, `Pelunasan Hutang`, `Pembelian Aset Tetap`, `Penjualan Aset Tetap`, `Retur Penjualan`, `Transfer Keluar`, `Transfer Masuk`, `Tukar Tambah`, `Buyback`, `Pembayaran Konsinyasi`.

Nomor invoice dibuat otomatis dengan format **`INV/YYYY/MM/XXX`**, sekuensial per **store per bulan** (di-reset tiap bulan, padding 3 digit).

Pemetaan metode pembayaran → akun kas/bank (`liquidAccount`):
| paymentMethod | Akun |
| --- | --- |
| `Cash` | Kas |
| `Transfer Bank` | Bank |
| `Qris` | QRIS |
| `Tempo` | Kas (default) |

---

## 2. Alur Penjualan (`Penjualan`)

Dijalankan atomik dalam satu `db.transaction()` (`TransactionService.createTransaction`):

1. **Validasi & customer:** jika `customerName` diisi tanpa `customerId`, sistem mencari customer bernama sama di store tersebut; jika ada dipakai (dan phone/address diisi bila kosong), jika tidak ada dibuat baru.
2. **Cek stok:** item ditolak jika `quantity` melebihi stok, atau jika `condition === 'IN_INSPECTION'` (unit dalam proses QC **tidak boleh dijual**).
3. **Pengurangan stok aman-konkuren:** update memakai kondisi `quantity >= item.quantity`; bila 0 baris ter-update (ada checkout bersamaan) → error "concurrent checkout".
4. **Serial Number:** bila item `tracksSerialNumber`, jumlah SN yang diisi **harus sama** dengan kuantitas jual; SN disimpan sebagai JSON string di `transactionItems.serialNumbers`.
5. **Digital Passport:** untuk tiap SN, status device ditransisikan ke `SOLD` (via `transitionDeviceStatus`). Jika passport tidak ditemukan → hanya warning (di-skip), error lain dilempar.
6. **Jurnal (double-entry)** dibuat sesuai komposisi item:
   - Barang reguler: kredit **Penjualan Laptop** sebesar harga jual; debit **HPP Laptop** & kredit **Persediaan** sebesar HPP.
   - Barang konsinyasi (`isConsignment` + `supplierId`): kredit **Pendapatan Komisi** (selisih jual−modal, jika positif) & kredit **Utang Konsinyasi** (modal); serta insert baris `consignmentPayables` status `UNPAID`.
   - Pembayaran: debit akun likuid (Kas/Bank/QRIS) sebesar DP/lunas; sisa sebagai debit **Piutang Usaha**.
7. **HPP (COGS)** = `costPrice × quantity` per item.

### DP & Piutang
- Jika `paymentStatus === "Belum Lunas"`: yang dibayar = `dpAmount`, sisanya (`amount − dp`) → **Piutang Usaha**.
- Selain itu dianggap lunas penuh (`dp = amount`).

---

## 3. Alur Pembelian Stok (`Pembelian Stok`)

- Menambah `quantity` inventory.
- **Harga modal memakai rata-rata bergerak (moving weighted average):**
  `newCostPrice = (qtyLama × costLama + qtyBeli × hargaBeli) / (qtyLama + qtyBeli)`.
- `sellingPrice` diperbarui bila dikirim.
- Item yang sudah soft-deleted (`deletedAt`) ditolak.
- SN yang di-track juga divalidasi/diproses (registrasi passport).

---

## 4. Jasa Servis (`Jasa Servis`)

- Jurnal: kredit **Pendapatan Servis** sebesar `amount`; debit akun likuid (DP/lunas) & **Piutang Usaha** untuk sisa.

Status service order (`serviceOrderSchema.status`, default **`Diterima`**) mengalir melalui tahapan (template WhatsApp di store settings mengindikasikan): *Diterima → Dikerjakan → Menunggu Part → Selesai / Batal*. Nilai status disimpan sebagai teks bebas.

---

## 5. Markdown / Penurunan Nilai (`InventoryService.applyMarkdown`)

- Hanya membuat jurnal bila harga **turun** (`oldPrice − newPrice > 0`). Kenaikan/tetap hanya update harga.
- Membuat transaksi dummy `Operasional` (invoice `MKD-<timestamp>`), lalu jurnal: debit **Beban Penurunan Nilai Persediaan**, kredit **Persediaan** sebesar selisih.
- Mencatat `activityLogs` aksi `APPLY_MARKDOWN`.

---

## 6. Konsinyasi

- Barang konsinyasi ditandai `isConsignment = true` + `supplierId`.
- Saat terjual: modal → **Utang Konsinyasi** (kewajiban ke supplier), margin → **Pendapatan Komisi**, dan tercatat di `consignmentPayables` (status `UNPAID`).
- Pelunasan lewat transaksi `Pembayaran Konsinyasi` / endpoint `consignment/payables` (skema `consignmentPaymentSchema` menerima daftar `payableIds`).

---

## 7. Digital Passport (Serial Number Tracking)

Status device (`PassportStatus` di `lib/digital-passport.ts`):

```
PROCURED → INBOUND_QC → READY_FOR_SALE → RESERVED → SOLD
                                        ↘ UNDER_SERVICE
                                        ↘ TRADED_IN
                                        ↘ WRITTEN_OFF
```

- Setiap transisi mencatat `deviceLifecycleLogs` (`fromStatus`, `toStatus`, alasan, user, transaksi terkait).
- Registrasi awal (`registerDevicePassport`) default status `READY_FOR_SALE`.
- Passport punya kolom `grade` (default `NEW`) dan `status` (default `PROCURED`) pada tabel `devicePassports`.

---

## 8. Quality Control (QC)

Dari `qcInspectionSchema`:
- Skor per komponen 0–100: layar, baterai (health %), keyboard, port USB, engsel, Wi-Fi, body/kosmetik. Plus `batteryCycle`.
- Status komponen (`PASS`/`FAIL`/`NOT_TESTED`): touchpad, speaker, mic, bluetooth, webcam, HDMI, charging, fingerprint.
- **Grade** akhir: `A`, `B`, `C`, atau `REJECT` (dihitung otomatis, bisa di-override).
- Kondisi inventory (`inventorySchema.condition`): `NEW`, `USED_A`, `USED_B`, `USED_C`, `BROKEN`, `IN_INSPECTION`.

---

## 9. Shift Kasir

- Bila `storeSettings.enableCashierShift !== false` (default aktif) **dan** user berperan `kasir`, user **wajib membuka shift** sebelum membuat transaksi (`transactions/route.ts` menolak dengan 400 jika belum ada shift `OPEN`).
- Transaksi yang dibuat menyimpan `shiftId` dari shift aktif.
- Membuat transaksi memerlukan store spesifik — `storeId === "all"` ditolak.

---

## 10. Retur Penjualan (`returnTransactionSchema`)

- Membutuhkan minimal 1 item, `refundMethod`, dan `refundAmount`.
- Endpoint: `transactions/[id]/return`.

---

## 11. Akuntansi (Double-Entry)

- Semua jurnal masuk ke tabel `journalEntries` dengan pasangan `debit`/`credit` dan **`accountCode` yang dipetakan otomatis** dari `accountName` (`JournalMappingService.getAccountCodeFromName`). Jangan menulis kode akun manual — pakai nama akun standar.
- `chartOfAccounts` menyimpan `normalBalance` (`Debit`/`Credit`); saldo akun dihitung sesuai sifat normal (`AccountingService.calculateAccountBalance`).
- Jurnal punya flag `isVoided` — entri void dikecualikan dari perhitungan laporan.
- **Periode fiskal:** `isPeriodClosed(storeId, year, month)` — periode yang sudah ditutup memblokir posting (lihat `PeriodClosingService`).
- Laporan yang tersedia: Neraca (balance-sheet), Laba Rugi (income-statement), Arus Kas (cash-flow), Perubahan Ekuitas (equity-changes), Neraca Saldo (trial-balance), Buku Besar (general-ledger).

### Ringkasan pemetaan akun (dari `JournalMappingService`)
| Nama akun (contoh) | Kelompok |
| --- | --- |
| Kas, Bank, QRIS, Piutang Usaha, Persediaan (Laptop/Sparepart/Aksesoris), PPN Masukan | Aset lancar |
| Aset Tetap (kendaraan/peralatan/komputer), Akumulasi Penyusutan | Aset tetap |
| Utang Usaha, Utang Konsinyasi, Utang Pajak/PPN Keluaran (2130), Uang Muka Pelanggan (2140), Hutang Bank | Kewajiban |
| Modal Pemilik (3100), Laba Ditahan/Prive (3200), Laba/Rugi Berjalan (3300) | Modal |
| Penjualan Laptop, Pendapatan Servis, Pendapatan Komisi | Pendapatan |
| HPP Laptop, Beban Penurunan Nilai Persediaan | Beban/HPP |

---

## 12. Aset Tetap & Penyusutan

- `fixedAssets` + `depreciationEntries`. Endpoint `accounting/fixed-assets` dan `accounting/fixed-assets/depreciate` untuk memproses penyusutan (jurnal Akumulasi Penyusutan).

---

## 13. Garansi (Warranty)

- Klaim (`warrantyClaimSchema`) butuh `transactionId`, `customerId`, deskripsi keluhan.
- Resolusi (`warrantyResolutionSchema`) status: `INSPECTING`, `REPAIRING`, `COMPLETED`, `RETURNED`, `REJECTED`; bisa mencatat `partsUsed` (mengurangi stok sparepart).
- Endpoint `warranty/check` untuk cek masa garansi.

---

## 14. CRM & Poin

- `awardPoints` (`lib/crm-helper.ts`) memberi poin membership saat transaksi memenuhi syarat.
- Buyback lead (`buybackLeads`) — estimasi harga beli via `public/buyback/estimate` (AI).

---

## 15. HR & Payroll

- Payroll (`payrollSchema`) per periode `YYYY-MM`: gaji pokok + tunjangan + komisi + lembur − potongan.
- Komisi teknisi (`technicianCommissions`): tipe `percentage` atau `fixed` (`technicianSchema`), diproses saat service selesai; payout via `technicians/payout`.
- Kasbon karyawan (`employeeLoans`).

---

## 16. Approval Workflow

- `createApprovalRequest` (`lib/workflow.ts`) + tabel `approvalRequests` (status default `PENDING`). Dipakai untuk aksi yang butuh persetujuan (mis. transfer stok, void). Endpoint `approvals`, `inventory/transfers/[id]/approve`.

---

## 17. Import Nota via AI (`inventory/import-ai`)

- Mengirim file (base64 + mimeType) ke Gemini dengan system prompt ketat. Ekstraksi:
  - Kategori dipaksa ke salah satu: `Laptop Bekas`, `Sparepart`, `Aksesoris`.
  - **Saran harga jual = `costPrice × 1.25`** (markup 25%), dibulatkan ke ribuan terdekat.
  - Angka dinormalkan ke integer bersih (buang "Rp", titik, koma).
  - Baris jasa (Jasa Servis, ongkir, biaya rakit) **diabaikan** dari daftar item.
