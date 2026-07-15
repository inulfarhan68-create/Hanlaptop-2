"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { syncChannel } from "@/lib/broadcast";

type TenantContextType = {
  activeStore: any | null;
  setActiveStore: (store: any) => void;
  stores: any[];
};

const TenantContext = createContext<TenantContextType>({
  activeStore: null,
  setActiveStore: () => {},
  stores: [],
});

export function TenantProvider({ 
  children, 
  initialStores,
  defaultStore 
}: { 
  children: React.ReactNode,
  initialStores: any[],
  defaultStore: any
}) {
  const [activeStore, setStore] = useState<any>(null);
  
  useEffect(() => {
    const savedStoreId = localStorage.getItem("selectedStoreId");
    if (savedStoreId && savedStoreId !== "all") {
      const found = initialStores.find(s => s.id === savedStoreId);
      if (found) {
        setStore(found);
      } else {
        setStore(defaultStore);
      }
    } else {
      setStore(defaultStore);
    }
  }, [initialStores, defaultStore]);

  const setActiveStore = (store: any) => {
    setStore(store);
    if (store && store.id) {
      localStorage.setItem("selectedStoreId", store.id);
    } else {
      localStorage.setItem("selectedStoreId", "all");
    }
    // Refresh SWR global cache on store switch
    syncChannel.broadcastMutation("store_switch", "POST");
    // Reload page to ensure all components fetch with new store ID
    window.location.reload();
  };

  return (
    <TenantContext.Provider value={{ activeStore, setActiveStore, stores: initialStores }}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => useContext(TenantContext);
