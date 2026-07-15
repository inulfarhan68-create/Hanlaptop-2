import type { Metadata } from "next";
import LandingPage from "./home-client";

// Server wrapper for the (client-heavy) landing page: a "use client" page
// cannot export metadata, so the marketing surface was shipping without any
// SEO tags. The interactive landing itself stays a client component.
export const metadata: Metadata = {
  title: "Han Laptop — Jual Beli, Tukar Tambah & Servis Laptop Bekas",
  description:
    "Beli laptop bekas berkualitas bergaransi, jual laptop dengan taksiran harga instan, tukar tambah hemat, dan servis dengan proses transparan di Han Laptop.",
  keywords: [
    "laptop bekas",
    "jual beli laptop",
    "tukar tambah laptop",
    "servis laptop",
    "laptop second bergaransi",
    "Han Laptop",
  ],
  openGraph: {
    title: "Han Laptop — Jual Beli, Tukar Tambah & Servis Laptop Bekas",
    description:
      "Laptop berkualitas, transaksi lebih tenang: beli, jual, tukar tambah, dan servis laptop dalam satu tempat.",
    type: "website",
    siteName: "Han Laptop",
  },
  robots: { index: true, follow: true },
};

export default function Home() {
  return <LandingPage />;
}
