// Service worker for the HanLaptop PWA.
//
// Replaces what vite-plugin-pwa (workbox) did for the old Vite app, kept as a
// hand-written static SW so it works regardless of the Next build bundler
// (webpack/turbopack) — no build plugin involved. Behaviour mirrors the Vite
// config: auto-update (skipWaiting + clientsClaim), outdated caches cleaned on
// activate, API responses are NEVER cached (live POS data), the app shell and
// static assets are cached so a previously-visited page still opens offline.
const CACHE = "hanlaptop-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API: always hit the network, never serve stale data. Matches the Vite
  // config's NetworkOnly rule for /api/*.
  if (url.pathname.startsWith("/api/")) return;

  // Page navigations: network-first so an online user always gets fresh HTML;
  // fall back to the cached page (or the root shell) when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  // Static assets (Next chunks, images, icons, fonts): serve from cache first
  // and refresh in the background.
  if (url.pathname.startsWith("/_next/") || /\.(png|jpg|jpeg|svg|ico|webmanifest|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
