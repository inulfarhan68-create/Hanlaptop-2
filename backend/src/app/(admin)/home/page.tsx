import { Metadata } from "next";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { isOperatorBrowsingAsSelf } from "@/lib/operator-redirect";
import HomeClient from "./client";

export const metadata: Metadata = {
  title: "Home | Han Laptop",
  description: "Beranda Utama",
};

export default async function HomePage() {
  const session = await getSession();
  
  if (!session) {
    redirect("/login");
  }

  // Login sends everyone to /home, including the SaaS operator — who has no
  // shop to see here. Send them to their own console instead.
  if (await isOperatorBrowsingAsSelf(session.user)) {
    redirect("/platform");
  }

  return <HomeClient user={session.user} />;
}
