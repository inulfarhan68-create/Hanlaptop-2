import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getPublicCatalog } from "@/lib/public/catalog";
import CatalogClient from "./client";
import type { Metadata } from "next";

// Cache catalog page for 5 minutes to reduce database load.
export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicCatalog(slug);

  if ("error" in result) {
    return {
      title: "Katalog Tidak Ditemukan",
      description: "Toko yang Anda cari tidak ditemukan atau tidak aktif.",
    };
  }

  const { store, items } = result.data;
  const storeName = store.name || "HanLaptop";
  const itemCount = items.length;
  const title = `Katalog Laptop Bekas | ${storeName}`;
  const description = `Cari laptop bekas berkualitas di ${storeName}. ${itemCount} unit tersedia dengan harga terbaik. Garansi toko & siap pakai.`;
  const canonical = `/catalog/${store.slug}`;

  return {
    title,
    description,
    keywords: [
      "laptop bekas",
      "laptop second",
      "laptop murah",
      storeName,
      "katalog laptop",
      "laptop berkualitas",
    ],
    openGraph: {
      title,
      description,
      type: "website",
      siteName: storeName,
      ...(store.logo ? { images: [{ url: store.logo, alt: storeName }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(store.logo ? { images: [store.logo] } : {}),
    },
    alternates: {
      canonical,
    },
    robots: { index: true, follow: true },
  };
}

export default async function CatalogPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await getPublicCatalog(slug);

  if ("error" in result) {
    notFound();
  }
  const { store, items } = result.data;

  // Generate JSON-LD for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    "name": store.name || "HanLaptop",
    "image": store.logo || "",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": store.address || "",
    },
    "telephone": store.phone || "",
    "url": `${process.env.NEXT_PUBLIC_APP_URL || ''}/catalog/${store.slug}`,
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Katalog Laptop",
      "itemListElement": items.map((item: any, index: number) => ({
        "@type": "OfferCatalog",
        "name": item.itemName,
        "itemListElement": [
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Product",
              "name": item.itemName,
              "image": item.imageUrl || "",
              "description": item.specs,
              "itemCondition": "https://schema.org/UsedCondition"
            },
            "price": item.sellingPrice,
            "priceCurrency": "IDR",
            "availability": item.quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
          }
        ]
      }))
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* CatalogClient uses useSearchParams; on this static/ISR route that
          forces client-side rendering up to the nearest Suspense boundary.
          The boundary keeps the server-rendered catalog HTML in the ISR
          payload instead of blanking the whole page. */}
      <Suspense fallback={null}>
        <CatalogClient initialData={result.data} slug={slug} />
      </Suspense>
    </>
  );
}
