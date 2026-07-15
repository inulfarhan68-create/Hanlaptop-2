import { Metadata } from "next";
import { ClientCustomers } from "./client";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Pelanggan & CRM | HanLaptop",
  description: "Manajemen data pelanggan dan program loyalitas HanLaptop",
};

export default async function CustomersPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login")
  }

  return <ClientCustomers />;
}
