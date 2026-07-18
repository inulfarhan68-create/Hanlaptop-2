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

// Post-cutover the Next app serves at root, so static assets in backend/public/*
// are served from the root path directly. Kept as a helper so call sites don't
// need to change if a prefix is ever reintroduced.
export function assetUrl(path: string) {
  return path;
}
