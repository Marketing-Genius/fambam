const CACHE = "breakfast-v2";
const BASE = self.location.pathname.replace(/sw\.js$/, "");
const ASSETS = [BASE, BASE + "index.html", BASE + "manifest.webmanifest", BASE + "icon-192.png", BASE + "icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(()=>self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k===CACHE?null:caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (ASSETS.includes(url.pathname)) { e.respondWith(caches.match(req).then(r=>r||fetch(req))); return; }
  if (req.mode === "navigate") { e.respondWith(fetch(req).catch(()=>caches.match(BASE + "index.html"))); return; }
  e.respondWith(fetch(req).then(r=>{const copy=r.clone(); caches.open(CACHE).then(c=>c.put(req,copy)); return r;}).catch(()=>caches.match(req)));
});