import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import useSWR from "swr"
import { 
  Bell, 
  ShoppingCart, 
  Wrench, 
  PackagePlus, 
  Receipt, 
  History, 
  FileText, 
  Package, 
  Settings as SettingsIcon,
  TrendingUp,
  ArrowRight,
  Wallet,
  Activity,
  User,
  LogOut,
  Moon,
  Sun,
  MoreVertical,
  CreditCard,
  BarChart3,
  Users,
  BookOpen,
  AlertCircle,
  AlertTriangle,
  Info,
  ArrowDownCircle,
  ClipboardCheck,
  ArrowLeftRight,
  ShieldCheck,
  ArrowUpCircle,
  Lock,
  Unlock,
  Clock,
  Truck,
  UserCog,
  ShoppingBag,
  Percent,
  Coins,
  RefreshCw
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useUserRole } from "@/hooks/useUserRole"
import { useSession, signOut } from "@/lib/auth-client"
import { cn } from "@/lib/utils"
import { useTheme } from "@/components/ThemeProvider"
import { BranchSelector } from "@/components/BranchSelector"
import { ShiftOpenModal, ShiftCloseModal } from "@/components/ShiftModal"

const fetcher = (url: string) => fetch(url).then(r => r.json())

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)
}

export function Home() {
  const navigate = useNavigate()
  const { isOwner, isManager, isInvestor } = useUserRole()
  const { data: session } = useSession()
  const user = session?.user
  const { theme, setTheme } = useTheme()
  // Dapatkan bulan saat ini untuk filter API
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59).toISOString()
  
  const { data, isLoading } = useSWR((import.meta.env.VITE_API_URL || '') + `/api/dashboard?from=${firstDay}&to=${lastDay}`)
  
  const [storeName, setStoreName] = useState("Han Laptop")
  const [storeLogo, setStoreLogo] = useState("/logo.png")
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isAllFeaturesOpen, setIsAllFeaturesOpen] = useState(false)
  const [isAlertsOpen, setIsAlertsOpen] = useState(false)

  const { data: alertsData } = useSWR((import.meta.env.VITE_API_URL || '') + '/api/alerts', {
    refreshInterval: 30000
  })

  const selectedStoreId = localStorage.getItem('selectedStoreId') || 'all';
  const { data: activeShiftData, mutate: mutateShift } = useSWR(
    selectedStoreId !== 'all' ? (import.meta.env.VITE_API_URL || '') + '/api/shifts/active' : null
  )
  const activeShift = activeShiftData?.activeShift || null
  const { data: storeSettings } = useSWR<any>((import.meta.env.VITE_API_URL || '') + '/api/settings')

  const cachedEnableShift = localStorage.getItem("enableCashierShift")
  const enableCashierShift = storeSettings 
    ? storeSettings.enableCashierShift !== false 
    : cachedEnableShift !== "false"

  useEffect(() => {
    if (storeSettings) {
      localStorage.setItem("enableCashierShift", storeSettings.enableCashierShift !== false ? "true" : "false")
      if (storeSettings.storeName) {
        setStoreName(storeSettings.storeName)
        localStorage.setItem("storeName", storeSettings.storeName)
      }
      if (storeSettings.storeLogo) {
        setStoreLogo(storeSettings.storeLogo)
        localStorage.setItem("storeLogo", storeSettings.storeLogo)
      } else {
        setStoreLogo("/logo.png")
        localStorage.removeItem("storeLogo")
      }
    }
  }, [storeSettings])

  const [showOpenModal, setShowOpenModal] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const alerts = Array.isArray(alertsData) ? alertsData : []
  const unreadCount = alerts.length

  const currentMonthName = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(today)

  useEffect(() => {
    setStoreName(localStorage.getItem("storeName") || "Han Laptop")
    setStoreLogo(localStorage.getItem("storeLogo") || "/logo.png")
  }, [])

  interface NavItem {
    title: string
    icon: any
    color: string
    href: string
    requiresOwner?: boolean
    requiresOwnerOrManager?: boolean
    requiresReport?: boolean
  }

  const quickActions: NavItem[] = [
    { title: "Penjualan", icon: ShoppingCart, color: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20", href: "/transactions?mode=Penjualan" },
    { title: "Servis", icon: Wrench, color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20", href: "/services" },
    { title: "Beli Stok", icon: PackagePlus, color: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400 border border-violet-100 dark:border-violet-500/20", href: "/transactions?mode=Pembelian" },
    { title: "Pengeluaran", icon: CreditCard, color: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20", href: "/transactions?mode=Pengeluaran" },
    { title: "Riwayat", icon: History, color: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20", href: "/transactions?mode=Riwayat" },
    { title: "Inventori", icon: Package, color: "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-500/20", href: "/inventory" },
    { title: "Statistik", icon: BarChart3, color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20", href: "/dashboard" },
    { title: "Pengaturan", icon: SettingsIcon, color: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400 border border-slate-200 dark:border-slate-500/20", href: "/settings", requiresOwnerOrManager: true },
  ]

  const allFeatures: NavItem[] = [
    ...quickActions,
    { title: "Transaksi", icon: ShoppingCart, color: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20", href: "/transactions" },
    { title: "Kasir Servis", icon: Receipt, color: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400 border border-sky-100 dark:border-sky-500/20", href: "/transactions?mode=Servis" },
    { title: "Stok Opname", icon: ClipboardCheck, color: "bg-stone-100 text-stone-700 dark:bg-stone-500/10 dark:text-stone-400 border border-stone-200 dark:border-stone-500/20", href: "/opname" },
    { title: "Transfer Stok", icon: ArrowLeftRight, color: "bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/10 dark:text-fuchsia-400 border border-fuchsia-100 dark:border-fuchsia-500/20", href: "/transfer" },
    { title: "Cek Garansi", icon: ShieldCheck, color: "bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400 border border-teal-100 dark:border-teal-500/20", href: "/warranty" },
    { title: "Piutang", icon: BookOpen, color: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 border border-orange-100 dark:border-orange-500/20", href: "/piutang" },
    { title: "Hutang", icon: ArrowDownCircle, color: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border border-red-100 dark:border-red-500/20", href: "/hutang" },
    { title: "Pelanggan", icon: Users, color: "bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400 border border-pink-100 dark:border-pink-500/20", href: "/customers" },
    { title: "Supplier", icon: Truck, color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20", href: "/suppliers" },
    { title: "Teknisi", icon: UserCog, color: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 border border-orange-100 dark:border-orange-500/20", href: "/technicians" },
    { title: "Tukar Tambah", icon: RefreshCw, color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20", href: "/transactions?mode=Tukar Tambah" },
    { title: "Modal/Prive", icon: ArrowUpCircle, color: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-100 dark:border-purple-500/20", href: "/transactions?mode=Modal", requiresOwner: true },
    { title: "Shift Kasir", icon: Clock, color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20", href: "#shift" },
    { title: "Laporan", icon: FileText, color: "bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400 border border-teal-100 dark:border-teal-500/20", href: "/reports", requiresReport: true },
    { title: "Gaji Karyawan", icon: Wallet, color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20", href: "/payroll", requiresOwnerOrManager: true },
    { title: "Procurement", icon: ShoppingBag, color: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20", href: "/procurement" },
    { title: "CRM & Marketing", icon: Percent, color: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20", href: "/crm" },
    { title: "Rekonsiliasi Bank", icon: Coins, color: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20", href: "/reconciliation" },
  ]

  const visibleActions = quickActions.filter(action => {
    if (action.requiresOwner && !isOwner) return false
    if (action.requiresOwnerOrManager && !(isOwner || isManager)) return false
    if (action.requiresReport && !(isOwner || isManager || isInvestor)) return false
    return true
  })

  const visibleAllFeatures = allFeatures.filter(action => {
    if (action.href === "#shift" && !enableCashierShift) return false
    if (action.requiresOwner && !isOwner) return false
    if (action.requiresOwnerOrManager && !(isOwner || isManager)) return false
    if (action.requiresReport && !(isOwner || isManager || isInvestor)) return false
    return true
  })
  const recentTransactions = data?.recentTransactions || []

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background pb-20 md:pb-6 relative">
      {/* Dynamic Header Background - Classic Blue with Motif */}
      <div className="absolute top-0 left-0 right-0 h-[340px] bg-[#1a73e8] dark:bg-slate-950 z-0 overflow-hidden">
        {/* Abstract Circular Motifs to make it feel alive, positioned lower to avoid color clash with sticky header */}
        <div className="absolute top-20 -right-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute top-32 -left-10 w-56 h-56 bg-white/5 rounded-full blur-2xl" />
        
        {/* Precise Smooth Wave - Solid color to perfectly blend into the background below */}
        <svg className="absolute bottom-[-1px] left-0 right-0 w-full text-slate-50 dark:text-background" viewBox="0 0 1440 120" fill="currentColor" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ height: '60px' }}>
           <path d="M0,120 C480,0 960,0 1440,120 Z" />
        </svg>
      </div>
      
      {/* Top App Bar - Sticky to stay at the top when scrolling */}
      <div className="sticky top-0 z-50 px-4 sm:px-6 md:px-8 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-2 flex items-center justify-between text-white bg-[#1a73e8] dark:bg-slate-950 transition-all gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Logo Tanpa Background */}
          <div className="h-7 w-8 flex items-center justify-center shrink-0">
            <img src={storeLogo} alt="Logo" className="w-full h-full object-contain drop-shadow-sm" onError={(e) => {
              (e.target as HTMLImageElement).src = "/logo.png"
            }} />
          </div>
          <BranchSelector variant="minimal" isDarkBg={true} className="px-0 mb-0 w-auto shrink-0" />
        </div>

        <div className="flex items-center gap-1.5 relative shrink-0">
          {activeShift && enableCashierShift && (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full border border-white/10 shrink-0 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {activeShift.userName.split(" ")[0]}
            </span>
          )}
          {/* Notification Bell */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 rounded-full h-8 w-8 relative flex items-center justify-center"
              onClick={() => setIsAlertsOpen(!isAlertsOpen)}
            >
              <Bell className="h-4.5 w-4.5" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground">
                  {unreadCount}
                </span>
              )}
            </Button>
            
            {isAlertsOpen && (
              <>
                <div className="fixed inset-0 z-45" onClick={() => setIsAlertsOpen(false)} />
                <div className="absolute top-full right-0 mt-3 w-80 bg-card/95 dark:bg-card/95 border border-border shadow-2xl z-50 p-3 animate-in fade-in slide-in-from-top-2 max-h-[360px] overflow-y-auto rounded-2xl">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/50">
                    <div className="flex items-center gap-1.5">
                      <Bell className="h-4 w-4 text-primary" />
                      <span className="font-bold text-sm text-foreground">Notifikasi & Alert</span>
                    </div>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {unreadCount} Alert
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2 mt-2">
                    {alerts.length === 0 ? (
                      <div className="py-8 text-center flex flex-col items-center justify-center text-muted-foreground text-xs gap-2">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                          ✓
                        </div>
                        <p className="font-medium text-[11px]">Semua aman! Tidak ada alert aktif.</p>
                      </div>
                    ) : (
                      alerts.map((alert) => (
                        <Link
                          key={alert.id}
                          to={alert.link}
                          onClick={() => setIsAlertsOpen(false)}
                          className={cn(
                            "flex gap-2.5 p-2.5 rounded-xl border text-[11px] font-medium transition-all duration-200 hover:-translate-y-0.5 shadow-sm text-left",
                            alert.type === "danger" 
                              ? "bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/20 text-foreground" 
                              : alert.type === "warning"
                              ? "bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20 text-foreground"
                              : "bg-blue-500/5 hover:bg-blue-500/10 border-blue-500/20 text-foreground"
                          )}
                        >
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center shrink-0 border mt-0.5",
                            alert.type === "danger" 
                              ? "bg-rose-500/10 border-rose-500/20 text-rose-500" 
                              : alert.type === "warning"
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                              : "bg-blue-500/10 border-blue-500/20 text-blue-500"
                          )}>
                            {alert.type === "danger" ? <AlertCircle className="w-3.5 h-3.5" /> : alert.type === "warning" ? <AlertTriangle className="w-3.5 h-3.5" /> : <Info className="w-3.5 h-3.5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[11px] mb-0.5 leading-tight">{alert.title}</p>
                            <p className="text-[10px] text-muted-foreground leading-normal break-words">{alert.message}</p>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full h-8 w-8" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)} 
            className="h-8 w-8 rounded-full border-2 border-white/30 shadow-md bg-blue-800 flex items-center justify-center overflow-hidden hover:scale-105 transition-transform"
          >
            {user?.name ? (
              <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}&backgroundColor=1e40af`} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <User className="h-3.5 w-3.5 text-white/80" />
            )}
          </button>

          {isProfileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
              <div className="absolute top-full right-0 mt-3 w-56 bg-card rounded-xl border border-border shadow-xl z-50 p-2 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 border-b border-border/50 mb-1">
                  <p className="font-bold text-sm text-foreground truncate">{user?.name || "Admin"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <button
                  onClick={async () => {
                    await signOut()
                    window.location.href = "/login"
                  }}
                  className="flex w-full items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition-all duration-200 mt-1"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span>Logout</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="relative z-10 px-4 pt-0 md:px-8 max-w-5xl mx-auto space-y-3">
        
        {/* Branch Selector has been moved to header */}

        {/* Shift Warning/Status Banner */}
        {selectedStoreId !== 'all' && storeSettings && !activeShift && enableCashierShift && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 p-4 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in duration-300 shadow-lg backdrop-blur-md relative z-10 mb-2">
            <div className="flex items-center gap-3 text-left">
              <div className="p-2 bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-extrabold text-xs">Shift Kasir Belum Dibuka</p>
                <p className="text-[10px] opacity-90 mt-0.5 max-w-[240px] md:max-w-md">Anda harus membuka shift kasir untuk dapat memproses transaksi penjualan, servis, dan pengeluaran.</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setShowOpenModal(true)}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] h-8 px-3 rounded-xl cursor-pointer shrink-0"
            >
              Buka Shift
            </Button>
          </div>
        )}

        {/* Greeting Section */}
        <div className="px-1 mb-1 flex justify-between items-end">
          <div>
            <p className="text-xs font-medium text-blue-100/90 tracking-wide">Selamat datang,</p>
            <h1 className="text-xl font-bold text-white tracking-wide">{user?.name || 'Kasir Hanlaptop'}</h1>
          </div>
          {activeShift && enableCashierShift && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCloseModal(true)}
              className="h-8 text-[10px] font-bold border-white/20 hover:bg-white/20 text-white bg-white/10 rounded-xl gap-1 shrink-0 shadow-sm cursor-pointer mb-0.5"
            >
              <Lock className="w-3.5 h-3.5" /> Tutup Shift
            </Button>
          )}
        </div>

        {/* Floating Balance Card - Unique & Elegant */}
        <Card className="border border-white/40 dark:border-white/10 shadow-xl shadow-blue-900/5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl overflow-hidden rounded-[20px] relative">
          {/* Abstract geometric background */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-100/60 to-transparent dark:from-blue-900/20 rounded-bl-full pointer-events-none" />
          
          <CardContent className="p-4 relative z-10">
            {/* Main Balance */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex flex-col">
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1.5 uppercase tracking-widest">
                  Total Aset Tersedia
                </p>
                <div className="flex items-center gap-2">
                  <h2 className="text-[26px] leading-none font-black tracking-tight text-slate-800 dark:text-slate-100">
                    {isLoading ? "Rp..." : formatCurrency(data?.totalAssets || 0)}
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[9px] font-bold tracking-wide border border-blue-100 dark:border-blue-800 shrink-0 shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                {currentMonthName}
              </div>
            </div>

            {/* Elevated Individual Metric Cards */}
            <div className="grid grid-cols-2 gap-2 mt-1">
              {/* Kas & Bank */}
              <div className="flex flex-col bg-white dark:bg-slate-800/80 p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:-translate-y-1 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden">
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider flex items-center gap-1.5 relative z-10">
                  <Wallet className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400"/> Kas & Bank
                </p>
                <p className="text-sm font-black text-slate-800 dark:text-slate-100 relative z-10">{isLoading ? "-" : formatCurrency(data?.kasLiquid || 0)}</p>
              </div>

              {/* Persediaan */}
              <div className="flex flex-col bg-white dark:bg-slate-800/80 p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:-translate-y-1 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden">
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider flex items-center gap-1.5 relative z-10">
                  <Package className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400"/> Persediaan
                </p>
                <p className="text-sm font-black text-slate-800 dark:text-slate-100 relative z-10">{isLoading ? "-" : formatCurrency(data?.inventoryStats?.totalValue || 0)}</p>
              </div>
              
              {isOwner && (
                <>
                  {/* Pendapatan */}
                  <div className="flex flex-col bg-white dark:bg-slate-800/80 p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:-translate-y-1 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden">
                    <div className="absolute -top-4 -right-4 w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider flex items-center gap-1.5 relative z-10">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400"/> Pendapatan
                    </p>
                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 relative z-10">{isLoading ? "-" : formatCurrency(data?.revenue || 0)}</p>
                  </div>

                  {/* Laba Bersih */}
                  <div className="flex flex-col bg-white dark:bg-slate-800/80 p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:-translate-y-1 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden">
                    <div className="absolute -top-4 -right-4 w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider flex items-center gap-1.5 relative z-10">
                      <Activity className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400"/> Laba Bersih
                    </p>
                    <p className="text-sm font-black text-purple-600 dark:text-purple-400 relative z-10">{isLoading ? "-" : formatCurrency(data?.netProfit || 0)}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Grid */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-foreground text-lg tracking-tight">Menu Fitur</h3>
            <button onClick={() => setIsAllFeaturesOpen(true)} className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline">
              Semua Fitur &rarr;
            </button>
          </div>
          <div className="grid grid-cols-4 gap-x-2 gap-y-3">
            {visibleActions.map((action, i) => (
              <Link 
                key={i} 
                to={action.href}
                className="flex flex-col items-center justify-start gap-2.5 group transition-all"
              >
                <div className={cn(
                  "w-[52px] h-[52px] md:w-16 md:h-16 rounded-[18px] flex items-center justify-center group-hover:scale-110 group-active:scale-95 transition-all duration-300",
                  action.color
                )}>
                  <action.icon className="h-6 w-6 md:h-7 md:w-7 opacity-95" strokeWidth={2.2} />
                </div>
                <span className="text-[11px] md:text-xs font-bold text-center leading-tight text-slate-600 dark:text-slate-300 group-hover:text-foreground mt-1">
                  {action.title}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Info Banner */}
        <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 border-none text-white overflow-hidden relative shadow-lg rounded-2xl">
          <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4">
            <Activity className="w-32 h-32" />
          </div>
          <CardContent className="p-5 flex items-center justify-between relative z-10">
            <div>
              <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-1">Analisis Cepat</p>
              <h4 className="font-bold text-sm md:text-base">Lihat grafik performa toko</h4>
            </div>
            <Button size="sm" variant="secondary" className="rounded-xl px-5 h-9 text-xs font-bold bg-white text-blue-700 hover:bg-white/90 shadow-sm" onClick={() => navigate("/dashboard")}>
              Buka Statistik
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <div className="space-y-2 pb-8">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-foreground text-lg tracking-tight">Riwayat Terbaru</h3>
            <Link to="/transactions?mode=Riwayat" className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1">
              Semua <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {isLoading ? (
              <Card className="animate-pulse h-[72px] bg-muted/50 rounded-xl" />
            ) : recentTransactions.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground text-sm border-dashed rounded-xl">
                Belum ada transaksi hari ini
              </Card>
            ) : (
              recentTransactions.slice(0, 5).map((tx: any) => (
                <Card key={tx.id} className="overflow-hidden border-border/40 hover:bg-muted/30 transition-colors shadow-sm rounded-xl">
                  <Link to="/transactions?mode=Riwayat">
                    <CardContent className="p-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-3.5">
                        <div className={cn(
                          "w-11 h-11 rounded-full flex items-center justify-center shrink-0",
                          tx.transactionType === "Penjualan" ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" :
                          tx.transactionType === "Jasa Servis" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" :
                          tx.transactionType === "Pembelian Stok" ? "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" :
                          "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                        )}>
                          {tx.transactionType === "Penjualan" ? <ShoppingCart className="h-4.5 w-4.5" /> :
                           tx.transactionType === "Jasa Servis" ? <Wrench className="h-4.5 w-4.5" /> :
                           tx.transactionType === "Pembelian Stok" ? <PackagePlus className="h-4.5 w-4.5" /> :
                           <Receipt className="h-4.5 w-4.5" />}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-sm font-bold truncate">{tx.transactionType}</p>
                          <p className="text-[11px] font-medium text-muted-foreground truncate">{tx.customerName || tx.description || "Tanpa Nama"}</p>
                        </div>
                      </div>
                      <div className="text-right pl-2">
                        <p className={cn(
                          "text-[13px] font-black whitespace-nowrap tracking-tight",
                          ["Penjualan", "Jasa Servis", "Modal Baru"].includes(tx.transactionType) 
                            ? "text-emerald-600 dark:text-emerald-400" 
                            : "text-foreground"
                        )}>
                          {["Penjualan", "Jasa Servis", "Modal Baru"].includes(tx.transactionType) ? "+" : "-"}{formatCurrency(tx.amount)}
                        </p>
                        <p className="text-[10px] font-medium text-muted-foreground mt-0.5">{new Date(tx.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Semua Fitur Modal Overlay */}
      {isAllFeaturesOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAllFeaturesOpen(false)} />
          <div className="relative w-full md:w-full md:max-w-md bg-card rounded-t-[2rem] md:rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom-full md:slide-in-from-bottom-10 duration-300">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Semua Fitur</h2>
                <p className="text-sm text-muted-foreground">Akses semua fitur aplikasi Han Laptop</p>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full bg-muted/50 w-8 h-8" onClick={() => setIsAllFeaturesOpen(false)}>
                ✕
              </Button>
            </div>
            
            <div className="grid grid-cols-4 gap-x-2 gap-y-4">
              {visibleAllFeatures.map((action, i) => (
                <Link 
                  key={i} 
                  to={action.href}
                  className="flex flex-col items-center justify-start gap-2.5 group transition-all"
                  onClick={(e) => {
                    if (action.href === "#shift") {
                      e.preventDefault()
                      setIsAllFeaturesOpen(false)
                      if (activeShift) {
                        setShowCloseModal(true)
                      } else {
                        setShowOpenModal(true)
                      }
                    } else {
                      setIsAllFeaturesOpen(false)
                    }
                  }}
                >
                  <div className={cn(
                    "w-[52px] h-[52px] md:w-16 md:h-16 rounded-[18px] flex items-center justify-center group-hover:scale-110 active:scale-95 transition-all duration-300",
                    action.color
                  )}>
                    <action.icon className="h-6 w-6 md:h-7 md:w-7 opacity-95" strokeWidth={2.2} />
                  </div>
                  <span className="text-[11px] md:text-xs font-bold text-center leading-tight text-slate-600 dark:text-slate-300 group-hover:text-foreground mt-1">
                    {action.title}
                  </span>
                </Link>
              ))}
            </div>
            {/* Safe area for mobile */}
            <div className="h-[env(safe-area-inset-bottom,0px)] md:hidden mt-4" />
          </div>
        </div>
      )}

      <ShiftOpenModal 
        open={showOpenModal} 
        onClose={() => setShowOpenModal(false)} 
        onSuccess={() => mutateShift()} 
      />
      <ShiftCloseModal 
        open={showCloseModal} 
        activeShift={activeShift} 
        onClose={() => setShowCloseModal(false)} 
        onSuccess={() => mutateShift()} 
      />
    </div>
  )
}
