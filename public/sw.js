/* Apporte Service Worker */
const CACHE_STATIC = "apporte-static-v2";
const CACHE_ASSETS = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_STATIC);
      try {
        await cache.addAll(CACHE_ASSETS);
      } catch {}
      // Activate immediately
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_STATIC).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Never cache API calls
  if (url.pathname.startsWith("/api/")) {
    return; // default network
  }
  // Network-first for navigations/HTML
  const accept = req.headers.get("accept") || "";
  const isDocument = req.mode === "navigate" || accept.includes("text/html");
  if (isDocument) {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req);
        } catch {
          const cached = await caches.match("/");
          return cached || Response.error();
        }
      })(),
    );
    return;
  }
  // Stale-while-revalidate for static assets
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      const fetchPromise = fetch(req)
        .then(async (resp) => {
          if (resp && resp.ok) {
            const copy = resp.clone();
            const cache = await caches.open(CACHE_STATIC);
            cache.put(req, copy);
          }
          return resp;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })(),
  );
});

