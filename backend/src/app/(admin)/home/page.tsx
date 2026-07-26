import { Metadata } from "next";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
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

  return <HomeClient user={session.user} />;
}
