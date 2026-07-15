import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { TenantProvider } from "@/components/TenantProvider";
import { db } from "@/db";
import { stores, userStoreAccess } from "@/db/schema";
import { eq } from "drizzle-orm";

export const metadata = {
  title: "Dashboard | Han Laptop",
  description: "Han Laptop Back-Office",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // 1. Auth Guard (Server-Side)
  // Check auth first, if unauthenticated, bounce to /login without flashing.
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // 2. Fetch stores the user actually has access to (tenant isolation).
  // Mirrors /api/user/stores: owner sees all stores, everyone else only the
  // stores granted via userStoreAccess. Never ship the full stores table to
  // the client — in multi-tenant SaaS that leaks other tenants' data.
  const role = (session.user as { role?: string }).role;
  const allStores =
    role === "owner"
      ? await db.select().from(stores)
      : await db
          .select({ store: stores })
          .from(userStoreAccess)
          .innerJoin(stores, eq(userStoreAccess.storeId, stores.id))
          .where(eq(userStoreAccess.userId, session.user.id))
          .then((rows) => rows.map((r) => r.store));
  const defaultStore = allStores.length > 0 ? allStores[0] : null;

  return (
    <TenantProvider initialStores={allStores} defaultStore={defaultStore}>
      <ClientLayout user={session.user}>
        {children}
      </ClientLayout>
    </TenantProvider>
  );
}
