import { Metadata } from "next";
import { ClientSuppliers } from "./client";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Supplier & Vendor | Hanlaptop",
  description: "Kelola data mitra penyuplai stok laptop dan sparepart Anda.",
};

export default async function SuppliersPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login")
  }

  return <ClientSuppliers user={session.user} />;
}
