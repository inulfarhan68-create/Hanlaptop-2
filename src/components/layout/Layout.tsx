import { Outlet, Navigate, useLocation } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { MobileHeader } from "./MobileHeader"
import { BottomNav } from "./BottomNav"
import { useSession } from "@/lib/auth-client"
import { Loader2 } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"

export function Layout() {
  const { data: session, isPending } = useSession()
  const location = useLocation()

  if (isPending) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-teal-100 via-cyan-100 to-emerald-100 dark:from-teal-950 dark:via-cyan-950 dark:to-emerald-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!session && location.pathname !== "/login") {
    return <Navigate to="/login" replace />
  }

  // Redirect desktop users from "/" to "/dashboard"
  if (session && location.pathname === "/" && window.innerWidth >= 768) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-gradient-to-br from-teal-100 via-cyan-100 to-emerald-100 dark:from-background dark:via-background dark:to-background dark:bg-background light-blue:bg-none light-blue:bg-slate-50 overflow-hidden print:bg-none print:h-auto print:overflow-visible text-foreground transition-colors duration-500">
      
      {/* Mobile: Top Header (except on home page) */}
      {location.pathname !== "/" && <MobileHeader />}

      {/* Desktop: Sidebar (hidden on mobile) */}
      <div className="hidden md:block print:hidden relative z-50 h-full">
        <Sidebar />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative print:overflow-visible print:h-auto">
        <div className={`flex-1 h-full relative overflow-y-auto overflow-x-hidden scroll-smooth print:overflow-visible pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-4 ${location.pathname === '/' ? 'p-0' : 'p-1 sm:p-2 md:p-4'}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile: Bottom Navigation (hidden on desktop) */}
      <BottomNav />
    </div>
  )
}
