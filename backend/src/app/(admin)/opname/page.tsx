import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import StockOpnameClient from "./client";

export const metadata = {
  title: "Stok Opname | Han Laptop",
  robots: { index: false, follow: false }
};

export default async function StockOpnamePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <StockOpnameClient />;
}
