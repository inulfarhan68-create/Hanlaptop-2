"use client";

import { useState } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { PeriodSelector } from "@/components/PeriodSelector"
import { ApprovalBoard } from "@/components/dashboard/ApprovalBoard"
import { OverviewTab } from "@/components/dashboard/OverviewTab"
import { AnalyticsTab } from "@/components/dashboard/AnalyticsTab"

export default function DashboardClient({ user }: { user: any }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const activeTab = searchParams.get("tab") || "overview"
  const userRole = user?.role || "kasir"
  const isOwner = userRole === "owner" || userRole === "manager" || userRole === "investor"

  const setActiveTab = (tab: string) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()))
    current.set("tab", tab)
    router.replace(`${pathname}?${current.toString()}`, { scroll: false })
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Sticky Page Header */}
      <div className="sticky top-0 z-40 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-1.5 md:gap-2 p-2 md:px-5 md:py-3 bg-white/80 light-blue:bg-white dark:bg-card backdrop-blur-xl rounded-2xl md:rounded-[2rem] border border-border shadow-sm mt-0 mb-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base md:text-2xl font-bold tracking-tight leading-none">Dashboard</h2>
            <p className="text-muted-foreground mt-1 text-[9px] md:text-xs font-medium hidden md:block">
              Ringkasan keuangan dan analitik.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 w-full md:w-auto">
          <div className="flex bg-muted/30 dark:bg-muted p-1 rounded-full border border-border shadow-inner shrink-0 w-1/2 md:w-auto">
            <button
              className={`flex-1 md:flex-none px-2 md:px-4 py-1 md:py-1.5 text-[10px] md:text-xs font-bold rounded-full transition-all duration-300 ${activeTab === "overview" ? "bg-white dark:bg-accent text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setActiveTab("overview")}
            >Overview</button>
            {isOwner && (
              <button
                className={`flex-1 md:flex-none px-2 md:px-4 py-1 md:py-1.5 text-[10px] md:text-xs font-bold rounded-full transition-all duration-300 ${activeTab === "analytics" ? "bg-white dark:bg-accent text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setActiveTab("analytics")}
              >Analytics</button>
            )}
          </div>
          <div className="w-1/2 md:w-auto z-50">
             <PeriodSelector />
          </div>
        </div>
      </div>

      {/* Scrollable Body Content */}
      <div className="flex-1 overflow-x-hidden space-y-2">
        <div className="px-2">
          <ApprovalBoard isOwner={isOwner} />
        </div>
        {activeTab === "overview" && (
          <OverviewTab isOwner={isOwner} />
        )}
        {activeTab === "analytics" && isOwner && (
          <AnalyticsTab />
        )}
      </div>
    </div>
  )
}
