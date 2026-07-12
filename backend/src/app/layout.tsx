import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Han Laptop",
  description: "Han Laptop — ERP & POS",
};

// Root layout for the (migrating) public pages served by the Next app.
// API route handlers ignore layouts, so this does not affect /api.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
