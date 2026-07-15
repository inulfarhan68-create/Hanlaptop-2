import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://hanlaptop.com'),
  title: "Han Laptop",
  description: "Han Laptop — ERP & POS",
};

// Root layout for the (migrating) public pages served by the Next app.
// API route handlers ignore layouts, so this does not affect /api.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
