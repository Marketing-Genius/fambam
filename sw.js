// Family Hub + Breakfast v3.3.0 SW
const CACHE = "family-hub-v0-6-9"; // bump
const ASSETS = [
  "./",
  "./index.html",
  "./breakfast.html",
  "./chores.html",
  "./dinner.html",
  "./calendar.html",
  "./family.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => (k===CACHE?null:caches.delete(k)))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  // Network-first with offline fallback
  e.respondWith(
    fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return r;
    }).catch(()=> caches.match(e.request).then(r=> r || caches.match("./index.html")))
  );
});
