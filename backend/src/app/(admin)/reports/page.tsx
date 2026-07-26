import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import { userStoreAccess } from "@/db/schema";
import { eq } from "drizzle-orm";
import ReportsClient from "./client";

export const metadata = {
  title: "Laporan | Han Laptop",
  robots: { index: false, follow: false }
};

const ALLOWED_ROLES = ["owner", "manager", "investor", "platform_admin"];

export default async function ReportsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Server-side role check: immediate, no race condition.
  // 1. Global role from the user table (owner / platform_admin see everything).
  const globalRole = (session.user as { role?: string }).role ?? "kasir";
  if (ALLOWED_ROLES.includes(globalRole)) {
    return <ReportsClient />;
  }

  // 2. Store-level role from userStoreAccess (manager / investor at a specific store).
  const storeAccess = await db
    .select({ role: userStoreAccess.role })
    .from(userStoreAccess)
    .where(eq(userStoreAccess.userId, session.user.id));

  const hasAccess = storeAccess.some((a) => ALLOWED_ROLES.includes(a.role));
  if (hasAccess) {
    return <ReportsClient />;
  }

  // Truly unauthorized — bounce to dashboard.
  redirect("/dashboard");
}
