"use client";

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Building, CreditCard, User, Shield, Database, AlertCircle, MapPin, ChevronRight } from "lucide-react"
import { useSession } from "@/lib/auth-client"
import { useUserRole } from "@/hooks/useUserRole"

// Import modular tab components
import { StoreSettingsTab } from "@/components/settings/StoreSettingsTab"
import { BranchesTab } from "@/components/settings/BranchesTab"
import { BankSettingsTab } from "@/components/settings/BankSettingsTab"
import { ProfileTab } from "@/components/settings/ProfileTab"
import { AdminManagementTab } from "@/components/settings/AdminManagementTab"
import { AuditLogsTab } from "@/components/settings/AuditLogsTab"
import { BackupTab } from "@/components/settings/BackupTab"

type TabKey = "store" | "branches" | "bank" | "profile" | "admin" | "logs" | "backup"

interface TabItem {
  key: TabKey
  label: string
  desc: string
  icon: any
  requiresOwner?: boolean
  requiresGlobalOwner?: boolean
}

export default function SettingsClient() {
  const [activeTab, setActiveTab] = useState<TabKey>("profile")
  const { data: session, isPending } = useSession()
  const { isOwner, role } = useUserRole()
  const isGlobalOwner = (session?.user as any)?.role === "owner"
  const router = useRouter()

  // Original (Vite) rendered <Navigate to="/dashboard"> for non-owner/manager.
  // In the Vite SPA the session was already in context, so the role was known on
  // first render. In Next this is a fresh load: useSession/useUserRole resolve
  // asynchronously and role is "kasir" for one render — redirecting on that would
  // bounce even owners. So gate the guard on the session having loaded; only then
  // is a denial real.
  const roleReady = !isPending && !!session
  const isDenied = roleReady && !isOwner && role !== "owner" && role !== "manager"
  useEffect(() => {
    if (isDenied) router.replace("/dashboard")
  }, [isDenied, router])
  if (isDenied) {
    return null
  }

  const allTabs: TabItem[] = [
    {
      key: "profile",
      label: "Profil Saya",
      desc: "Informasi detail akun & keamanan kata sandi",
      icon: User,
    },
    {
      key: "store",
      label: "Informasi Toko",
      desc: "Logo, alamat toko, template WhatsApp & list ERP",
      icon: Building,
      requiresOwner: true,
    },
    {
      key: "bank",
      label: "Rekening Bank",
      desc: "Kelola daftar rekening bank pembayaran invoice",
      icon: CreditCard,
      requiresOwner: true,
    },
    {
      key: "admin",
      label: "Kelola Akses",
      desc: "Pengaturan akun karyawan, hak akses & reset database",
      icon: Shield,
      requiresGlobalOwner: true,
    },
    {
      key: "branches",
      label: "Cabang Toko",
      desc: "Kelola daftar lokasi & cabang toko Han Laptop",
      icon: MapPin,
      requiresGlobalOwner: true,
    },
    {
      key: "backup",
      label: "Cadangkan Data",
      desc: "Ekspor & impor seluruh database cabang aktif",
      icon: Database,
      requiresOwner: true,
    },
    {
      key: "logs",
      label: "Log Aktivitas",
      desc: "Pantau audit log sistem & riwayat aksi karyawan",
      icon: AlertCircle,
      requiresOwner: true,
    },
  ]

  const visibleTabs = allTabs.filter(tab => {
    if (tab.requiresGlobalOwner && !isGlobalOwner) return false
    if (tab.requiresOwner && !(isOwner || role === "owner" || role === "manager")) return false
    return true
  })

  const activeTabInfo = visibleTabs.find(t => t.key === activeTab) || visibleTabs[0]

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto px-1 md:px-2">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-72 shrink-0 flex flex-col gap-2">
        {/* Title for Desktop */}
        <div className="hidden md:block px-1 mb-2 text-left">
          <h2 className="text-xl font-bold tracking-tight">Pengaturan & Profil</h2>
          <p className="text-muted-foreground text-xs mt-1 leading-normal">Kelola preferensi akun, hak akses cabang, rekening bank, cadangan data, dan audit log sistem.</p>
        </div>

        {/* Mobile: Horizontal scrollable pills */}
        <div className="flex md:hidden overflow-x-auto gap-2 pb-2 -mx-4 px-4 scrollbar-none snap-x select-none">
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`snap-center shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold transition-all duration-300 ${isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                  }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Desktop: Vertical List Navigation */}
        <div className="hidden md:flex flex-col gap-1.5 p-2 bg-card/60 backdrop-blur-xl border border-border/80 rounded-2xl shadow-sm">
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-3 w-full text-left px-3.5 py-3 rounded-xl transition-all duration-300 group cursor-pointer ${isActive
                    ? "bg-primary text-primary-foreground shadow-md font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 ${isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground group-hover:text-foreground group-hover:bg-muted/80"
                  }`}>
                  <tab.icon className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1 min-w-0 leading-tight">
                  <p className="text-xs font-bold truncate">{tab.label}</p>
                  <p className={`text-[9px] truncate mt-1.5 ${isActive ? "text-white/70" : "text-muted-foreground"}`}>{tab.desc}</p>
                </div>
                <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${isActive ? "text-white/80 translate-x-0.5" : "text-muted-foreground/40 group-hover:translate-x-0.5"}`} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Settings Content Area */}
      <div className="flex-1 min-w-0">
        {/* Mobile Header Title */}
        <div className="md:hidden mb-4 px-1 text-left">
          <h2 className="text-lg font-bold tracking-tight text-foreground">{activeTabInfo.label}</h2>
          <p className="text-muted-foreground text-xs mt-0.5">{activeTabInfo.desc}</p>
        </div>

        {/* Render Active Component */}
        <div className="h-full">
          {activeTab === "store" && <StoreSettingsTab />}
          {activeTab === "branches" && <BranchesTab />}
          {activeTab === "bank" && <BankSettingsTab />}
          {activeTab === "profile" && <ProfileTab />}
          {activeTab === "admin" && <AdminManagementTab />}
          {activeTab === "logs" && <AuditLogsTab />}
          {activeTab === "backup" && <BackupTab />}
        </div>
      </div>
    </div>
  )
}
