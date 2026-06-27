import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Save, CheckCircle2, AlertCircle, Shield, User, KeyRound } from "lucide-react"
import { useSession, changePassword, updateUser } from "@/lib/auth-client"

export function ProfileTab() {
  const { data: session } = useSession()

  // Profile Update State
  const [profileName, setProfileName] = useState("")
  const [profileEmail, setProfileEmail] = useState("")
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState("")
  const [profileError, setProfileError] = useState("")

  // Security Update State
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [securityLoading, setSecurityLoading] = useState(false)
  const [securitySuccess, setSecuritySuccess] = useState("")
  const [securityError, setSecurityError] = useState("")

  useEffect(() => {
    if (session?.user) {
      setProfileName(session.user.name || "")
      setProfileEmail(session.user.email || "")
    }
  }, [session?.user])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileLoading(true)
    setProfileError("")
    setProfileSuccess("")

    try {
      const { error: updateError } = await updateUser({ name: profileName })
      if (updateError) throw updateError
      
      if (profileEmail !== session?.user?.email) {
        const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/user/update-email', {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newEmail: profileEmail })
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || "Gagal memperbarui email")
        }
      }

      setProfileSuccess("Profil Anda berhasil diperbarui!")
      setTimeout(() => setProfileSuccess(""), 3000)
    } catch (err: any) {
      setProfileError(err.message || "Gagal memperbarui profil")
    } finally {
      setProfileLoading(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setSecurityLoading(true)
    setSecurityError("")
    setSecuritySuccess("")

    if (newPassword.length < 8) {
      setSecurityError("Password baru minimal 8 karakter")
      setSecurityLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setSecurityError("Konfirmasi password tidak cocok")
      setSecurityLoading(false)
      return
    }

    try {
      const { error } = await changePassword({
        newPassword,
        currentPassword,
        revokeOtherSessions: true,
      })

      if (error) {
        setSecurityError(error.message || "Gagal merubah password. Pastikan password lama benar.")
      } else {
        setSecuritySuccess("Kata sandi berhasil diperbarui!")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        setTimeout(() => setSecuritySuccess(""), 3000)
      }
    } catch (err: any) {
      setSecurityError(err.message || "Terjadi kesalahan pada server")
    } finally {
      setSecurityLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Profil Saya Card */}
      <Card className="border border-border/80 shadow-sm overflow-hidden rounded-2xl">
        <CardHeader className="border-b border-border/40 pb-4 bg-muted/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <User className="h-5 w-5" />
            </div>
            <div className="text-left">
              <CardTitle className="text-base font-bold">Profil Saya</CardTitle>
              <CardDescription className="text-xs">Ubah detail nama lengkap dan email Anda</CardDescription>
            </div>
          </div>
        </CardHeader>
        <form onSubmit={handleUpdateProfile}>
          <CardContent className="space-y-4 pt-6 text-left">
            {profileError && (
              <div className="flex items-center gap-2 p-3 text-xs font-semibold text-destructive bg-destructive/10 rounded-xl border border-destructive/20 animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}
            {profileSuccess && (
              <div className="flex items-center gap-2 p-3 text-xs font-semibold text-emerald-600 bg-emerald-500/10 rounded-xl border border-emerald-500/20 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}
            
            {/* Visual Avatar Preview */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/20 border border-dashed border-border/60 mb-2">
              <div className="h-16 w-16 rounded-full border-2 border-primary/20 shadow-inner bg-primary/5 flex items-center justify-center shrink-0 overflow-hidden">
                {profileName ? (
                  <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${profileName}&backgroundColor=1e40af`} alt={profileName} className="w-full h-full object-cover" />
                ) : (
                  <User className="h-8 w-8 text-primary/40" />
                )}
              </div>
              <div>
                <p className="font-bold text-sm text-foreground">{profileName || "Nama Anda"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{profileEmail || "email@domain.com"}</p>
                <span className="inline-flex mt-2 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  {(session?.user as any)?.role || "Kasir"}
                </span>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nama Lengkap</label>
              <Input 
                value={profileName} 
                onChange={e => setProfileName(e.target.value)} 
                required 
                className="rounded-xl h-10"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Terdaftar</label>
              <Input 
                type="email" 
                value={profileEmail} 
                onChange={e => setProfileEmail(e.target.value)} 
                required 
                className="rounded-xl h-10"
              />
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">* Pastikan email aktif. Perubahan email akan memperbarui akun login Anda.</p>
            </div>
          </CardContent>
          <CardFooter className="border-t border-border/40 px-6 py-3.5 flex justify-end bg-muted/10">
            <Button className="gap-2 rounded-xl font-bold h-9 text-xs" type="submit" disabled={profileLoading}>
              {profileLoading ? "Menyimpan..." : <><Save className="h-4 w-4" /> Simpan Profil</>}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Keamanan Akun Card */}
      <Card className="border border-border/80 shadow-sm overflow-hidden rounded-2xl">
        <CardHeader className="border-b border-border/40 pb-4 bg-rose-500/[0.03]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl">
              <Shield className="h-5 w-5" />
            </div>
            <div className="text-left">
              <CardTitle className="text-base font-bold text-rose-600 dark:text-rose-500">Keamanan Akun</CardTitle>
              <CardDescription className="text-xs">Perbarui kata sandi login Anda secara berkala</CardDescription>
            </div>
          </div>
        </CardHeader>
        <form onSubmit={handleUpdatePassword}>
          <CardContent className="space-y-4 pt-6 text-left">
            {securityError && (
              <div className="flex items-center gap-2 p-3 text-xs font-semibold text-destructive bg-destructive/10 rounded-xl border border-destructive/20 animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{securityError}</span>
              </div>
            )}
            {securitySuccess && (
              <div className="flex items-center gap-2 p-3 text-xs font-semibold text-emerald-600 bg-emerald-500/10 rounded-xl border border-emerald-500/20 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{securitySuccess}</span>
              </div>
            )}

            <div className="p-3 bg-amber-500/[0.04] text-amber-700 dark:text-amber-500/90 text-xs font-medium rounded-xl border border-amber-500/20 flex gap-2.5 leading-relaxed">
              <KeyRound className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
              <span>Untuk keamanan tambahan, memperbarui password akan otomatis mengeluarkan sesi akun Anda dari seluruh perangkat lain yang sedang login.</span>
            </div>
            
            <div className="grid gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password Saat Ini</label>
              <Input 
                type="password" 
                required 
                value={currentPassword} 
                onChange={e => setCurrentPassword(e.target.value)} 
                className="rounded-xl h-10"
                placeholder="Masukkan kata sandi lama Anda"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password Baru</label>
              <Input 
                type="password" 
                required 
                minLength={8}
                placeholder="Minimal 8 karakter" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                className="rounded-xl h-10"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Konfirmasi Password Baru</label>
              <Input 
                type="password" 
                required 
                minLength={8}
                placeholder="Ketik ulang password baru Anda" 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                className="rounded-xl h-10"
              />
            </div>
          </CardContent>
          <CardFooter className="border-t border-border/40 px-6 py-3.5 flex justify-end bg-muted/10">
            <Button className="gap-2 rounded-xl font-bold h-9 text-xs" type="submit" variant="destructive" disabled={securityLoading}>
              {securityLoading ? "Memproses..." : "Perbarui Kata Sandi"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
export default ProfileTab
