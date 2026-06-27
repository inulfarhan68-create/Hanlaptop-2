import { useState, useEffect } from "react"
import { useNavigate, Navigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, Lock, Mail, AlertCircle, Loader2 } from "lucide-react"
import { signIn, useSession } from "@/lib/auth-client"

export function Login() {
  const { data: session, isPending } = useSession()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [storeLogo, setStoreLogo] = useState("/logo.png")
  const navigate = useNavigate()

  useEffect(() => {
    // 1. Initial load from local storage
    const cachedLogo = localStorage.getItem("storeLogo")
    if (cachedLogo) {
      setStoreLogo(cachedLogo)
    }

    // 2. Fetch fresh logo from public settings API matching last selected branch
    const selectedStoreId = localStorage.getItem("selectedStoreId") || "default"
    const apiUrl = (import.meta.env.VITE_API_URL || '') + `/api/public/settings?storeId=${selectedStoreId}`
    fetch(apiUrl)
      .then(res => res.json())
      .then(data => {
        if (data && data.storeLogo) {
          setStoreLogo(data.storeLogo)
          localStorage.setItem("storeLogo", data.storeLogo)
        } else if (data && data.storeName) {
          setStoreLogo("/logo.png")
          localStorage.removeItem("storeLogo")
        }
        if (data && data.storeName) {
          localStorage.setItem("storeName", data.storeName)
        }
      })
      .catch(err => console.error("Failed to load public store settings", err))
  }, [])

  const validateEmail = (val: string) => {
    if (!val) {
      setEmailError("Email tidak boleh kosong")
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(val)) {
      setEmailError("Format email tidak valid")
      return false
    }
    setEmailError("")
    return true
  }

  const validatePassword = (val: string) => {
    if (!val) {
      setPasswordError("Password tidak boleh kosong")
      return false
    }
    if (val.length < 8) {
      setPasswordError("Password harus minimal 8 karakter")
      return false
    }
    setPasswordError("")
    return true
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    if (emailError) validateEmail(e.target.value)
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    if (passwordError) validatePassword(e.target.value)
  }

  // Redirect to dashboard if already authenticated
  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (session) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    // Client-side validation
    const isEmailValid = validateEmail(email)
    const isPasswordValid = validatePassword(password)
    
    if (!isEmailValid || !isPasswordValid) {
      setLoading(false)
      return
    }

    try {
      const { error: signInError } = await signIn.email({ email, password })
      if (signInError) {
        setError(signInError.message || "Email atau password salah")
      } else {
        navigate("/")
      }
    } catch (err) {
      setError("Terjadi kesalahan. Silakan coba lagi.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {/* Subtle background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />

      <Card className="relative w-full max-w-md shadow-xl border-primary/10">
        <CardHeader className="space-y-2 text-center pb-8">
          <div className="mx-auto w-40 h-32 flex items-center justify-center mb-4">
            <img src={storeLogo} alt="Han Laptop Logo" className="w-full h-full object-contain dark:invert drop-shadow-sm" onError={(e) => {
              (e.target as HTMLImageElement).src = "/logo.png"
            }} />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Masuk ke Han Laptop Back-Office
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  placeholder="admin@hanlaptop.com" 
                  type="email" 
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={() => validateEmail(email)}
                  autoCapitalize="none" 
                  autoComplete="email" 
                  autoCorrect="off" 
                  className={`pl-10 ${emailError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
              </div>
              {emailError && <p className="text-[11px] font-medium text-destructive mt-1">{emailError}</p>}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={() => validatePassword(password)}
                  className={`pl-10 pr-10 ${passwordError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  placeholder="Minimal 8 karakter"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordError && <p className="text-[11px] font-medium text-destructive mt-1">{passwordError}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full" size="lg" type="submit" disabled={loading}>
              {loading ? "Memproses..." : "Sign In"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Hanya admin yang terdaftar yang dapat mengakses sistem ini.
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

