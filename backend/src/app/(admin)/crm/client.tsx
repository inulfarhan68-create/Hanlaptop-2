"use client";

// The full CRM surface (membership points, 6-month reminders, warranty claims,
// leads) already lives as a component — PR #12 ported it to power the CRM tab
// embedded in the Customers page. This standalone /crm route renders the same
// component non-embedded, so the two stay a single source of truth. Do not fork
// a second copy here.
import { CrmManagement } from "@/components/customers/CrmManagement";

export default function CrmClient() {
  return <CrmManagement />;
}
