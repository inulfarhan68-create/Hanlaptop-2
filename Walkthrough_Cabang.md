# Walkthrough: Manajemen Cabang (Branch Management)

Fitur penambahan dan pengelolaan cabang telah berhasil dibuat dan terintegrasi secara penuh!

Berikut adalah hal-hal yang telah ditambahkan:

### 1. Tab Manajemen Cabang di Pengaturan
Halaman pengaturan kini memiliki tab baru bernama **Cabang Toko** (hanya muncul untuk `Owner`).
- Di sini Anda dapat melihat tabel daftar seluruh cabang.
- Terdapat tombol **Tambah Cabang** untuk memasukkan cabang baru beserta *Nama*, *Alamat*, dan *Nomor Telepon* cabang.
- Anda juga bisa **mengedit** (merubah nama/alamat) atau **menghapus** cabang. Penghapusan cabang dilindungi sistem dan akan gagal secara otomatis jika cabang tersebut sudah pernah memiliki riwayat transaksi atau jurnal (untuk mengamankan integritas pembukuan).

### 2. Penugasan Karyawan / Kasir
Pada saat Anda menambahkan Karyawan (Kasir atau Admin baru) di menu **Add Admin**, kini ada form wajib baru bernama **Penugasan Cabang**.
- Anda harus menentukan di Cabang mana Kasir tersebut ditugaskan.
- Saat Kasir login, sistem akan secara otomatis membatasi aksesnya HANYA untuk mengelola inventaris dan transaksi di cabang yang telah Anda tugaskan saat pendaftaran ini!

### 3. API Tambahan Backend
Telah ditambahkan endpoint keamanan penuh di sisi backend:
- `POST /api/stores` untuk mendaftar cabang.
- `PATCH /api/stores/[id]` untuk edit info cabang.
- `DELETE /api/stores/[id]` untuk hapus cabang.
- `POST /api/users/[id]/assign-store` untuk menautkan karyawan yang baru diregistrasi langsung ke toko yang tepat.

Silakan uji coba langsung dengan membuka menu **Pengaturan**, membuat cabang kedua Anda, lalu cobalah membuat akun Kasir baru yang ditugaskan di cabang tersebut!
