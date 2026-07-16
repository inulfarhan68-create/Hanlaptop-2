import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import CrmClient from "./client";

export const metadata = {
  title: "CRM & Marketing | Han Laptop",
  robots: { index: false, follow: false }
};

export default async function CrmPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <CrmClient />;
}
