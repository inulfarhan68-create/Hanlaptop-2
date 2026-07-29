"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  ListChecks,
  AlertCircle,
  AlertTriangle,
  Info,
  PackageX,
  Wallet,
  Banknote,
  Wrench,
  ShieldAlert,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTenant } from "@/components/TenantProvider";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

type AlertType = "danger" | "warning" | "info";
type AlertCategory = "stok" | "piutang" | "hutang" | "servis" | "garansi";

interface AlertItem {
  id: string;
  type: AlertType;
  category?: AlertCategory;
  title: string;
  message: string;
  link: string;
  createdAt: string;
}

const CATEGORY_META: Record<AlertCategory, { label: string; icon: typeof PackageX; className: string }> = {
  stok: { label: "Stok", icon: PackageX, className: "text-amber-600 dark:text-amber-500" },
  piutang: { label: "Piutang", icon: Wallet, className: "text-rose-600 dark:text-rose-500" },
  hutang: { label: "Hutang", icon: Banknote, className: "text-orange-600 dark:text-orange-500" },
  servis: { label: "Servis", icon: Wrench, className: "text-blue-600 dark:text-blue-500" },
  garansi: { label: "Garansi", icon: ShieldAlert, className: "text-violet-600 dark:text-violet-500" },
};

const CATEGORY_ORDER: AlertCategory[] = ["piutang", "hutang", "stok", "servis", "garansi"];

const typeStyles: Record<AlertType, { row: string; badge: string; icon: typeof AlertCircle }> = {
  danger: {
    row: "bg-rose-500/5 hover:bg-rose-500/10",
    badge: "bg-rose-500/10 border-rose-500/20 text-rose-500",
    icon: AlertCircle,
  },
  warning: {
    row: "bg-amber-500/5 hover:bg-amber-500/10",
    badge: "bg-amber-500/10 border-amber-500/20 text-amber-500",
    icon: AlertTriangle,
  },
  info: {
    row: "bg-blue-500/5 hover:bg-blue-500/10",
    badge: "bg-blue-500/10 border-blue-500/20 text-blue-500",
    icon: Info,
  },
};

export function ActionCenter() {
  const { activeStore } = useTenant();
  const [filter, setFilter] = useState<AlertCategory | "all">("all");

  const { data, isLoading } = useSWR<AlertItem[]>(
    ["alerts", activeStore?.id],
    async () => {
      const res = await apiFetch("/api/alerts");
      return res.json();
    },
    { refreshInterval: 30000 }
  );

  const alerts = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of alerts) {
      const key = a.category || "lainnya";
      c[key] = (c[key] || 0) + 1;
    }
    return c;
  }, [alerts]);

  const activeCategories = useMemo(
    () => CATEGORY_ORDER.filter((cat) => (counts[cat] || 0) > 0),
    [counts]
  );

  const filtered = useMemo(
    () => (filter === "all" ? alerts : alerts.filter((a) => a.category === filter)),
    [alerts, filter]
  );

  if (isLoading) {
    return <div className="h-[220px] w-full bg-muted/20 rounded-xl animate-pulse" />;
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" />
            Perlu Tindakan
          </CardTitle>
          <CardDescription>Hal penting yang menunggu keputusanmu hari ini</CardDescription>
        </div>
        {alerts.length > 0 && (
          <span className="px-2.5 py-0.5 text-xs rounded-full font-bold shrink-0 bg-primary text-primary-foreground">
            {alerts.length}
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.length === 0 ? (
          <div className="flex h-[120px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium">Semua beres 🎉</p>
            <p className="text-xs">Tidak ada yang perlu ditindak saat ini.</p>
          </div>
        ) : (
          <>
            {/* Category filter chips */}
            <div className="flex flex-wrap gap-1.5">
              <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="Semua" count={alerts.length} />
              {activeCategories.map((cat) => {
                const Meta = CATEGORY_META[cat];
                const Icon = Meta.icon;
                return (
                  <FilterChip
                    key={cat}
                    active={filter === cat}
                    onClick={() => setFilter(cat)}
                    label={Meta.label}
                    count={counts[cat] || 0}
                    icon={<Icon className={cn("h-3 w-3", Meta.className)} />}
                  />
                );
              })}
            </div>

            {/* Alert list */}
            <div className="max-h-[320px] overflow-y-auto -mx-1 px-1 flex flex-col gap-1.5">
              {filtered.map((alert) => {
                const style = typeStyles[alert.type] || typeStyles.info;
                const RowIcon = style.icon;
                return (
                  <Link
                    key={alert.id}
                    href={alert.link || "#"}
                    className={cn(
                      "flex items-start gap-2.5 rounded-lg border p-2.5 transition-colors cursor-pointer group",
                      style.row
                    )}
                  >
                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0 border mt-0.5", style.badge)}>
                      <RowIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs mb-0.5 leading-tight">{alert.title}</p>
                      <p className="text-[11px] text-muted-foreground leading-snug">{alert.message}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0 mt-1 group-hover:text-foreground transition-colors" />
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
      )}
    >
      {icon}
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 text-[10px] font-bold",
          active ? "bg-primary-foreground/20" : "bg-background/60"
        )}
      >
        {count}
      </span>
    </button>
  );
}
