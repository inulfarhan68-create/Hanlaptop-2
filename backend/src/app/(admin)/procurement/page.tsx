import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import ProcurementClient from "./client";

export const metadata = {
  title: "Procurement | Han Laptop",
  robots: { index: false, follow: false }
};

export default async function ProcurementPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <ProcurementClient />;
}
