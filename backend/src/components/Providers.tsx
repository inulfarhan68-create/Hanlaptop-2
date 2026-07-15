"use client";

import { SWRConfig, mutate } from "swr";
import { ThemeProvider } from "./ThemeProvider";
import { Toaster } from "sonner";
import { fetcher } from "@/lib/api"; // We'll need to define this fetcher
import { useEffect } from "react";
import { syncChannel, SyncEventPayload } from "@/lib/broadcast";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const channel = syncChannel.getInstance();
    
    const handleMessage = (event: MessageEvent<SyncEventPayload>) => {
      if (event.data?.type === 'api.mutated' && event.data?.route) {
        mutate(
          (key) => {
            const urlKey = Array.isArray(key) ? key[0] : key;
            return typeof urlKey === 'string' && urlKey.startsWith(event.data.route);
          },
          undefined,
          { revalidate: true }
        );
      }
    };
    
    channel.addEventListener('message', handleMessage);
    
    return () => {
      channel.removeEventListener('message', handleMessage);
    };
  }, []);

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <SWRConfig 
        value={{ 
          fetcher,
          revalidateOnFocus: false, // Default settings for the app
          shouldRetryOnError: false
        }}
      >
        {children}
      </SWRConfig>
      <Toaster position="top-right" richColors />
    </ThemeProvider>
  );
}
