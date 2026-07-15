import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import { InventoryClient } from "./client"
import { db } from "@/db"
import { stores } from "@/db/schema"
import { eq } from "drizzle-orm"

export const metadata = {
  title: "Inventory Management | Hanlaptop",
  description: "Kelola stok barang, barcode, dan opname",
}

export default async function InventoryPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login")
  }

  // Get store options for global select (if needed)
  const storesData = await db.select().from(stores);

  return (
    <InventoryClient 
      user={session.user} 
      stores={storesData} 
    />
  )
}
