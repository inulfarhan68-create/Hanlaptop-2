## 7.2 Dasbor Mesin Persetujuan (Approval Engine)
Menindaklanjuti fungsi audit, sistem kini dilengkapi **Sistem Pencegatan Transaksi (Interceptor & Approval)** berskala Enterprise untuk menangkal aksi berbahaya.

1. **Dasbor Peninjauan (Approvals.tsx)**
   Menyediakan antarmuka kustom di rute `/approvals` tempat manajer bisa meninjau riwayat transaksi mencurigakan yang ditahan. Manajer bisa melihat siapa yang meminta *(Requester)*, alasan aksi *(Reason)*, dan status eksekusi.
   
2. **Pengeksekusi Dinamis Terpadu**
   Halaman dasbor langsung terkoneksi dengan API `POST /api/approvals/[id]`. Saat manajer mengklik **Approve**, API otomatis akan meretur jurnal akuntansi secara proporsional dan mengubah status _Digital Passport_ dari perangkat yang dikembalikan kembali menjadi `READY_FOR_SALE` di _background_.

3. **Indikator Kewaspadaan Cepat (Badge Notification)**
   Sebuah _badge_ berwarna merah beranimasi nadi (_pulse_) otomatis akan berkedip di *Sidebar* jika ada pengajuan pembatalan transaksi masuk. Lencana ini langsung ditenagai oleh fungsi _real-time polling_ SWR sehingga manajer tak pernah kelewatan notifikasi kritis.

## 7.3 Pembersihan Tampilan UI/UX Menu Laporan (Reports UI/UX Cleanup)
Untuk menghadirkan antarmuka laporan keuangan tingkat korporasi yang bersih, elegan, dan profesional, visual menu Laporan telah disempurnakan:

1. **Pembersihan Emojis di Navigasi Utama**
   - Emojis pada tab navigasi laporan (📈, 📊, 💻, dll.) digantikan dengan ikon minimalis modern dari Lucide React (`TrendingUp`, `Scale`, `Package`, `UserCheck`, `Wrench`, `BookOpen`).

2. **Perampingan Visual Neraca & Laba Rugi**
   - Menghapus aksen warna-warni pelangi mencolok dan gradien neon tebal pada baris Laba Kotor, Laba Bersih, Aset, Kewajiban, dan Ekuitas.
   - Baris total dan tajuk tabel kini menggunakan warna Slate elegan yang konsisten dengan standar pelaporan profesional.

3. **Netralisasi Kartu Klasifikasi Umur Stok**
   - Kartu berwarna pastel neon solid (hijau, oranye, mawar) digantikan dengan kartu netral transparan dengan garis tepi halus, memfokuskan warna hanya pada titik indikator lingkarannya saja.

## 7.4 Pembaruan Terakhir: Resolusi Error Fatal Vercel (HTTP 500)

## Akar Masalah
Setelah melakukan investigasi mendalam terhadap pesan "Gagal memuat data cabang: HTTP 500", terungkap bahwa **server Vercel mengalami crash total** (`FUNCTION_INVOCATION_FAILED`). Masalah ini **sama sekali bukan** disebabkan oleh database atau fungsi *fetch* cabang, melainkan disebabkan oleh konflik fatal pada **Next.js App Router**:

Terdapat dua folder dinamis pada rute yang persis sama:
- `backend/src/app/api/inventory/passports/[id]`
- `backend/src/app/api/inventory/passports/[sn]`

Berdasarkan aturan Next.js, Anda tidak boleh meletakkan dua parameter dinamis (`[id]` dan `[sn]`) di tingkat hierarki folder yang sama. Hal ini menyebabkan kompilasi rute Next.js gagal saat *runtime*, yang berakibat pada hancurnya seluruh API di server produksi Vercel. Inilah mengapa API untuk mengambil pengaturan cabang ikut meledak dengan status 500.

## Perbaikan yang Dilakukan

1. **Restrukturisasi Rute API**
   - Rute pencarian Serial Number (`[sn]`) dipindahkan dan diganti namanya menjadi lebih spesifik agar tidak bertabrakan dengan pencarian ID: 
   - `api/inventory/passports/by-sn/[sn]`
2. **Penyesuaian Integrasi Frontend**
   - Memperbarui komponen `DigitalPassport.tsx` agar memanggil URL rute yang baru, yakni `/api/inventory/passports/by-sn/{serialNumber}`.
3. **Deploy Ulang ke Produksi**
   - Mendorong *(push)* perbaikan ke GitHub sehingga Vercel segera membangun ulang sistem *routing* backend dengan benar.

## Hasil
Setelah *deployment* Vercel selesai (dalam 1-3 menit), rute API tidak akan lagi bertabrakan. Semua *endpoint* API (termasuk halaman manajemen Cabang di tab Pengaturan) kini akan berjalan normal tanpa mengalami *crash* HTTP 500. Anda bisa merefresh situs *live* Anda dan memastikan seluruh data dapat dimuat.
