// Offline cache: the page is one file, so cache it and its two neighbours, and refresh them when online.
const C = "civilization-r2-fable-v1";
self.addEventListener("install", (e) => { e.waitUntil(caches.open(C).then((c) => c.addAll(["./", "manifest.webmanifest", "icon.svg"])).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== C).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request).then((hit) => {
    const net = fetch(e.request).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(C).then((c) => c.put(e.request, cp)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
