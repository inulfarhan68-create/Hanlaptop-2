import { formatCurrency } from "@/lib/utils"

interface InventoryStatsProps {
  items: any[];
  canShowHPP: boolean;
  totalAssetValue: number;
  laptopCount: number;
  spareCount: number;
  aksesorisCount: number;
}

export function InventoryStats({ 
  items, 
  canShowHPP, 
  totalAssetValue, 
  laptopCount, 
  spareCount, 
  aksesorisCount 
}: InventoryStatsProps) {
  return (
    <div className="grid grid-cols-5 md:grid-cols-4 gap-1.5 pb-0.5">
      <div className="col-span-2 md:col-span-1 bg-white/60 light-blue:bg-white dark:bg-card backdrop-blur-xl border border-border rounded-lg p-1.5 flex flex-col justify-center text-center">
        <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5 truncate">
          {canShowHPP ? "Total Value" : "Total Stok"}
        </span>
        <span className="text-[11px] md:text-[14px] font-bold text-foreground truncate">
          {canShowHPP 
            ? formatCurrency(totalAssetValue) 
            : `${items.reduce((sum: any, i: any) => sum + i.quantity, 0)} Pcs`}
        </span>
      </div>
      <div className="col-span-1 bg-white/60 light-blue:bg-white dark:bg-card backdrop-blur-xl border border-border rounded-lg p-1.5 flex flex-col justify-center text-center">
        <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5 truncate">Laptops</span>
        <span className="text-[11px] md:text-[14px] font-bold text-emerald-600 dark:text-emerald-400">{laptopCount}</span>
      </div>
      <div className="col-span-1 bg-white/60 light-blue:bg-white dark:bg-card backdrop-blur-xl border border-border rounded-lg p-1.5 flex flex-col justify-center text-center">
        <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5 truncate">Sparepart</span>
        <span className="text-[11px] md:text-[14px] font-bold text-blue-600 dark:text-blue-400">{spareCount}</span>
      </div>
      <div className="col-span-1 bg-white/60 light-blue:bg-white dark:bg-card backdrop-blur-xl border border-border rounded-lg p-1.5 flex flex-col justify-center text-center">
        <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5 truncate">Aksesoris</span>
        <span className="text-[11px] md:text-[14px] font-bold text-amber-600 dark:text-amber-400">{aksesorisCount}</span>
      </div>
    </div>
  )
}
