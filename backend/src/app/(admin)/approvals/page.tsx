import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import ApprovalsClient from "./client";

export const metadata = {
  title: "Persetujuan | Han Laptop",
  robots: { index: false, follow: false }
};

export default async function ApprovalsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <ApprovalsClient />;
}
