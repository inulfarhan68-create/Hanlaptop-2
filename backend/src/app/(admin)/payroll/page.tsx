import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import PayrollClient from "./client";

export const metadata = {
  title: "Karyawan & Staf | Han Laptop",
  robots: { index: false, follow: false }
};

export default async function PayrollPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <PayrollClient />;
}
