// Dungeon Town service worker: caches the page and every sheet named in art/index.json, then serves cache first.
const CACHE = "dungeontown-r3-v1";
self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    const files = ["./", "index.html", "manifest.webmanifest", "icon.svg", "art/index.json"];
    try {
      const idx = await (await fetch("art/index.json")).json();
      for (const s of idx.sheets) files.push("art/" + s + ".png", "art/" + s + ".json");
    } catch (err) {}
    await c.addAll(files);
    self.skipWaiting();
  })());
});
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request).then((res) => {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(e.request, copy));
    return res;
  })));
});
