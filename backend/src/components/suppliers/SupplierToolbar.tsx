"use client";

import { useEffect, useState } from "react";
import { Search, Truck, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SupplierToolbarProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  openAddModal: () => void;
  canWrite: boolean;
  storeId: string | null;
}

export function SupplierToolbar({
  searchQuery,
  setSearchQuery,
  openAddModal,
  canWrite,
  storeId,
}: SupplierToolbarProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Sync local search with external changes (e.g. browser back/forward)
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== searchQuery) {
        setSearchQuery(localSearch);
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [localSearch, searchQuery, setSearchQuery]);

  return (
    <>
      <div className="sticky top-0 z-40 shrink-0 flex flex-col gap-2 p-3 md:px-5 md:py-3 bg-white/80 light-blue:bg-white dark:bg-card backdrop-blur-xl rounded-xl md:rounded-[2rem] border border-border shadow-sm mt-0 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
              <Truck className="h-6 w-6 text-primary" /> Database Supplier / Vendor
            </h2>
            <p className="text-muted-foreground text-xs md:text-sm">Kelola data mitra penyuplai stok laptop dan sparepart Anda.</p>
          </div>
          {canWrite && storeId !== 'all' && (
            <Button size="sm" className="gap-1 rounded-xl" onClick={openAddModal}>
              <PlusCircle className="h-4 w-4" /> <span className="hidden sm:inline">Tambah Supplier</span>
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 px-1">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Cari nama atau telepon supplier..." 
            className="pl-8 bg-card"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>
      </div>
    </>
  );
}
