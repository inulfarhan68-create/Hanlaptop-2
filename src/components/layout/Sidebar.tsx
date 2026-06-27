import { useState, useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import useSWR from "swr"
import { cn } from "@/lib/utils"
import { 
  Home,
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  FileText, 
  Settings as SettingsIcon,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Moon,
  Sun,
  Droplets,
  User,
  BarChart3,
  BookOpen,
  Users,
  Wrench,
  Bell,
  AlertCircle,
  AlertTriangle,
  Info,
  ArrowDownCircle,
  ShieldCheck,
  ClipboardCheck,
  ArrowLeftRight,
  Lock,
  Unlock,
  Truck,
  UserCog,
  Wallet,
  ShoppingBag,
  Percent,
  Coins
} from "lucide-react"
import { useTheme } from "@/components/ThemeProvider"
import { useSession, signOut } from "@/lib/auth-client"
import { useUserRole } from "@/hooks/useUserRole"
import { BranchSelector } from "@/components/BranchSelector"
import { ShiftOpenModal, ShiftCloseModal } from "@/components/ShiftModal"
import { Button } from "@/components/ui/button"

const sidebarNavItems = [
  {
    title: "Statistik",
    href: "/dashboard",
    icon: BarChart3,
  },
  {
    title: "Inventori",
    href: "/inventory",
    icon: Package,
  },
  {
    title: "Stok Opname",
    href: "/opname",
    icon: ClipboardCheck,
  },
  {
    title: "Transfer Stok",
    href: "/transfer",
    icon: ArrowLeftRight,
  },
  {
    title: "Transaksi",
    href: "/transactions",
    icon: ShoppingCart,
  },
  {
    title: "Servis",
    href: "/services",
    icon: Wrench,
  },
  {
    title: "Cek Garansi",
    href: "/warranty",
    icon: ShieldCheck,
  },
  {
    title: "Piutang",
    href: "/piutang",
    icon: BookOpen,
  },
  {
    title: "Hutang",
    href: "/hutang",
    icon: ArrowDownCircle,
  },
  {
    title: "Pelanggan",
    href: "/customers",
    icon: Users,
  },
  {
    title: "Supplier",
    href: "/suppliers",
    icon: Truck,
  },
  {
    title: "Teknisi",
    href: "/technicians",
    icon: UserCog,
  },
  {
    title: "Laporan",
    href: "/reports",
    icon: FileText,
  },
  {
    title: "Karyawan & Gaji",
    href: "/payroll",
    icon: Wallet,
  },
  {
    title: "Procurement",
    href: "/procurement",
    icon: ShoppingBag,
  },
  {
    title: "CRM & Marketing",
    href: "/crm",
    icon: Percent,
  },
  {
    title: "Rekonsiliasi Bank",
    href: "/reconciliation",
    icon: Coins,
  },
  {
    title: "Pengaturan",
    href: "/settings",
    icon: SettingsIcon,
  },
]

export function Sidebar() {
  const location = useLocation()
  const { theme, setTheme } = useTheme()
  const { data: session } = useSession()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { isOwner } = useUserRole()
  const [storeName, setStoreName] = useState("Han Laptop")
  const [storeLogo, setStoreLogo] = useState("/logo.png")
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

  useEffect(() => {
    setStoreName(localStorage.getItem("storeName") || "Han Laptop")
    setStoreLogo(localStorage.getItem("storeLogo") || "/logo.png")
  }, [])

  const userRole = storeSettings?.userRole || (session?.user as any)?.role || "kasir";
  const isGlobalOwner = (session?.user as any)?.role === "owner";

  const filteredNavItems = sidebarNavItems.filter(item => {
    // 1. Global owner or store owner has access to everything
    if (isGlobalOwner || userRole === "owner") return true;

    // 2. Investor can only see Statistik (Dashboard) and Laporan
    if (userRole === "investor") {
      return item.href === "/dashboard" || item.href === "/reports";
    }

    if (userRole === "kasir") {
      const allowedKasir = ["/dashboard", "/transactions", "/services", "/warranty", "/customers", "/payroll", "/procurement", "/crm"];
      return allowedKasir.includes(item.href);
    }

    // 4. Manager can see everything (user management tab inside settings is filtered separately)
    if (userRole === "manager") return true;

    return true;
  })

  return (
    <nav 
      className={cn(
        "flex flex-col h-full border-r-0 bg-white/60 light-blue:bg-white dark:bg-card backdrop-blur-xl text-foreground py-4 space-y-3 shadow-xl relative transition-all duration-300 ease-in-out rounded-r-[2rem] border border-border z-50 overflow-visible",
        isCollapsed ? "w-[70px] px-2" : "w-[220px] px-4"
      )}
    >
      <div className={cn("flex items-center relative z-10", isCollapsed ? "justify-center mb-6" : "space-x-2 px-1 py-2 mb-6")}>
        <div className="h-10 w-12 flex items-center justify-center shrink-0">
          <img src={storeLogo} alt="Logo" className="w-full h-full object-contain dark:invert" onError={(e) => {
            (e.target as HTMLImageElement).src = "/logo.png"
          }} />
        </div>
        {!isCollapsed && (
          <div className="flex flex-col min-w-0 leading-tight">
            {(() => {
              const name = storeName || "Han Laptop";
              const match = name.match(/^(laphack|han\s+laptop|hanlaptop)(?:\s*-\s*|\s+)(.*)$/i);
              if (match) {
                return (
                  <>
                    <span className="text-base font-extrabold tracking-tight text-foreground truncate leading-snug">{match[1]}</span>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate leading-none mt-0.5">{match[2]}</span>
                  </>
                );
              }
              const lastSpace = name.lastIndexOf(" ");
              if (lastSpace !== -1) {
                return (
                  <>
                    <span className="text-base font-extrabold tracking-tight text-foreground truncate leading-snug">{name.slice(0, lastSpace)}</span>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate leading-none mt-0.5">{name.slice(lastSpace + 1)}</span>
                  </>
                );
              }
              return <span className="text-base font-extrabold tracking-tight text-foreground truncate">{name}</span>;
            })()}
          </div>
        )}
      </div>
      
      {/* Branch Selector */}
      <BranchSelector isCollapsed={isCollapsed} />



      {/* Toggle Collapse Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 bg-background border border-border text-muted-foreground hover:text-foreground rounded-full p-1 z-50 shadow-sm transition-transform hover:scale-110 hidden md:block"
      >
        {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </button>
      
      <div className="flex-1 space-y-1.5 relative z-10 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-2">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.href}
              to={item.href}
              title={isCollapsed ? item.title : undefined}
              className={cn(
                "group relative flex items-center rounded-full text-xs font-bold transition-all duration-300",
                isCollapsed ? "justify-center p-2.5" : "space-x-3 px-3 py-2.5",
                isActive 
                  ? "bg-primary shadow-md text-primary-foreground dark:bg-accent dark:text-accent-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-accent"
              )}
            >
              <item.icon className={cn("relative z-10 h-5 w-5 transition-transform duration-300 group-hover:scale-110 shrink-0")} />
              {!isCollapsed && <span className="relative z-10 font-semibold whitespace-nowrap">{item.title}</span>}
            </Link>
          )
        })}
      </div>

    <div className="mt-auto pt-4 space-y-2 relative z-10 border-t border-border overflow-visible">
        {/* Cashier Shift Button/Status */}
        {selectedStoreId !== 'all' && enableCashierShift && (
          <div className="px-1">
            {activeShift ? (
              <button
                onClick={() => setShowCloseModal(true)}
                type="button"
                className={cn(
                  "flex w-full items-center rounded-xl text-xs font-bold transition-all duration-300 border border-transparent space-x-3 px-3 py-2 hover:bg-rose-500/10 text-rose-500 hover:text-rose-600 cursor-pointer",
                  isCollapsed && "justify-center"
                )}
                title={`Shift Aktif: ${activeShift.userName}. Klik untuk Tutup Shift.`}
              >
                <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-500 relative border border-emerald-500/20">
                  <Unlock className="h-4 w-4" />
                  <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-emerald-500 border border-background" />
                </div>
                {!isCollapsed && (
                  <div className="flex flex-col items-start text-left min-w-0 flex-1 leading-tight">
                    <span className="truncate w-full font-bold text-foreground text-[10px]">{activeShift.userName.split(" ")[0]} (Shift Aktif)</span>
                    <span className="text-[9px] text-muted-foreground truncate w-full font-normal">Tutup Shift</span>
                  </div>
                )}
              </button>
            ) : (
              <button
                onClick={() => setShowOpenModal(true)}
                type="button"
                className={cn(
                  "flex w-full items-center rounded-xl text-xs font-bold transition-all duration-300 border border-transparent space-x-3 px-3 py-2 hover:bg-primary/10 text-primary cursor-pointer",
                  isCollapsed && "justify-center"
                )}
                title="Shift Tutup. Klik untuk Buka Shift."
              >
                <div className="h-8 w-8 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0 text-rose-500 border border-rose-500/20 relative">
                  <Lock className="h-4 w-4" />
                  <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-rose-500 border border-background" />
                </div>
                {!isCollapsed && (
                  <div className="flex flex-col items-start text-left min-w-0 flex-1 leading-tight">
                    <span className="truncate w-full text-rose-500 text-[10px]">Shift Tutup</span>
                    <span className="text-[9px] text-muted-foreground truncate w-full font-normal">Buka Shift</span>
                  </div>
                )}
              </button>
            )}
          </div>
        )}

        {/* Notification Bell Button */}
        <div className="relative">
          <button
            onClick={() => setIsAlertsOpen(!isAlertsOpen)}
            title={isCollapsed ? "Notifikasi & Alert" : undefined}
            className={cn(
              "flex w-full items-center rounded-xl text-xs font-bold transition-all duration-300 border border-transparent",
              isCollapsed ? "justify-center p-2" : "space-x-3 px-3 py-2 hover:bg-muted dark:hover:bg-accent text-muted-foreground hover:text-foreground",
              isAlertsOpen && "bg-muted dark:bg-accent text-foreground"
            )}
          >
            <div className="relative h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0 text-muted-foreground">
              <Bell className="h-4.5 w-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground shadow-sm">
                  {unreadCount}
                </span>
              )}
            </div>
            {!isCollapsed && (
              <span className="flex-1 text-left whitespace-nowrap">
                Notifikasi
              </span>
            )}
            {!isCollapsed && unreadCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 mr-1">
                {unreadCount}
              </span>
            )}
          </button>

          {isAlertsOpen && (
            <>
              {/* Overlay background to dismiss when clicking outside */}
              <div className="fixed inset-0 z-40" onClick={() => setIsAlertsOpen(false)} />
              
              {/* Glassmorphic Popover */}
              <div className={cn(
                "absolute bottom-full left-0 mb-2 w-72 bg-card/95 dark:bg-card/95 border border-border shadow-2xl z-50 p-3 animate-in fade-in slide-in-from-bottom-2 max-h-[360px] overflow-y-auto rounded-2xl",
                isCollapsed ? "left-full ml-2 bottom-0 mb-0 w-80" : ""
              )}>
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
                          "flex gap-2.5 p-2.5 rounded-xl border text-[11px] font-medium transition-all duration-200 hover:-translate-y-0.5 shadow-sm",
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

        {/* Theme Toggle Button */}
        <button
          onClick={() => {
            if (theme === "dark") setTheme("light")
            else if (theme === "light") setTheme("light-blue")
            else setTheme("dark")
          }}
          title={isCollapsed ? "Toggle Theme" : undefined}
          className={cn(
            "flex w-full items-center rounded-xl text-xs font-bold transition-all duration-300 border border-transparent",
            isCollapsed ? "justify-center p-2" : "space-x-3 px-3 py-2 hover:bg-muted dark:hover:bg-accent text-muted-foreground hover:text-foreground"
          )}
        >
          <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0 text-muted-foreground">
            {theme === "dark" ? <Moon className="h-4 w-4" /> : theme === "light-blue" ? <Droplets className="h-4 w-4 text-blue-500" /> : <Sun className="h-4 w-4 text-amber-500" />}
          </div>
          {!isCollapsed && (
            <span className="flex-1 text-left whitespace-nowrap">
              {theme === "dark" ? "Dark Mode" : theme === "light-blue" ? "Light Blue" : "Light Mode"}
            </span>
          )}
        </button>

        {/* Profile Dropdown */}
        <div className="relative group">
          <button 
            className={cn(
              "flex w-full items-center rounded-xl text-xs font-bold transition-all duration-300 border border-transparent",
              isCollapsed ? "justify-center p-2" : "space-x-3 px-3 py-2 hover:bg-muted dark:hover:bg-accent"
            )}
          >
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 text-primary">
              <User className="h-4 w-4" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col items-start overflow-hidden text-left flex-1">
                <span className="truncate w-full text-foreground">{session?.user?.name || "Admin"}</span>
                <span className="text-[10px] text-muted-foreground truncate w-full font-normal capitalize">{userRole}</span>
              </div>
            )}
          </button>
          
          <div className={cn(
            "absolute bottom-full left-0 mb-2 w-full min-w-[200px] bg-card rounded-xl border border-border shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] p-2",
            isCollapsed ? "left-full ml-2 bottom-0 mb-0" : ""
          )}>
            <div className="px-3 py-2 border-b border-border/50 mb-1">
              <p className="font-bold text-sm text-foreground truncate">{session?.user?.name || "Admin"}</p>
              <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
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
        </div>
      </div>

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
    </nav>
  )
}
