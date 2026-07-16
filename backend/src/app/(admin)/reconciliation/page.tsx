import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import ReconciliationClient from "./client";

export const metadata = {
  title: "Rekonsiliasi Bank | Han Laptop",
  robots: { index: false, follow: false }
};

export default async function ReconciliationPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <ReconciliationClient />;
}
