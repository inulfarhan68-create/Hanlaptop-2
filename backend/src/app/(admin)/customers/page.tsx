import { Metadata } from "next";
import { ClientCustomers } from "./client";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Pelanggan & CRM | HanLaptop",
  description: "Manajemen data pelanggan dan program loyalitas HanLaptop",
};

export default async function CustomersPage() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session?.user) {
    redirect("/login")
  }

  return <ClientCustomers />;
}
