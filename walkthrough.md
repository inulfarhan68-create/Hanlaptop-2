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
