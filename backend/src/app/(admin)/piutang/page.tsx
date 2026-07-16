import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import PiutangClient from "./client";

export const metadata = {
  title: "Piutang | Han Laptop",
  robots: { index: false, follow: false }
};

export default async function PiutangPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <PiutangClient />;
}
