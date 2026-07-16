import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DigitalPassportClient from "./client";

export const metadata = {
  title: "Passport & Garansi | Han Laptop",
  robots: { index: false, follow: false }
};

export default async function DigitalPassportPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <DigitalPassportClient />;
}
