import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import ServicesClient from "./client";

export const metadata = { 
  title: "Services | Han Laptop", 
  robots: { index: false, follow: false } 
};

export default async function ServicesPage() {
  const session = await getSession();
  
  if (!session) {
    redirect("/login");
  }
  
  return <ServicesClient user={session.user} />;
}
