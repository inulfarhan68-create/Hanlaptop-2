import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR', 
    minimumFractionDigits: 0 
  }).format(value);
}

// Static assets are served under the transitional basePath (backend/public/* →
// /_/backend/*). Single place to update when the basePath is removed at cutover.
export function assetUrl(path: string) {
  return `/_/backend${path}`;
}
