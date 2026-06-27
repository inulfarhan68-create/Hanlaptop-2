import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import {
  Home,
  Package,
  ShoppingCart,
  FileText,
  BarChart3,
  Settings as SettingsIcon,
  Wallet,
} from "lucide-react"
import { useUserRole } from "@/hooks/useUserRole"

const navItems = [
  { title: "Home", href: "/", icon: Home },
  { title: "Statistik", href: "/dashboard", icon: BarChart3 },
  { title: "Transaksi", href: "/transactions", icon: ShoppingCart }, // Center button
  { title: "Inventori", href: "/inventory", icon: Package },
  { title: "Laporan", href: "/reports", icon: FileText },
]

export function BottomNav() {
  const location = useLocation()
  const { isOwner, isManager, isInvestor } = useUserRole()

  const filteredNavItems = navItems.filter(item => {
    const hasReportAccess = isOwner || isManager || isInvestor
    const hasSettingsAccess = isOwner || isManager
    
    if (item.href === "/reports" && !hasReportAccess) return false
    if (item.href === "/settings" && !hasSettingsAccess) return false
    return true
  })

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-card/95 backdrop-blur-xl border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-around h-16 px-1">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.href
          const isCenter = item.href === "/transactions"

          if (isCenter) {
            return (
              <div key={item.href} className="relative flex-1 flex justify-center h-full">
                <Link
                  to={item.href}
                  className={cn(
                    "absolute -top-7 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-[0_8px_16px_rgba(15,118,110,0.4)] transition-transform active:scale-95",
                    isActive && "ring-4 ring-primary/20"
                  )}
                >
                  <item.icon className="h-6 w-6" />
                </Link>
              </div>
            )
          }

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-auto h-auto transition-all duration-300",
                  isActive && "scale-110"
                )}
              >
                <item.icon className={cn("h-5 w-5 transition-transform", isActive && "scale-105")} />
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium leading-tight transition-all",
                  isActive ? "font-bold" : "font-normal"
                )}
              >
                {item.title}
              </span>
            </Link>
          )
        })}
      </div>
      {/* Safe area for phones with gesture bars */}
      <div className="h-[env(safe-area-inset-bottom,0px)] bg-transparent" />
    </nav>
  )
}
