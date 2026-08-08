import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { planAllows } from "@/lib/plan-gate";
import { PlanUpsell } from "@/components/PlanUpsell";
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

  // Plan gate. Hiding the menu item is not enough — a bookmark, a shared link,
  // or a typed URL all reach the page directly, and it would then render and
  // fire API calls that answer 402.
  const planUser = session.user as { role?: string; organizationId?: string | null };
  if (!(await planAllows(planUser, "stockTransfer"))) {
    return <PlanUpsell feature="stockTransfer" />;
  }

  return <StockTransferClient />;
}
