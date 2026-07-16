import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import ReportsClient from "./client";

export const metadata = {
  title: "Laporan | Han Laptop",
  robots: { index: false, follow: false }
};

export default async function ReportsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <ReportsClient />;
}
