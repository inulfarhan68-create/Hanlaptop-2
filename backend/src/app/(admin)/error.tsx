"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center space-y-4 p-4 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
      </div>
      <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        Terjadi Kesalahan
      </h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md">
        {error.message || "Gagal memuat halaman ini. Silakan coba lagi atau hubungi administrator."}
      </p>
      <Button onClick={() => reset()} variant="outline" className="mt-4">
        Coba Lagi
      </Button>
    </div>
  );
}
