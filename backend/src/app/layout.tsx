import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/Providers";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { getAppUrl } from "@/lib/app-url";

export const metadata: Metadata = {
  // Resolved from the environment — see lib/app-url. Must never be a hardcoded
  // aspirational domain: canonical/OG URLs are built against this.
  metadataBase: new URL(getAppUrl()),
  title: "Han Laptop",
  description: "Han Laptop — ERP & POS",
  // Installable-PWA hints (manifest itself is app/manifest.ts).
  appleWebApp: { capable: true, statusBarStyle: "default", title: "HanLaptop" },
  icons: { apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

// Root layout for the (migrating) public pages served by the Next app.
// API route handlers ignore layouts, so this does not affect /api.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        {/* Apply the persisted theme class before first paint so SSR pages
            don't flash the wrong theme. Must stay in sync with ThemeProvider
            (storageKey "vite-ui-theme"; themes: dark | light | light-blue |
            system). suppressHydrationWarning on <html> covers the class. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("vite-ui-theme")||"system";if(t==="system"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.classList.add(t)}catch(e){}})();`,
          }}
        />
        <ServiceWorkerRegister />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
