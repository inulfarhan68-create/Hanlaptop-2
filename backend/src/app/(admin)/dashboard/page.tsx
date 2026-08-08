import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { isOperatorBrowsingAsSelf } from "@/lib/operator-redirect";
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

  // The operator has no shop, and this page would show them every tenant's
  // figures added together (accessibleStoreIds = null). Their console instead.
  if (await isOperatorBrowsingAsSelf(session.user)) {
    redirect("/platform");
  }

  // Pass user (which includes role) down to client
  // Tenant (active store) is handled by TenantProvider globally but can be accessed via Context in Client
  return <DashboardClient user={session.user} />;
}
