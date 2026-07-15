import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import LoginClient from "./client";

export const metadata = {
  title: "Login | Han Laptop",
  description: "Masuk ke Han Laptop Back-Office",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (session) {
    redirect("/dashboard");
  }

  return <LoginClient />;
}
