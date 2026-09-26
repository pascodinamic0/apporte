/* Apporte Service Worker */
const CACHE_STATIC = "apporte-static-v3";
const OFFLINE_URL = "/offline";
const CACHE_ASSETS = [OFFLINE_URL, "/manifest.webmanifest", "/logo/apporte-symbol.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_STATIC);
      // Fetch each asset individually so one failure doesn't skip the rest.
      await Promise.all(
        CACHE_ASSETS.map((u) =>
          fetch(u, { cache: "reload", credentials: "omit" })
            .then((r) => (r.ok ? cache.put(u, r) : undefined))
            .catch(() => undefined),
        ),
      );
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
          const cached = await caches.match(OFFLINE_URL);
          return cached || Response.error();
        }
      })(),
    );
    return;
  }
  // Stale-while-revalidate only for static hashed assets and known file extensions
  event.respondWith(
    (async () => {
      const isStatic =
        url.pathname.startsWith("/_next/static/") ||
        /\.(?:js|css|woff2?|png|jpg|jpeg|svg|ico|webp)$/.test(url.pathname);
      const isRsc = url.search.includes("_rsc") || (req.headers.get("accept") || "").includes("text/x-component");
      if (!isStatic || isRsc) {
        return fetch(req);
      }
      const cached = await caches.match(req);
      const fetchPromise = fetch(req)
        .then(async (resp) => {
          if (resp && resp.ok) {
            const copy = resp.clone();
            const cache = await caches.open(CACHE_STATIC);
            await cache.put(req, copy);
          }
          return resp;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })(),
  );
});

