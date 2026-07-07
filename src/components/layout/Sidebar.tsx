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
  Coins,
  ChevronDown,
  ChevronRight
} from "lucide-react"
import { useTheme } from "@/components/ThemeProvider"
import { useSession, signOut } from "@/lib/auth-client"
import { useUserRole } from "@/hooks/useUserRole"
import { BranchSelector } from "@/components/BranchSelector"
import { ShiftOpenModal, ShiftCloseModal } from "@/components/ShiftModal"
import { Button } from "@/components/ui/button"

const sidebarGroups = [
  {
    group: "Dashboard",
    items: [
      { title: "Statistik", href: "/dashboard", icon: BarChart3 }
    ]
  },
  {
    group: "Kasir & Transaksi",
    items: [
      { title: "Transaksi", href: "/transactions", icon: ShoppingCart },
      { title: "Servis", href: "/services", icon: Wrench },
      { title: "Piutang", href: "/piutang", icon: BookOpen },
      { title: "Hutang", href: "/hutang", icon: ArrowDownCircle },
    ]
  },
  {
    group: "Inventori",
    items: [
      { title: "Inventori", href: "/inventory", icon: Package },
      { title: "Passport & Garansi", href: "/passports", icon: ShieldCheck },
      { title: "Stok Opname", href: "/opname", icon: ClipboardCheck },
      { title: "Transfer Stok", href: "/transfer", icon: ArrowLeftRight },
    ]
  },
  {
    group: "Kontak & Staf",
    items: [
      { title: "Pelanggan", href: "/customers", icon: Users },
      { title: "Supplier", href: "/suppliers", icon: Truck },
      { title: "Karyawan & Staf", href: "/payroll", icon: Wallet },
    ]
  },
  {
    group: "Keuangan",
    items: [
      { title: "Laporan", href: "/reports", icon: FileText },
      { title: "Rekonsiliasi Bank", href: "/reconciliation", icon: Coins },
    ]
  },
  {
    group: "Sistem",
    items: [
      { title: "Pengaturan", href: "/settings", icon: SettingsIcon },
    ]
  }
];

// Hidden by default - can be enabled via Settings
const hiddenSidebarItems = [
  { title: "Procurement", href: "/procurement", icon: ShoppingBag, description: "Pengadaan & persetujuan pembelian" },
  { title: "CRM & Marketing", href: "/crm", icon: Percent, description: "Leads & kampanye marketing" },
];

export function Sidebar() {
  const location = useLocation()
  const { data: session } = useSession()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { isOwner } = useUserRole()
  const [storeName, setStoreName] = useState("Han Laptop")
  const [storeLogo, setStoreLogo] = useState("/logo.png")
  
  const { theme, setTheme } = useTheme()
  const [isAlertsOpen, setIsAlertsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  
  // Fetch alerts
  const { data: alertsData } = useSWR((import.meta.env.VITE_API_URL || '') + '/api/alerts', {
    refreshInterval: 30000
  })
  const alerts = Array.isArray(alertsData) ? alertsData : []
  const unreadCount = alerts.length

  // Track which groups are expanded. By default, let's keep all expanded if not collapsed, or just let them manage state.
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "Dashboard": true,
    "Kasir & Transaksi": true,
    "Inventori": true,
    "Pengadaan & HR": true,
    "Keuangan": true,
    "Sistem": true
  })

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }))
  }

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

  useEffect(() => {
    setStoreName(localStorage.getItem("storeName") || "Han Laptop")
    setStoreLogo(localStorage.getItem("storeLogo") || "/logo.png")
  }, [])

  const userRole = storeSettings?.userRole || (session?.user as any)?.role || "kasir";
  const isGlobalOwner = (session?.user as any)?.role === "owner";

  const isItemVisible = (href: string) => {
    if (isGlobalOwner || userRole === "owner") return true;
    if (userRole === "investor") {
      return href === "/dashboard" || href === "/reports";
    }
    if (userRole === "kasir") {
      const allowedKasir = ["/dashboard", "/transactions", "/services", "/warranty", "/customers", "/payroll", "/procurement", "/crm"];
      return allowedKasir.includes(href);
    }
    if (userRole === "manager") return true;
    return true;
  }

  return (
    <nav 
      className={cn(
        "flex flex-col h-full border-r-0 bg-white/60 light-blue:bg-white dark:bg-card backdrop-blur-xl text-foreground py-4 space-y-3 shadow-xl relative transition-all duration-300 ease-in-out rounded-r-[2rem] border border-border z-50 overflow-visible",
        isCollapsed ? "w-[70px] px-2" : "w-[240px] px-4"
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
      
      <div className="flex-1 relative z-10 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-2">
        {sidebarGroups.map((g) => {
          const visibleItems = g.items.filter(item => isItemVisible(item.href));
          if (visibleItems.length === 0) return null;
          
          const isExpanded = expandedGroups[g.group];
          
          return (
            <div key={g.group} className="mb-4">
              {!isCollapsed && (
                <button 
                  onClick={() => toggleGroup(g.group)}
                  className="flex items-center w-full justify-between px-3 py-1 mb-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                >
                  <span>{g.group}</span>
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>
              )}
              
              {(isExpanded || isCollapsed) && (
                <div className="space-y-1">
                  {visibleItems.map((item) => {
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
              )}
            </div>
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

        <div className={cn(
          "flex px-1 relative w-full pt-2 mt-2 border-t border-border/50",
          isCollapsed ? "flex-col items-center gap-2 pb-2" : "flex-row items-center gap-2"
        )}>
          {/* Notifications */}
          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("relative rounded-full hover:bg-muted shrink-0", isCollapsed ? "w-10 h-10" : "")}
              onClick={() => {
                setIsAlertsOpen(!isAlertsOpen)
                setIsProfileOpen(false)
              }}
              title={isCollapsed ? "Notifikasi" : undefined}
            >
              <Bell className="h-4.5 w-4.5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background animate-pulse" />
              )}
            </Button>

            {isAlertsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsAlertsOpen(false)} />
                <div className={cn(
                  "absolute bottom-full left-0 mb-2 bg-card border border-border shadow-2xl z-50 rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 w-72",
                  isCollapsed ? "left-full ml-2 bottom-0 mb-0 w-80" : ""
                )}>
                  <div className="flex items-center justify-between p-3 border-b border-border/50">
                    <div className="flex items-center gap-1.5">
                      <Bell className="h-4 w-4 text-primary" />
                      <span className="font-bold text-sm text-foreground">Notifikasi</span>
                    </div>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                        {unreadCount} Baru
                      </span>
                    )}
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {alerts.length === 0 ? (
                      <div className="p-6 text-center flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                          ✓
                        </div>
                        <p className="font-medium text-xs">Tidak ada notifikasi baru</p>
                      </div>
                    ) : (
                      alerts.map((alert: any) => (
                        <Link
                          key={alert.id}
                          to={alert.link || "#"}
                          onClick={() => setIsAlertsOpen(false)}
                          className={cn(
                            "flex gap-2.5 p-3 border-b last:border-0 transition-colors hover:bg-muted/50 cursor-pointer",
                            alert.type === "danger" ? "bg-rose-500/5" : alert.type === "warning" ? "bg-amber-500/5" : "bg-blue-500/5"
                          )}
                        >
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center shrink-0 border mt-0.5",
                            alert.type === "danger" ? "bg-rose-500/10 border-rose-500/20 text-rose-500" : alert.type === "warning" ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : "bg-blue-500/10 border-blue-500/20 text-blue-500"
                          )}>
                            {alert.type === "danger" ? <AlertCircle className="w-3.5 h-3.5" /> : alert.type === "warning" ? <AlertTriangle className="w-3.5 h-3.5" /> : <Info className="w-3.5 h-3.5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-xs mb-0.5 leading-tight">{alert.title}</p>
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

          {/* User Profile */}
          <div className="relative flex-1">
            <button 
              className={cn(
                "flex w-full items-center rounded-xl text-xs font-bold transition-all duration-300 border border-transparent",
                isCollapsed ? "justify-center p-2" : "space-x-3 px-3 py-2 hover:bg-muted dark:hover:bg-accent"
              )}
              onClick={() => {
                setIsProfileOpen(!isProfileOpen)
                setIsAlertsOpen(false)
              }}
              title={isCollapsed ? "Profil" : undefined}
            >
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 text-primary">
                <User className="h-4 w-4" />
              </div>
              {!isCollapsed && (
                <div className="flex flex-col items-start overflow-hidden text-left flex-1">
                  <span className="truncate w-full text-foreground text-[11px] leading-tight">{session?.user?.name || "Admin"}</span>
                  <span className="text-[9px] text-muted-foreground truncate w-full font-normal capitalize">{userRole}</span>
                </div>
              )}
            </button>

            {isProfileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                <div className={cn(
                  "absolute bottom-full left-0 mb-2 w-56 bg-card border border-border shadow-2xl z-50 rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 p-1",
                  isCollapsed ? "left-full ml-2 bottom-0 mb-0" : ""
                )}>
                  <div className="px-3 py-2 border-b border-border mb-1">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none truncate">{session?.user?.name || 'User'}</p>
                      <p className="text-xs leading-none text-muted-foreground truncate">
                        {session?.user?.email}
                      </p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => {
                      setTheme(theme === "dark" ? "light" : "dark")
                      setIsProfileOpen(false)
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                    {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </button>
                  
                  <div className="h-px bg-border/50 my-1" />
                  
                  <button 
                    onClick={async () => {
                      await signOut()
                      window.location.href = "/login"
                    }}
                    className="w-full flex items-center px-3 py-2 text-xs font-bold rounded-md text-rose-500 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Keluar (Logout)</span>
                  </button>
                </div>
              </>
            )}
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
