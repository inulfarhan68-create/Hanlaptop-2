import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import AuditLogsClient from "./client";

export const metadata = {
  title: "Audit Trail | Han Laptop",
  robots: { index: false, follow: false }
};

export default async function AuditLogsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <AuditLogsClient />;
}
