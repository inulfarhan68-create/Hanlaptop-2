"use client";
import { useSession } from "@/lib/auth-client"
import useSWR from "swr"

export function useUserRole() {
  const { data: session } = useSession()
  const { data: settings } = useSWR<any>('/api/settings')
  
  const role = settings?.userRole || (session?.user as any)?.role || "kasir"
  
  return {
    role,
    isOwner: role === "owner",
    isManager: role === "manager",
    isKasir: role === "kasir",
    isInvestor: role === "investor",
  }
}
