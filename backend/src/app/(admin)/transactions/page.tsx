import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import TransactionsClient from "./client";

export const metadata = { 
  title: "Transactions | Han Laptop", 
  robots: { index: false, follow: false } 
};

export default async function TransactionsPage() {
  const session = await getSession();
  
  if (!session) {
    redirect("/login");
  }
  
  return <TransactionsClient user={session.user} />;
}
