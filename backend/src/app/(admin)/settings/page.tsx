import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import SettingsClient from "./client";

export const metadata = {
  title: "Pengaturan | Han Laptop",
  robots: { index: false, follow: false }
};

export default async function SettingsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <SettingsClient />;
}
