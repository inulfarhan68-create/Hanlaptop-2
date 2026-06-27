import { useState } from "react"
import { createPortal } from "react-dom"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UserPlus, AlertCircle, Shield, Trash2, Edit2, Users, CheckCircle2, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import { useSession, signIn } from "@/lib/auth-client"
import useSWR from "swr"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function AdminManagementTab() {
  const { data: session } = useSession()
  
  // SWR fetches
  const { data: usersList, isLoading: usersLoading, mutate: mutateUsers } = useSWR((import.meta.env.VITE_API_URL || '') + '/api/users')
  const { data: branchesList } = useSWR((import.meta.env.VITE_API_URL || '') + '/api/stores')

  // Admin Registration State
  const [newAdminName, setNewAdminName] = useState("")
  const [newAdminEmail, setNewAdminEmail] = useState("")
  const [newAdminPassword, setNewAdminPassword] = useState("")
  const [newAdminRole, setNewAdminRole] = useState("kasir")
  const [newAdminStoreId, setNewAdminStoreId] = useState("")
  const [newAdminStoreIds, setNewAdminStoreIds] = useState<string[]>([])
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminSuccess, setAdminSuccess] = useState("")
  const [adminError, setAdminError] = useState("")

  // Edit User Modal State
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [editUserName, setEditUserName] = useState("")
  const [editUserRole, setEditUserRole] = useState("")
  const [editUserStoreIds, setEditUserStoreIds] = useState<string[]>([])

  // Factory Reset State
  const [resetConfirmation, setResetConfirmation] = useState("")
  const [resetPassword, setResetPassword] = useState("")
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState("")
  const [resetSuccess, setResetSuccess] = useState("")

  const handleRegisterAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdminLoading(true)
    setAdminError("")
    setAdminSuccess("")

    if (newAdminPassword.length < 8) {
      setAdminError("Password harus minimal 8 karakter")
      setAdminLoading(false)
      return
    }

    let targetStoreIds: string[] = []
    if (newAdminRole === "owner") {
      targetStoreIds = branchesList && branchesList.length > 0 ? [branchesList[0].id] : ["default"]
    } else if (newAdminRole === "manager" || newAdminRole === "investor") {
      targetStoreIds = newAdminStoreIds
    } else {
      targetStoreIds = newAdminStoreId ? [newAdminStoreId] : []
    }

    if (targetStoreIds.length === 0 && newAdminRole !== "owner") {
      setAdminError("Harap pilih minimal satu cabang penugasan")
      setAdminLoading(false)
      return
    }

    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAdminName,
          email: newAdminEmail,
          password: newAdminPassword,
          role: newAdminRole,
          storeIds: targetStoreIds
        })
      });

      const result = await res.json();

      if (res.ok) {
        setAdminSuccess(`Karyawan ${newAdminEmail} berhasil didaftarkan!`)
        setNewAdminName("")
        setNewAdminEmail("")
        setNewAdminPassword("")
        setNewAdminStoreId("")
        setNewAdminStoreIds([])
        mutateUsers()
        toast.success("Pengguna baru berhasil ditambahkan!")
      } else {
        setAdminError(result.error || "Gagal mendaftarkan admin")
      }
    } catch (err) {
      setAdminError("Terjadi kesalahan pada server")
    } finally {
      setAdminLoading(false)
    }
  }

  const handleOpenEditUser = (u: any) => {
    setEditingUser(u)
    setEditUserName(u.name)
    setEditUserRole(u.role)
    const assignedIds = u.stores ? u.stores.map((s: any) => s.storeId) : []
    setEditUserStoreIds(assignedIds)
    setIsEditUserModalOpen(true)
  }

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUserName.trim()) {
      toast.error("Nama wajib diisi")
      return
    }

    let targetStoreIds = editUserStoreIds
    if (editUserRole === "owner") {
      targetStoreIds = branchesList && branchesList.length > 0 ? [branchesList[0].id] : ["default"]
    }

    if (targetStoreIds.length === 0 && editUserRole !== "owner") {
      toast.error("Pilih minimal satu cabang penugasan")
      return
    }

    try {
      // 1. Update name and role
      const resUser = await fetch((import.meta.env.VITE_API_URL || '') + `/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editUserName, role: editUserRole })
      })
      if (!resUser.ok) {
        const err = await resUser.json()
        throw new Error(err.error || "Gagal memperbarui profil pengguna")
      }

      // 2. Update store assignments
      const resAssign = await fetch((import.meta.env.VITE_API_URL || '') + `/api/users/${editingUser.id}/assign-store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeIds: targetStoreIds, role: editUserRole })
      })
      if (!resAssign.ok) {
        const err = await resAssign.json()
        throw new Error(err.error || "Gagal memperbarui cabang penugasan")
      }

      toast.success("Data pengguna berhasil diperbarui!")
      setIsEditUserModalOpen(false)
      mutateUsers()
    } catch (e: any) {
      toast.error(e.message || "Terjadi kesalahan")
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus akun ini secara permanen?")) return;
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/users/${userId}`, { method: 'DELETE' })
      if (!res.ok) {
         const data = await res.json()
         throw new Error(data.error || "Gagal menghapus pengguna")
      }
      toast.success("Akun berhasil dihapus!")
      mutateUsers()
    } catch (e: any) {
      toast.error(e.message || "Terjadi kesalahan")
    }
  }

  const handleFactoryReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetLoading(true)
    setResetError("")
    setResetSuccess("")

    if (resetConfirmation !== "HAPUS SEMUA DATA") {
      setResetError("Kata konfirmasi tidak sesuai")
      setResetLoading(false)
      return
    }

    try {
      const { error: signInError } = await signIn.email({ 
        email: session?.user?.email || "", 
        password: resetPassword 
      })

      if (signInError) {
        setResetError("Password admin salah!")
        setResetLoading(false)
        return
      }

      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/reset', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: resetConfirmation })
      })

      const data = await res.json()

      if (!res.ok) {
        setResetError(data.error || "Gagal mereset database")
      } else {
        setResetSuccess("Semua data transaksi dan inventaris berhasil dihapus bersih!")
        setResetConfirmation("")
        setResetPassword("")
        setTimeout(() => setResetSuccess(""), 5000)
        toast.success("Database berhasil di-reset pabrik!");
      }
    } catch (err: any) {
      setResetError("Terjadi kesalahan pada server")
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Registrasi Pengguna Baru Card */}
      <Card className="border border-border/80 shadow-sm overflow-hidden rounded-2xl">
        <CardHeader className="border-b border-border/40 pb-4 bg-muted/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <UserPlus className="h-5 w-5" />
            </div>
            <div className="text-left">
              <CardTitle className="text-base font-bold">Pendaftaran Karyawan Baru</CardTitle>
              <CardDescription className="text-xs">Buat akun login sistem untuk staff karyawan dengan hak akses tertentu.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <form onSubmit={handleRegisterAdmin}>
          <CardContent className="space-y-4 pt-6 text-left">
            {adminError && (
              <div className="flex items-center gap-2 p-3 text-xs font-semibold text-destructive bg-destructive/10 rounded-xl border border-destructive/20 animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{adminError}</span>
              </div>
            )}
            {adminSuccess && (
              <div className="flex items-center gap-2 p-3 text-xs font-semibold text-emerald-600 bg-emerald-500/10 rounded-xl border border-emerald-500/20 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{adminSuccess}</span>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Nama Lengkap Karyawan</label>
                <Input 
                  required 
                  placeholder="Contoh: Budi Gunawan" 
                  value={newAdminName} 
                  onChange={e => setNewAdminName(e.target.value)} 
                  className="rounded-xl h-10 text-xs font-semibold"
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Email Login</label>
                <Input 
                  type="email" 
                  required 
                  placeholder="Contoh: budi@hanlaptop.com" 
                  value={newAdminEmail} 
                  onChange={e => setNewAdminEmail(e.target.value)} 
                  className="rounded-xl h-10 text-xs font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Kata Sandi Login</label>
                <Input 
                  type="password" 
                  required 
                  minLength={8}
                  placeholder="Minimal 8 karakter" 
                  value={newAdminPassword} 
                  onChange={e => setNewAdminPassword(e.target.value)} 
                  className="rounded-xl h-10 text-xs"
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Jabatan (Hak Akses)</label>
                <select 
                  value={newAdminRole}
                  onChange={(e) => {
                    setNewAdminRole(e.target.value)
                    setNewAdminStoreIds([])
                    setNewAdminStoreId("")
                  }}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="kasir">Kasir (Transaksi & Servis)</option>
                  <option value="manager">Manager (Akses Penuh Cabang Terpilih)</option>
                  <option value="owner">Owner / Admin Utama (Akses Semua Cabang)</option>
                  <option value="investor">Investor (Read-only Dashboard & Laporan)</option>
                </select>
              </div>
            </div>
            
            {newAdminRole === "kasir" && (
              <div className="grid gap-1.5 animate-in slide-in-from-top-2 duration-200">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Penugasan Cabang Toko</label>
                <select 
                  value={newAdminStoreId}
                  onChange={(e) => setNewAdminStoreId(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-bold focus:outline-none"
                  required
                >
                  <option value="" disabled>Pilih cabang penugasan kasir...</option>
                  {branchesList?.map((b: any) => (
                     <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}

            {(newAdminRole === "manager" || newAdminRole === "investor") && (
              <div className="grid gap-1.5 animate-in slide-in-from-top-2 duration-200">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Pilih Otorisasi Cabang Akses (Bisa Multiselect)</label>
                <div className="grid grid-cols-2 gap-2.5 border rounded-2xl p-3 bg-muted/20 max-h-40 overflow-y-auto">
                  {branchesList?.map((b: any) => (
                    <label key={b.id} className="flex items-center gap-2 text-xs font-semibold cursor-pointer hover:text-primary transition-colors select-none p-1 rounded-lg">
                      <input 
                        type="checkbox" 
                        checked={newAdminStoreIds.includes(b.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewAdminStoreIds([...newAdminStoreIds, b.id])
                          } else {
                            setNewAdminStoreIds(newAdminStoreIds.filter(id => id !== b.id))
                          }
                        }}
                        className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                      />
                      <span>{b.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t border-border/40 px-6 py-3.5 flex justify-end bg-muted/10">
            <Button className="gap-2 rounded-xl font-bold h-9 text-xs" type="submit" disabled={adminLoading}>
              {adminLoading ? "Memproses..." : <><UserPlus className="h-4 w-4" /> Daftarkan Karyawan</>}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Daftar Pengguna Card */}
      <Card className="border border-border/80 shadow-sm overflow-hidden rounded-2xl">
        <CardHeader className="border-b border-border/40 pb-4 bg-muted/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Users className="h-5 w-5" />
            </div>
            <div className="text-left">
              <CardTitle className="text-base font-bold">Daftar Pengguna Aktif</CardTitle>
              <CardDescription className="text-xs">Lihat, edit cabang penugasan, atau hapus akses login karyawan.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 text-left">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/5">
                <TableRow>
                  <TableHead className="text-xs font-bold">Nama Karyawan</TableHead>
                  <TableHead className="text-xs font-bold">Email</TableHead>
                  <TableHead className="text-xs font-bold">Tingkat Akses (Role)</TableHead>
                  <TableHead className="text-xs font-bold">Cabang Penugasan</TableHead>
                  <TableHead className="text-right text-xs font-bold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-xs font-semibold text-muted-foreground">Memuat data pengguna...</TableCell></TableRow>
                ) : !usersList || usersList.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-xs font-semibold text-muted-foreground">Tidak ada pengguna ditemukan.</TableCell></TableRow>
                ) : (
                  usersList.map((u: any) => {
                    const isSelf = session?.user?.id === u.id;
                    return (
                      <TableRow key={u.id} className="hover:bg-muted/10 transition-colors border-b border-border/40">
                        <TableCell className="font-bold text-xs text-foreground flex items-center gap-2 py-3.5">
                          {u.name}
                          {isSelf && (
                            <span className="text-[8px] font-black uppercase bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full tracking-wider">
                              Saya
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase font-black tracking-wider border ${
                            u.role === 'owner' 
                              ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' 
                              : u.role === 'manager'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : u.role === 'investor'
                              ? 'bg-purple-500/10 text-purple-600 border-purple-500/20'
                              : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                          }`}>
                            {u.role}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-semibold max-w-[150px] truncate text-foreground">
                          {u.role === 'owner' 
                            ? 'Semua Cabang' 
                            : u.stores && u.stores.length > 0 
                            ? u.stores.map((s: any) => s.storeName).join(", ") 
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right space-x-1 whitespace-nowrap py-2.5">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-[10px] font-bold rounded-xl gap-1"
                            onClick={() => handleOpenEditUser(u)}
                            disabled={isSelf}
                          >
                            <Edit2 className="h-3 w-3" /> Edit
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-full"
                            onClick={() => handleDeleteUser(u.id)}
                            disabled={isSelf}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Factory Reset Danger Zone */}
      <Card className="border border-rose-500/20 overflow-hidden rounded-2xl shadow-sm">
        <CardHeader className="bg-rose-500/[0.03] border-b border-rose-500/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="text-left">
              <CardTitle className="text-base font-bold text-rose-600 dark:text-rose-500">ZONA BAHAYA: Reset Pabrik (Factory Reset)</CardTitle>
              <CardDescription className="text-xs text-rose-500/80">Hapus seluruh database operasional toko secara permanen dan kembalikan ke kondisi kosong.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <form onSubmit={handleFactoryReset}>
          <CardContent className="space-y-4 pt-6 text-left">
            {resetError && (
              <div className="flex items-center gap-2 p-3 text-xs font-semibold text-destructive bg-destructive/10 rounded-xl border border-destructive/20 animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}
            {resetSuccess && (
              <div className="flex items-center gap-2 p-3 text-xs font-semibold text-emerald-600 bg-emerald-500/10 rounded-xl border border-emerald-500/20 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{resetSuccess}</span>
              </div>
            )}

            <div className="flex gap-3 p-3.5 bg-rose-500/[0.04] text-rose-700 dark:text-rose-500/90 text-xs font-medium rounded-xl border border-rose-500/20 leading-relaxed">
              <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-1">Tindakan Ini Tidak Dapat Dibatalkan!</p>
                <p>Seluruh transaksi, stok barang (inventori), kasbon, pembayaran gaji, jurnal akunting, supplier, dan log aktivitas di seluruh cabang akan DIHAPUS BERSIH. Akun login admin Anda tetap aman dan tidak terhapus.</p>
              </div>
            </div>
            
            <div className="grid gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-rose-500">Ketik kata konfirmasi: "HAPUS SEMUA DATA"</label>
              <Input 
                required 
                placeholder="HAPUS SEMUA DATA" 
                value={resetConfirmation} 
                onChange={e => setResetConfirmation(e.target.value.toUpperCase())} 
                className="border-rose-500/30 focus-visible:ring-rose-500/50 rounded-xl h-10 text-xs font-bold"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Kata Sandi Otorisasi Admin</label>
              <Input 
                type="password" 
                required 
                placeholder="Masukkan kata sandi login Anda" 
                value={resetPassword} 
                onChange={e => setResetPassword(e.target.value)} 
                className="rounded-xl h-10 text-xs"
              />
            </div>
          </CardContent>
          <CardFooter className="border-t border-rose-500/10 px-6 py-3.5 flex justify-between bg-rose-500/[0.02] items-center gap-4">
            <p className="text-[10px] text-muted-foreground font-medium leading-normal w-2/3">Dengan menekan tombol hapus, Anda menyetujui penghapusan database total secara permanen.</p>
            <Button 
              className="gap-2 rounded-xl font-bold h-9 text-xs shrink-0" 
              type="submit" 
              variant="destructive" 
              disabled={resetLoading || resetConfirmation !== "HAPUS SEMUA DATA"}
            >
              {resetLoading ? "Menghapus..." : "Hapus Semua Data"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Edit User Modal */}
      {isEditUserModalOpen && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border p-5 space-y-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-left">Edit Hak Akses Pengguna</h3>
            <form onSubmit={handleSaveEditUser} className="space-y-4 text-left">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Nama Pengguna <span className="text-destructive">*</span></label>
                  <Input 
                    placeholder="Nama lengkap" 
                    value={editUserName} 
                    onChange={(e) => setEditUserName(e.target.value)} 
                    required
                    className="rounded-xl h-10 text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Jabatan (Hak Akses)</label>
                  <select 
                    value={editUserRole}
                    onChange={(e) => {
                      setEditUserRole(e.target.value)
                      setEditUserStoreIds([])
                    }}
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-bold focus:outline-none"
                  >
                    <option value="kasir">Kasir (Transaksi & Servis)</option>
                    <option value="manager">Manager (Akses Penuh Cabang Terpilih)</option>
                    <option value="owner">Owner / Admin Utama (Akses Semua Cabang)</option>
                    <option value="investor">Investor (Read-only Dashboard & Laporan)</option>
                  </select>
                </div>

                {editUserRole === "kasir" && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Penugasan Cabang</label>
                    <select 
                      value={editUserStoreIds[0] || ""}
                      onChange={(e) => setEditUserStoreIds([e.target.value])}
                      className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-bold focus:outline-none"
                      required
                    >
                      <option value="" disabled>Pilih Cabang Tempat Karyawan Ditugaskan</option>
                      {branchesList?.map((b: any) => (
                         <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {(editUserRole === "manager" || editUserRole === "investor") && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Pilih Cabang Akses (Bisa Multiselect)</label>
                    <div className="grid grid-cols-2 gap-2 border rounded-2xl p-3 bg-muted/20 max-h-40 overflow-y-auto">
                      {branchesList?.map((b: any) => (
                        <label key={b.id} className="flex items-center gap-2 text-xs font-semibold cursor-pointer hover:text-primary transition-colors select-none p-1 rounded-lg">
                          <input 
                            type="checkbox" 
                            checked={editUserStoreIds.includes(b.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditUserStoreIds([...editUserStoreIds, b.id])
                              } else {
                                setEditUserStoreIds(editUserStoreIds.filter(id => id !== b.id))
                              }
                            }}
                            className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                          />
                          <span>{b.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-4 border-t border-border mt-4">
                <Button variant="outline" className="flex-1 rounded-xl h-9 text-xs font-bold" type="button" onClick={() => setIsEditUserModalOpen(false)}>Batal</Button>
                <Button className="flex-1 rounded-xl h-9 text-xs font-bold" type="submit">
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
export default AdminManagementTab
