"use client";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { useUserRole } from "@/hooks/useUserRole";
import { Store, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type StoreData = {
  id: string;
  name: string;
  address: string;
  role: string;
};

export function BranchSelector({ isCollapsed = false, isDarkBg = false, variant = "default", className }: { isCollapsed?: boolean; isDarkBg?: boolean; variant?: "default" | "minimal"; className?: string }) {
  const { isOwner } = useUserRole();
  const [stores, setStores] = useState<StoreData[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("all");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await apiFetch(`/api/user/stores`);
        if (res.ok) {
          const data = await res.json();
          const uniqueStores = Array.from(new Map(data.map((s: StoreData) => [s.id, s])).values()) as StoreData[];
          setStores(uniqueStores);
          
          const savedStore = localStorage.getItem('selectedStoreId');
          const isValidStore = savedStore && (
            uniqueStores.some((s: StoreData) => s.id === savedStore) || 
            (savedStore === 'all' && isOwner)
          );
          
          if (isValidStore) {
            setSelectedStoreId(savedStore);
          } else if (uniqueStores.length > 0) {
            const defaultStoreId = isOwner ? 'all' : uniqueStores[0].id;
            setSelectedStoreId(defaultStoreId);
            localStorage.setItem('selectedStoreId', defaultStoreId);
            window.location.reload();
          }
        }
      } catch (err) {
        console.error("Failed to fetch stores", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStores();
  }, [isOwner]);

  if (isLoading || stores.length === 0) return null;
  // Don't show selector if kasir only has 1 store
  if (!isOwner && stores.length === 1) return null;

  const currentStoreName = selectedStoreId === "all" 
    ? "Semua Cabang" 
    : stores.find(s => s.id === selectedStoreId)?.name || "Pilih Cabang";

  const handleSelect = (id: string) => {
    setSelectedStoreId(id);
    localStorage.setItem('selectedStoreId', id);
    setIsOpen(false);
    // Reload page to refetch all data with new store context
    window.location.reload();
  };

  if (variant === "minimal") {
    return (
      <div className={cn("relative group/branch", className)}>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center gap-1.5 transition-all duration-200 rounded-full py-1 px-3 text-left border-none shadow-sm cursor-pointer select-none active:scale-95",
            isDarkBg 
              ? "bg-white/15 hover:bg-white/25 text-white font-extrabold text-xs" 
              : "bg-primary/10 hover:bg-primary/15 text-foreground font-extrabold text-xs"
          )}
        >
          <span className="truncate max-w-[140px] leading-tight">{currentStoreName}</span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-80" />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute z-50 mt-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 left-0 top-full w-56">
              <div className="max-h-[300px] overflow-y-auto p-1.5 space-y-1">
                {isOwner && (
                  <button
                    onClick={() => handleSelect("all")}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors",
                      selectedStoreId === "all" ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4" />
                      <span>Semua Cabang</span>
                    </div>
                    {selectedStoreId === "all" && <Check className="w-4 h-4" />}
                  </button>
                )}
                {stores.map(store => (
                  <button
                    key={store.id}
                    onClick={() => handleSelect(store.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left",
                      selectedStoreId === store.id ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted text-foreground"
                    )}
                  >
                    <div className="flex flex-col truncate">
                      <span className="truncate">{store.name}</span>
                      {store.address && <span className="text-[10px] opacity-80 truncate">{store.address}</span>}
                    </div>
                    {selectedStoreId === store.id && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative group/branch w-full mb-4 px-2", className)}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center w-full transition-colors rounded-xl py-2 px-3 text-left border",
          isDarkBg 
            ? "bg-white/10 hover:bg-white/20 border-white/20 text-white" 
            : "bg-primary/5 hover:bg-primary/10 border-primary/20 text-foreground",
          isCollapsed ? "justify-center px-0" : "justify-between"
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div className={cn("p-1.5 rounded-lg shrink-0", isDarkBg ? "bg-white/10" : "bg-primary/10")}>
            <Store className={cn("w-4 h-4", isDarkBg ? "text-white" : "text-primary")} />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className={cn("text-[10px] font-medium uppercase tracking-wider", isDarkBg ? "text-blue-100/80" : "text-muted-foreground")}>Cabang Aktif</span>
              <span className={cn("text-xs font-bold truncate", isDarkBg ? "text-white" : "text-foreground")}>{currentStoreName}</span>
            </div>
          )}
        </div>
        {!isCollapsed && <ChevronDown className={cn("w-4 h-4 shrink-0", isDarkBg ? "text-blue-100" : "text-muted-foreground")} />}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className={cn(
            "absolute z-50 mt-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2",
            isCollapsed ? "left-full ml-2 top-0 w-48" : "left-2 right-2 top-full"
          )}>
            <div className="max-h-[300px] overflow-y-auto p-1.5 space-y-1">
              {isOwner && (
                <button
                  onClick={() => handleSelect("all")}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors",
                    selectedStoreId === "all" ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4" />
                    <span>Semua Cabang</span>
                  </div>
                  {selectedStoreId === "all" && <Check className="w-4 h-4" />}
                </button>
              )}
              {stores.map(store => (
                <button
                  key={store.id}
                  onClick={() => handleSelect(store.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left",
                    selectedStoreId === store.id ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted text-foreground"
                  )}
                >
                  <div className="flex flex-col truncate">
                    <span className="truncate">{store.name}</span>
                    {store.address && <span className="text-[10px] opacity-80 truncate">{store.address}</span>}
                  </div>
                  {selectedStoreId === store.id && <Check className="w-4 h-4 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
