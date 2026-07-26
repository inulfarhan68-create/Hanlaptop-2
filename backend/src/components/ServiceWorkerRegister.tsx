"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js so the app is installable and its shell works offline.
 * Only registers on production builds (Vercel preview/prod) — a service worker
 * in `next dev` just causes stale-cache confusion during development.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* registration failures are non-fatal; the app still works online */
      });
    };
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
