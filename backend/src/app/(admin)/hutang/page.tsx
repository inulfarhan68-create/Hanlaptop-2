import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import HutangClient from "./client";

export const metadata = {
  title: "Hutang | Han Laptop",
  robots: { index: false, follow: false }
};

export default async function HutangPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <HutangClient />;
}
