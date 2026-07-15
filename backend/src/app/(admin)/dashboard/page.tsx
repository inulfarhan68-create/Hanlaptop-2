import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DashboardClient from "./client";

export const metadata = {
  title: "Dashboard | Han Laptop",
  description: "Dashboard Ringkasan dan Statistik",
};

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Pass user (which includes role) down to client
  // Tenant (active store) is handled by TenantProvider globally but can be accessed via Context in Client
  return <DashboardClient user={session.user} />;
}
