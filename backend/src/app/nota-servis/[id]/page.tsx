import { notFound } from "next/navigation";
import { pickIdentity, clause } from "@/lib/shop-identity";
import { getPublicService } from "@/lib/public/services";
import NotaServisClient from "./client";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getPublicService(id);

  if ("error" in result) {
    return {
      title: "Nota Servis Tidak Ditemukan",
      description: "Data servis yang Anda cari tidak ditemukan.",
      robots: { index: false, follow: false },
    };
  }

  const { serviceOrder, storeSettings } = result.data;
  // See nota/[id]: unknown means omit, never substitute a brand.
  const storeName = pickIdentity(storeSettings.storeName);
  const serviceNo = serviceOrder.id.substring(0, 8).toUpperCase();
  const deviceName = serviceOrder.deviceName || "Laptop";
  const status = serviceOrder.status || "Diterima";
  const title = `Nota Servis #${serviceNo}${clause(" | ", storeName)}`;
  const description = `Tanda terima servis ${deviceName} — Status: ${status}${clause(" — ", storeName)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: storeName ?? undefined,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    robots: { index: false, follow: false },
  };
}

export default async function NotaServisPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getPublicService(id);

  if ("error" in result) {
    notFound();
  }

  return <NotaServisClient data={result.data} id={id} />;
}
