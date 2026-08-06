import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { TenantProvider } from "@/components/TenantProvider";
import { db } from "@/db";
import { stores, userStoreAccess, organizations } from "@/db/schema";
import { subscriptions } from "@/db/schema/saas";
import { subscriptionLapsed, daysUntilLapse } from "@/lib/subscription-status";
import type { ReadOnlyReason } from "@/components/layout/ReadOnlyBanner";
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
  // Mirrors /api/user/stores: a tenant owner addresses every store in THEIR
  // organization, only platform_admin is global, everyone else gets the stores
  // granted via userStoreAccess.
  //
  // This branch used to read `select().from(stores)` with no WHERE for any owner,
  // shipping every tenant's full store row — name, address, phone — into the
  // browser via TenantProvider. /api/user/stores was bounded earlier but this
  // copy was missed, so the leak stayed live on every admin page load.
  const { role, organizationId } = session.user as { role?: string; organizationId?: string | null };
  const ownStoresQuery = () =>
    db
      .select({ store: stores })
      .from(userStoreAccess)
      .innerJoin(stores, eq(userStoreAccess.storeId, stores.id))
      .where(eq(userStoreAccess.userId, session.user.id))
      .then((rows) => rows.map((r) => r.store));

  const storesPromise =
    role === "platform_admin"
      ? db.select().from(stores)
      : role === "owner" && organizationId
        ? db.select().from(stores).where(eq(stores.organizationId, organizationId))
        // Includes an owner with no organizationId — fail closed to explicit
        // grants rather than falling back to every store.
        : ownStoresQuery();

  // 3. Why the app may refuse to save, resolved server-side so the banner is
  // right on first paint. Mirrors requireAuth's rule (demo, or lapsed
  // subscription; platform_admin is never locked) — run alongside the store
  // query so it costs no extra latency.
  //
  // It also resolves how close a still-valid subscription is to lapsing. The
  // billing page carried that warning already, but only for someone who thought
  // to open it — so in practice the first signal a shop got was a save failing
  // mid-sale. Warning in the shell reaches them while renewing is still routine.
  type ShellNotice = { readOnly?: ReadOnlyReason; expiringInDays?: number };
  const noticePromise: Promise<ShellNotice> =
    organizationId && role !== "platform_admin"
      ? db
          .select({
            isDemo: organizations.isDemo,
            subscriptionStatus: subscriptions.status,
            currentPeriodEnd: subscriptions.currentPeriodEnd,
          })
          .from(organizations)
          .leftJoin(subscriptions, eq(subscriptions.organizationId, organizations.id))
          .where(eq(organizations.id, organizationId))
          .limit(1)
          .then(([org]): ShellNotice => {
            if (!org) return {};
            if (org.isDemo) return { readOnly: "demo" };
            if (subscriptionLapsed(org)) return { readOnly: "subscription" };
            // null unless it lapses within the warning window.
            const days = daysUntilLapse(org);
            return days === null ? {} : { expiringInDays: days };
          })
      : Promise.resolve({});

  const [allStores, notice] = await Promise.all([storesPromise, noticePromise]);
  const defaultStore = allStores.length > 0 ? allStores[0] : null;

  return (
    <TenantProvider initialStores={allStores} defaultStore={defaultStore}>
      <ClientLayout
        user={session.user}
        readOnlyReason={notice.readOnly}
        expiringInDays={notice.expiringInDays}
      >
        {children}
      </ClientLayout>
    </TenantProvider>
  );
}
