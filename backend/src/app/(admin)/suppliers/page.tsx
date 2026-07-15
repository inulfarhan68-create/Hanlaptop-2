import { Metadata } from "next";
import { ClientSuppliers } from "./client";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Supplier & Vendor | Hanlaptop",
  description: "Kelola data mitra penyuplai stok laptop dan sparepart Anda.",
};

export default async function SuppliersPage() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session?.user) {
    redirect("/login")
  }

  return <ClientSuppliers user={session.user} />;
}
