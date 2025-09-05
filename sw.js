// Simple offline-first service worker for GitHub Pages
const CACHE = "breakfast-v1";

// Derive the base path where this SW is hosted (works for / and /repo/)
const BASE = self.location.pathname.replace(/sw\.js$/, "");

const ASSETS = [
  BASE,
  BASE + "index.html",
  BASE + "manifest.webmanifest",
  BASE + "icon-192.png",
  BASE + "icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k === CACHE ? null : caches.delete(k)))).then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // App shell: cache-first
  const url = new URL(req.url);
  if (ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req))
    );
    return;
  }

  // Navigation requests: serve cached index.html (SPA-style) if offline
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match(BASE + "index.html"))
    );
    return;
  }

  // Everything else: network-first with cache fallback
  event.respondWith(
    fetch(req).then(resp => {
      const copy = resp.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return resp;
    }).catch(() => caches.match(req))
  );
});
