import { notFound } from "next/navigation";
import { getPublicInvoice } from "@/lib/public/invoices";
import NotaClient from "./client";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getPublicInvoice(id);

  if ("error" in result) {
    return {
      title: "Nota Tidak Ditemukan",
      description: "Invoice yang Anda cari tidak ditemukan atau telah dibatalkan.",
      robots: { index: false, follow: false },
    };
  }

  const { transaction, storeSettings } = result.data;
  const storeName = storeSettings.storeName || "HanLaptop";
  const invoiceNo = transaction.invoiceNumber || transaction.id.substring(0, 8).toUpperCase();
  const customerName = transaction.customerName || transaction.customer?.name || "Pelanggan";
  const title = `Nota #${invoiceNo} | ${storeName}`;
  const description = `Invoice transaksi untuk ${customerName} — ${storeName}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: storeName,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    robots: { index: false, follow: false },
  };
}

export default async function NotaPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getPublicInvoice(id);

  if ("error" in result) {
    notFound();
  }

  return <NotaClient data={result.data} />;
}
