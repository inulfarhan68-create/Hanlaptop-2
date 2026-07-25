# Migration Rules

## Next.js Migration Safety Protocol
**CRITICAL RULE**: Jangan pernah mengedit atau mengubah file apapun di dalam direktori `src/` (root project) ketika target migrasi adalah Next.js.
Seluruh perubahan, pembuatan komponen baru, dan penyuntingan logika terkait migrasi **hanya boleh terjadi di dalam direktori `backend/src/`**.

**Alasan**: 
Aplikasi Vite lama yang berjalan di `localhost:5173` bergantung pada file di `src/` (menggunakan `react-router-dom`). Jika file di `src/` diubah untuk menggunakan API Next.js (seperti `next/navigation`), Vite akan crash dengan error seperti `invariant expected app router to be mounted`.

Dengan mematuhi aturan ini:
1. `localhost:5173` (Vite) tetap selalu hidup sebagai *fallback* yang aman.
2. `localhost:3000` (Next.js) berkembang sedikit demi sedikit melalui salinannya sendiri di `backend/src/`.
3. Jika migrasi gagal, aplikasi lama tetap utuh untuk digunakan sebagai perbandingan.


## Migration Checklist (Definition of Done)
Setiap modul yang dimigrasikan wajib memenuhi checklist umum berikut:
- [ ] Tidak ada import `react-router-dom`
- [ ] Tidak ada `import.meta.env`
- [ ] Tidak ada `next/navigation` di dalam `src/` (aturan root)
- [ ] Semua `fetch` dan `useSWR` menggunakan same-origin (`/api/...`)
- [ ] URL state bekerja (search, filter, pagination)
- [ ] BroadcastChannel update berjalan
- [ ] Permission / role validation di server (jangan hanya UI)
- [ ] Mobile responsive
- [ ] `npm run build` (tsc) bersih tanpa error type
- [ ] `localhost:5173` (Vite) tetap hidup
- [ ] `localhost:3000` (Next.js) hidup
- [ ] Tidak ada hydration warning
- [ ] Tidak ada duplicate fetch setelah hydration (Cek Network Tab)

### Expanded CRUD QA Checklist:
- **Customer/Item CRUD**: Tambah, edit, hapus, pencegahan duplikat, cancel dialog.
- **Search**: Debounce, URL State, browser back/forward, persisten saat refresh.
- **Pagination**: Refresh tetap di halaman sama, edit tetap di halaman sama, delete item terakhir otomatis sesuaikan halaman. (Catatan: Skip jika versi Vite memang belum ada pagination).
- **Tenant**: Switch tenant saat loading, saat dialog terbuka, saat search aktif (search query harus bertahan).
- **Multi Tab**: Tab A ubah data -> Tab B otomatis update via BroadcastChannel.
- **Session**: Logout -> Refresh -> Redirect login.


# ?? NEVER MODIFY src/

ONLY COPY FROM src

ALL EDITS GO TO

backend/src

---

## Migration Template (Wajib Untuk Setiap Modul Baru)
Setiap modul yang dimigrasikan ke Next.js (seperti Suppliers, Transactions, Services) harus mengikuti struktur baku ini untuk mempermudah audit dan review:

### 1. Struktur Folder (Contoh: `suppliers`)
```
backend/src/app/(admin)/suppliers/
├── page.tsx       // Server Component (Metadata, Session Check via auth.api.getSession, minimal UI)
└── client.tsx     // Client Orchestrator (State UI, URL State, SWR, pendelegasian props)

backend/src/components/suppliers/
├── SupplierToolbar.tsx  // Header, Search bar, Tab Switcher
├── SupplierTable.tsx    // Rendering Data (Desktop & Mobile view)
└── SupplierDialogs.tsx  // Semua Modal (Add/Edit/Delete) pure client-side
```

### 2. Aturan Server vs Client Component
- **`page.tsx`**: WAJIB Server Component. Digunakan untuk proteksi session dan inject metadata. Tidak boleh ada interaktivitas (onClick, useState).
- **`client.tsx`**: WAJIB Client Component (`"use client"`). Berisi semua hooks, fetcher SWR, dan state form.
- **Dialogs/Modals**: Harus dipisahkan ke komponen client sendiri agar tidak me-reset UI saat `mutate()` menembak ulang data.

### 3. Pola SWR Array Keys
Jangan pernah menggunakan string URL murni sebagai key. Gunakan format array untuk mitigasi kebocoran tenant dan mempermudah invalidasi cache.
✅ **Benar**: `useSWR(['/api/suppliers?search=xxx', storeId])`
❌ **Salah**: `useSWR('/api/suppliers?search=xxx')`

Saat melakukan mutate secara global (dari komponen lain):
✅ **Benar**: `mutate((key) => Array.isArray(key) && key[0].startsWith('/api/suppliers'))`

### 4. URL State
Jangan gunakan `useState` untuk query pencarian atau halaman jika ingin dipertahankan. Gunakan `next/navigation`:
- `useRouter`, `usePathname`, `useSearchParams`
- Saat search berubah: `router.replace(/?search=xxx&page=1)`

### 5. API Fetching
- Ganti semua `import.meta.env.VITE_API_URL` menjadi *relative origin* (`/api/...`).
- Hal ini memastikan traffic ditangkap oleh proxy (development) atau middleware Next.js secara *Same-Origin*.

### 6. BroadcastChannel Multi-Tab Sync
- Setiap `apiFetch` POST/PUT/PATCH/DELETE akan melempar event `api.mutated` dengan membawa `route` yang dimutasi.
- Komponen `Providers.tsx` akan mendengarkannya dan menjalankan SWR `mutate` yang presisi. Tidak perlu menambahkan `BroadcastChannel` lokal di setiap halaman.
