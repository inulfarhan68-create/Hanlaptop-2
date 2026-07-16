import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import StockTransferClient from "./client";

export const metadata = {
  title: "Transfer Stok | Han Laptop",
  robots: { index: false, follow: false }
};

export default async function StockTransferPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <StockTransferClient />;
}
