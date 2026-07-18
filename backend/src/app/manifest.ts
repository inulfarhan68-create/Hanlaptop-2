import type { MetadataRoute } from "next";

// Web app manifest — makes the app installable (add-to-home-screen, standalone
// display), mirroring the manifest the Vite app shipped via vite-plugin-pwa.
// Next serves this at /manifest.webmanifest and links it automatically.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HanLaptop Store",
    short_name: "HanLaptop",
    description: "Aplikasi Kasir dan Manajemen HanLaptop",
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: "#ffffff",
    background_color: "#ffffff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
