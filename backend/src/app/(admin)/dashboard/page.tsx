import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import DashboardClient from "./client";

export const metadata = {
  title: "Dashboard | Han Laptop",
  description: "Dashboard Ringkasan dan Statistik",
};

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    redirect("/login");
  }

  // Pass user (which includes role) down to client
  // Tenant (active store) is handled by TenantProvider globally but can be accessed via Context in Client
  return <DashboardClient user={session.user} />;
}
