import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-muted/60",
        className
      )}
    />
  )
}

/** Dashboard KPI cards skeleton */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-2 animate-in fade-in">
      {/* Hero card skeleton */}
      <div className="grid gap-2 grid-cols-1 lg:grid-cols-4">
        <div className="lg:col-span-3 rounded-xl border bg-card p-4 md:p-6">
          <div className="flex flex-col lg:flex-row gap-5">
            <div className="flex-1 space-y-3">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-10 w-56" />
              <Skeleton className="h-[90px] w-full mt-4 rounded-xl" />
            </div>
            <div className="hidden lg:block w-px bg-border/40" />
            <div className="lg:w-60 space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        </div>
        <div className="hidden lg:flex flex-col rounded-xl border bg-card p-4 gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
      {/* Stats row skeleton */}
      <div className="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-1 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Table rows skeleton */
export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <>
      {[...Array(rows)].map((_, i) => (
        <tr key={i} className="border-b border-border/50">
          {[...Array(cols)].map((_, j) => (
            <td key={j} className="py-3 px-2">
              <Skeleton className={cn("h-4", j === 1 ? "w-40" : j === cols - 1 ? "w-12" : "w-20")} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
