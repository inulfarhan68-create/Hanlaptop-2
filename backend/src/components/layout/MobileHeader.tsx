"use client";
import { useState, useEffect } from "react"
import { assetUrl } from "@/lib/utils";
import Link from "next/link"
import { usePathname } from "next/navigation"
import useSWR from "swr"
import { LogOut, Moon, Sun, Droplets, User } from "lucide-react"
import { useTheme } from "@/components/ThemeProvider"
import { signOut } from "@/lib/auth-client"
import { useSessionUser } from "@/components/SessionUserProvider"
import { BranchSelector } from "@/components/BranchSelector"

export function MobileHeader() {
  const { theme, setTheme } = useTheme()
  const { data: session } = useSessionUser()
  const [isOpen, setIsOpen] = useState(false)
  const [storeName, setStoreName] = useState("Han Laptop")
  const [storeLogo, setStoreLogo] = useState(assetUrl("/logo.png"))

  const { data: storeSettings } = useSWR<any>('/api/settings')

  useEffect(() => {
    if (storeSettings) {
      if (storeSettings.storeName) {
        setStoreName(storeSettings.storeName)
        localStorage.setItem("storeName", storeSettings.storeName)
      }
      if (storeSettings.storeLogo) {
        setStoreLogo(storeSettings.storeLogo)
        localStorage.setItem("storeLogo", storeSettings.storeLogo)
      } else {
        setStoreLogo(assetUrl("/logo.png"))
        localStorage.removeItem("storeLogo")
      }
    }
  }, [storeSettings])

  useEffect(() => {
    setStoreName(localStorage.getItem("storeName") || "Han Laptop")
    setStoreLogo(localStorage.getItem("storeLogo") || assetUrl("/logo.png"))
  }, [])

  const cycleTheme = () => {
    if (theme === "dark") setTheme("light")
    else if (theme === "light") setTheme("light-blue")
    else setTheme("dark")
  }

  return (
    <header className="md:hidden flex flex-col px-4 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] bg-white/80 light-blue:bg-white dark:bg-card border-b border-border backdrop-blur-xl sticky top-0 z-50">
      <div className="flex items-center justify-between w-full mb-2">
        {/* Logo & Brand */}
        <Link href="/admin" className="flex items-center gap-2.5">
          <div className="h-8 w-10 flex items-center justify-center shrink-0">
            <img src={storeLogo} alt="Logo" className="w-full h-full object-contain dark:invert" onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.onerror = null; // guard: never loop if the fallback 404s too
              img.src = assetUrl("/logo.png");
            }} />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            {(() => {
              const name = storeName || "Han Laptop";
              const match = name.match(/^(laphack|han\s+laptop|hanlaptop)(?:\s*-\s*|\s+)(.*)$/i);
              const displayName = match ? match[1] : name;
              return <span className="text-sm font-extrabold tracking-tight text-foreground truncate leading-snug">{displayName}</span>;
            })()}
            <BranchSelector variant="minimal" className="px-0 mb-0 w-auto shrink-0" />
          </div>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-2 relative">
          <button
            onClick={cycleTheme}
            className="h-9 w-9 rounded-full bg-muted/50 flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {theme === "dark" ? <Moon className="h-4 w-4" /> : theme === "light-blue" ? <Droplets className="h-4 w-4 text-blue-500" /> : <Sun className="h-4 w-4 text-amber-500" />}
          </button>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 text-primary hover:bg-primary/20 transition-colors"
        >
          <User className="h-5 w-5" />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute top-full right-0 mt-3 w-56 bg-card rounded-xl border border-border shadow-xl z-50 p-2 animate-in fade-in slide-in-from-top-2">
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
          </>
        )}
      </div>
      </div>
      {/* BranchSelector has been moved to logo area */}
    </header>
  )
}
