"use client";

import { KPICards } from "./KPICards";
import { FinanceSummary } from "./FinanceSummary";
import { InventorySummary } from "./InventorySummary";
import { RecentTransactions } from "./RecentTransactions";
import { DemoBanner } from "./DemoBanner";

export function OverviewTab({ isOwner }: { isOwner: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <DemoBanner isOwner={isOwner} />
      <div className="order-3 lg:order-1">
        <KPICards isOwner={isOwner} />
      </div>

      <div className="order-1 lg:order-2">
        <FinanceSummary isOwner={isOwner} />
      </div>

      <div className="order-4">
        <InventorySummary isOwner={isOwner} />
      </div>

      <div className="order-5 mt-2">
        <RecentTransactions />
      </div>
    </div>
  );
}
