import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import { InventoryClient } from "./client"

export const metadata = {
  title: "Inventory Management | Hanlaptop",
  description: "Kelola stok barang, barcode, dan opname",
}

export default async function InventoryPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login")
  }

  // No store list is fetched here on purpose. This page used to run
  // `db.select().from(stores)` with no WHERE — for ANY signed-in user, not just
  // owners — and pass the rows to InventoryClient, which never read the prop.
  // Every tenant's store name, address and phone was serialized into the page
  // payload and shipped to the browser for nothing. Components that need the
  // tenant's stores read them from TenantProvider (seeded, org-scoped, by the
  // (admin) layout) or from /api/user/stores.
  return <InventoryClient user={session.user} />
}
