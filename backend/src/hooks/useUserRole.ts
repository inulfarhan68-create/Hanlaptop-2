"use client";
import { useSessionUser } from "@/components/SessionUserProvider"
import useSWR from "swr"

export function useUserRole() {
  const { data: session, isPending: sessionLoading } = useSessionUser()
  const { data: settings, isLoading: settingsLoading } = useSWR<any>('/api/settings')
  
  const role = settings?.userRole || (session?.user as any)?.role || "kasir"
  
  return {
    role,
    isOwner: role === "owner",
    isManager: role === "manager",
    isKasir: role === "kasir",
    isInvestor: role === "investor",
    /**
     * May address every store they can reach, i.e. the "all" sentinel is valid
     * for them. `isOwner` alone excluded platform_admin, which pinned the global
     * operator to one arbitrary tenant's store — even though requireAuth gives
     * them accessibleStoreIds = null (unrestricted).
     */
    canSeeAllStores: role === "owner" || role === "platform_admin",
    isLoading: sessionLoading || settingsLoading,
  }
}
